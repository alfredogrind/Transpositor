import * as ocr from './ocr.js';
import * as music from './music.js';
import * as ui from './ui.js';
import * as template from './template.js';
import API from './api.js';
import { toggleLibrary } from './library.js';

let songData          = [];
let targetKey         = null;
let detectedKey       = null;
let lastTransposedData = null;
let notationMode      = 'classic';

document.addEventListener('DOMContentLoaded', async () => {
    ui.initTheme();
    initTemplateModal();
    initAlertModal();
    initSavePanelDrawer();
    initNotationToggle();
    ui.initSFM(toggleLibrary, scrollToOrShowSavePanel);
    ui.updateSFMSaveState(false);
    await loadPendingSong();
});

const btnProcess = document.getElementById('btnProcess');
const fileInput  = document.getElementById('fileInput');
const statusText = document.getElementById('statusText');
const loaderWrap = document.getElementById('loaderWrap');
const btnTranspose = document.getElementById('btnTranspose');

// --- Selección de archivos (Mantenida Original con PDF/Miniaturas) ---
fileInput.onchange = async () => {
    const files      = Array.from(fileInput.files);
    const mediaFiles = files.filter(f => !template.detectFormat(f.name));
    const tplFiles   = files.filter(f =>  template.detectFormat(f.name));
    const container  = document.getElementById('thumbnailContainer');

    if (container) {
        container.innerHTML = '';
        for (const file of mediaFiles) {
            let src;
            if (file.type === 'application/pdf') {
                const ab  = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument(ab).promise;
                const page = await pdf.getPage(1);
                const vp  = page.getViewport({ scale: 0.5 });
                const canvas = document.createElement('canvas');
                canvas.width = vp.width; canvas.height = vp.height;
                await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
                src = canvas.toDataURL('image/jpeg', 0.7);
            } else {
                src = URL.createObjectURL(file);
            }
            const div = document.createElement('div');
            div.className = 'thumb-item';
            div.innerHTML = `<img src="${src}">`;
            container.appendChild(div);
        }
        for (const file of tplFiles) {
            const div = document.createElement('div');
            div.className = 'thumb-item thumb-item--template';
            div.innerHTML = `<span class="thumb-tpl-label">${template.detectFormat(file.name).toUpperCase()}</span>`;
            container.appendChild(div);
        }
    }
    btnProcess.disabled = files.length === 0;
};

// --- Procesamiento de Escaneo (Integrado con Animación) ---
btnProcess.onclick = async () => {
    try {
        ui.showScanner(loaderWrap, statusText, "Escaneando canción...");
        songData = [];
        lastTransposedData = null;
        ui.updateSFMSaveState(false);
        document.getElementById('detectionResults').innerHTML = "";
        document.getElementById('finalOutput').style.display = 'none';

        const files = Array.from(fileInput.files);
        for (const file of files) {
            const fmt = template.detectFormat(file.name);
            if (fmt) {
                const text = await file.text();
                songData.push(...template.parseTemplate(text, fmt, music.extractChordsWithRepetition));
            } else {
                const sources = (file.type === "application/pdf") ? await ocr.pdfToImages(file) : [await toBase64(file)];
                for (const src of sources) {
                    const text = await ocr.runOCR(src);
                    processTextToSongData(text);
                }
            }
        }
        refreshUI();
    } catch (error) { console.error("Error:", error); }
    finally { loaderWrap.style.display = 'none'; }
};

function processTextToSongData(text) {
    text.split('\n').forEach(line => {
        let clean = line.trim();
        if (!clean) return;
        const upperLine = clean.toUpperCase();
        const found = music.SECTION_KEYWORDS.find(k => upperLine.includes(k));
        if (found) songData.push({ section: upperLine, chords: [] });
        else {
            const chords = music.extractChordsWithRepetition(clean);
            if (chords.length > 0) {
                if (songData.length === 0) songData.push({ section: "INICIO", chords: [] });
                songData[songData.length - 1].chords.push(...chords);
            }
        }
    });
}

