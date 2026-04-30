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
let tagEditor         = null;

document.addEventListener('DOMContentLoaded', async () => {
    ui.initTheme();
    initTemplateModal();
    initAlertModal();
    initSavePanelDrawer();
    initNotationToggle();
    initSetlistPopup();
    ui.initSFM(toggleLibrary, scrollToOrShowSavePanel, openSetlistPopup);
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
    ui.renderResults(
        document.getElementById('detectionResults'),
        songData,
        (idx, title) => { songData[idx].section = title; },
        (newOrder) => { songData = newOrder.map(i => songData[i]); },
        getLabelFn(detectedKey?.root)
    );

    ui.renderToneGrid(document.getElementById('gridTones'), detectedKey?.quality, (note) => { targetKey = note; });
    document.getElementById('toneSelector').style.display = 'block';
    ui.updateSFMSaveState(true);
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
    if (!songData.length) return;
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

    ['saveNombre', 'saveCantautor', 'saveBpm', 'saveNotas'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    tagEditor?.reset();

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

    tagEditor = ui.createTagEditor(
        document.getElementById('spTagChips'),
        document.getElementById('spTagInput'),
        document.getElementById('saveEtiquetas')
    );

    document.getElementById('saveBpm')?.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 3);
    });

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

async function loadSongById(id) {
    try {
        const cancion = await API.obtenerCancion(parseInt(id));

        lastTransposedData = null;
        targetKey = null;
        ui.updateSFMSaveState(false);
        document.getElementById('finalOutput').style.display = 'none';
        document.getElementById('detectionResults').innerHTML = '';
        document.getElementById('toneSelector').style.display = 'none';

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

        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
        console.error('Error al cargar canción:', err);
    }
}

async function loadPendingSong() {
    const id = localStorage.getItem('pendingSongId');
    if (!id) return;
    localStorage.removeItem('pendingSongId');
    await loadSongById(id);
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

// ── Setlist Popup ─────────────────────────────────────────────────
function initSetlistPopup() {
    const overlay = document.getElementById('setlistPopupOverlay');
    const btnClose = document.getElementById('setlistPopupClose');
    const btnBack  = document.getElementById('setlistPopupBack');
    if (!overlay) return;

    btnClose.addEventListener('click', closeSetlistPopup);
    btnBack.addEventListener('click', showSetlistList);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeSetlistPopup(); });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && overlay.classList.contains('open')) closeSetlistPopup();
    });
}

function closeSetlistPopup() {
    const overlay = document.getElementById('setlistPopupOverlay');
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
}

async function openSetlistPopup() {
    const overlay = document.getElementById('setlistPopupOverlay');
    overlay.setAttribute('aria-hidden', 'false');
    overlay.classList.add('open');
    await showSetlistList();
}

async function showSetlistList() {
    const content  = document.getElementById('setlistPopupContent');
    const title    = document.getElementById('setlistPopupTitle');
    const btnBack  = document.getElementById('setlistPopupBack');
    title.textContent = 'Setlists';
    btnBack.style.visibility = 'hidden';
    content.innerHTML = '<p class="sl-empty">Cargando…</p>';

    try {
        const setlists = await API.obtenerSetlists();
        if (!setlists.length) {
            content.innerHTML = '<p class="sl-empty">No hay setlists creados.<br>Créalos desde la Biblioteca.</p>';
            return;
        }
        content.innerHTML = setlists.map((sl, i) => `
            <button class="sl-pick-card" data-id="${sl.id}"
                    style="animation-delay:${i * 55}ms">
                <span class="sl-pick-dot" style="background:${escHtml(sl.color || '#667eea')}"></span>
                <span class="sl-pick-name">${escHtml(sl.nombre)}</span>
                <span class="sl-pick-count">${sl.total_canciones || 0} canciones</span>
            </button>`).join('');

        content.querySelectorAll('.sl-pick-card').forEach(card => {
            card.addEventListener('click', () => showSetlistSongs(parseInt(card.dataset.id), setlists));
        });
    } catch {
        content.innerHTML = '<p class="sl-empty">Error al cargar los setlists.</p>';
    }
}

async function showSetlistSongs(id, setlists) {
    const content  = document.getElementById('setlistPopupContent');
    const title    = document.getElementById('setlistPopupTitle');
    const btnBack  = document.getElementById('setlistPopupBack');
    const sl       = setlists.find(s => s.id === id);
    title.textContent = sl?.nombre || 'Setlist';
    btnBack.style.visibility = 'visible';
    content.innerHTML = '<p class="sl-empty">Cargando…</p>';

    try {
        const data  = await API.obtenerSetlist(id);
        const songs = data.canciones || [];
        if (!songs.length) {
            content.innerHTML = '<p class="sl-empty">Este setlist está vacío.</p>';
            return;
        }
        content.innerHTML = `<div style="padding:0 0.2rem">${songs.map((c, i) => `
            <button class="sl-song-row" data-id="${c.id}" style="animation-delay:${i * 45}ms"
                    title="Abrir en el transpositor">
                <span class="sl-song-pos">${i + 1}</span>
                <div class="sl-song-info">
                    <p class="sl-song-name">${escHtml(c.nombre)}</p>
                    <p class="sl-song-artist">${escHtml(c.cantautor)}</p>
                </div>
                ${c.tono_original ? `<span class="sl-song-badge">${escHtml(c.tono_original)}</span>` : ''}
                <span class="sl-song-open-icon">›</span>
            </button>`).join('')}</div>`;

        content.querySelectorAll('.sl-song-row').forEach(row => {
            row.addEventListener('click', async () => {
                closeSetlistPopup();
                await loadSongById(parseInt(row.dataset.id));
            });
        });
    } catch {
        content.innerHTML = '<p class="sl-empty">Error al cargar las canciones.</p>';
    }
}

function escHtml(t) {
    const d = document.createElement('div');
    d.textContent = t ?? '';
    return d.innerHTML;
}