function getLabelFn(referenceRoot) {
    if (notationMode === 'degrees' && referenceRoot) {
        return c => music.convertChordToDegree(c, referenceRoot);
    }
    return c => c;
}

function refreshUI() {
    songData    = songData.filter(s => s.chords.length > 0);
    const chords = songData.flatMap(s => s.chords);
    detectedKey  = music.detectSongKey(chords);
    ui.renderDetectedKey(document.getElementById('keyFloatingBadge'), detectedKey);

    ui.renderResults(
        document.getElementById('detectionResults'),
        songData,
        (idx, title) => { songData[idx].section = title; },
        (newOrder) => { songData = newOrder.map(i => songData[i]); },
        getLabelFn(detectedKey?.root)
    );

    ui.renderToneGrid(document.getElementById('gridTones'), detectedKey?.quality, (note) => { targetKey = note; });
    document.getElementById('toneSelector').style.display = 'block';
}

btnTranspose.onclick = () => {
    if (!songData.length) return showAlert('Primero carga y escanea una partitura.');
    if (!targetKey) return showAlert('Selecciona un tono de destino.');

    // targetKey puede ser "Dm", "F#m"… — extraer solo la raíz para cálculos de intervalo
    const targetRoot = targetKey.replace(/m$/, '');

    const first  = songData[0].chords[0];
    const source = Tonal.Chord.get(first).tonic || first.match(/^[A-G][#b]?/)[0];
    const interval = Tonal.distance(source, targetRoot);

    // Claves que usan bemoles (mayor + relativas menores)
    const preferFlats = [
        'F','Bb','Eb','Ab','Db','Gb',       // mayores con bemoles
        'Dm','Gm','Cm','Fm','Bbm','Ebm',    // menores relativas
    ].includes(targetKey);

    lastTransposedData = songData.map(item => ({
        section: item.section,
        chords:  item.chords.map(c => music.smartTransposeChord(c, interval, preferFlats)),
    }));

    ui.renderFinalResults(
        document.getElementById('outputContainer'),
        lastTransposedData,
        getLabelFn(targetRoot),   // grados relativos a la raíz (sin sufijo)
    );
    document.getElementById('finalOutput').style.display = 'block';
    closeSavePanel();
    ui.updateSFMSaveState(true);
};

function scrollToOrShowSavePanel() {
    if (!lastTransposedData) return;
    showSavePanel(detectedKey?.root || '');
}

function closeSavePanel() {
    ui.closeOverlay(
        document.getElementById('savePanelOverlay'),
        document.getElementById('savePanelDrawer')
    );
}

function showSavePanel(tonoOriginal) {
    const overlay = document.getElementById('savePanelOverlay');
    if (!overlay) return;

    // Reset fields and state
    ['saveNombre', 'saveCantautor', 'saveBpm', 'saveEtiquetas', 'saveNotas'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const msg = document.getElementById('saveMsg');
    const btn = document.getElementById('btnGuardar');
    if (msg) msg.textContent = '';
    if (btn) { btn.disabled = false; btn.textContent = 'Guardar canción'; }

    overlay.dataset.tonoOriginal = tonoOriginal;
    overlay.setAttribute('aria-hidden', 'false');
    overlay.classList.add('open');
    document.getElementById('saveNombre')?.focus();
}

function initSavePanelDrawer() {
    const overlay = document.getElementById('savePanelOverlay');
    if (!overlay) return;

    document.getElementById('savePanelClose')?.addEventListener('click', closeSavePanel);

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeSavePanel();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeSavePanel();
    });

    document.getElementById('btnGuardar')?.addEventListener('click', async () => {
        const nombre    = document.getElementById('saveNombre').value.trim();
        const cantautor = document.getElementById('saveCantautor').value.trim();
        const msg       = document.getElementById('saveMsg');
        const btn       = document.getElementById('btnGuardar');

        if (!nombre || !cantautor) {
            msg.style.color = 'var(--danger, #e55)';
            msg.textContent = 'Nombre y cantautor son obligatorios.';
            return;
        }

        try {
            btn.disabled = true;
            await API.crear({
                nombre,
                cantautor,
                tonoOriginal: overlay.dataset.tonoOriginal || '',
                bpm: document.getElementById('saveBpm').value || null,
                etiquetas: document.getElementById('saveEtiquetas').value,
                notas: document.getElementById('saveNotas').value.trim(),
                letrasAcordes: JSON.stringify(songData),
            });
            msg.style.color = 'var(--accent)';
            msg.textContent = '✅ Canción guardada en la biblioteca.';
            btn.textContent = 'Guardado';
        } catch (err) {
            msg.style.color = 'var(--danger, #e55)';
            msg.textContent = `❌ ${err.message}`;
            btn.disabled = false;
        }
    });
}

const toBase64 = file => new Promise(res => {
    const r = new FileReader(); r.onload = e => res(e.target.result); r.readAsDataURL(file);
});

function showAlert(msg) {
    const modal = document.getElementById('alertModal');
    document.getElementById('alertModalText').textContent = msg;
    modal.setAttribute('aria-hidden', 'false');
    modal.classList.add('open');
}

function initAlertModal() {
    const modal = document.getElementById('alertModal');
    if (!modal) return;
    document.getElementById('closeAlertBtn').onclick = () => {
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
    };
    modal.addEventListener('click', e => {
        if (e.target === modal) {
            modal.classList.remove('open');
            modal.setAttribute('aria-hidden', 'true');
        }
    });
}

function initNotationToggle() {
    const pills = document.querySelectorAll('.notation-pill');
    pills.forEach(pill => {
        pill.addEventListener('click', () => {
            notationMode = pill.dataset.mode;
            pills.forEach(p => p.classList.toggle('active', p.dataset.mode === notationMode));

            if (songData.length) {
                ui.renderResults(
                    document.getElementById('detectionResults'),
                    songData,
                    (idx, title) => { songData[idx].section = title; },
                    (newOrder) => { songData = newOrder.map(i => songData[i]); },
                    getLabelFn(detectedKey?.root)
                );
            }
            if (lastTransposedData) {
                ui.renderFinalResults(document.getElementById('outputContainer'), lastTransposedData, getLabelFn(targetKey?.replace(/m$/, '')));
            }
        });
    });
}

async function loadPendingSong() {
    const id = localStorage.getItem('pendingSongId');
    if (!id) return;
    localStorage.removeItem('pendingSongId');

    try {
        const cancion = await API.obtenerCancion(parseInt(id));

        lastTransposedData = null;
        ui.updateSFMSaveState(false);
        document.getElementById('finalOutput').style.display = 'none';
        document.getElementById('detectionResults').innerHTML = '';

        if (cancion.letra_acordes) {
            try { songData = JSON.parse(cancion.letra_acordes); }
            catch { songData = []; }
        } else {
            songData = [];
        }

        if (songData.length) {
            refreshUI();
            showToast(`♪ ${cancion.nombre} — ${cancion.cantautor}`);
        } else {
            showToast(`${cancion.nombre} cargada (sin acordes guardados)`, true);
        }
    } catch (err) {
        console.error('Error al cargar canción desde biblioteca:', err);
    }
}

function showToast(msg, warn = false) {
    const t = document.createElement('div');
    t.className = 'lib-toast' + (warn ? ' lib-toast--warn' : '');
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('show')));
    setTimeout(() => {
        t.classList.remove('show');
        setTimeout(() => t.remove(), 400);
    }, 3800);
}

function initTemplateModal() {
    const modal = document.getElementById('templateModal');
    const btnOpen = document.getElementById('btnTemplate');
    const btnClose = document.getElementById('modalClose');
    if (!modal || !btnOpen) return;
    btnOpen.onclick = () => modal.classList.add('open');
    btnClose.onclick = () => modal.classList.remove('open');
    modal.querySelectorAll('.modal-option').forEach(btn => {
        btn.onclick = () => { template.downloadTemplate(btn.dataset.format); modal.classList.remove('open'); };
    });
}