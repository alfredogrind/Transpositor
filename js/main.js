import * as ocr from './ocr.js';
import * as music from './music.js';
import * as ui from './ui.js';
import * as template from './template.js';
import API from './api.js';

let songData          = [];
let targetKey         = null;
let detectedKey       = null;
let lastTransposedData = null;
let notationMode      = 'classic';

document.addEventListener('DOMContentLoaded', () => {
    ui.initTheme();
    initTemplateModal();
    initAlertModal();
    initNotationToggle();
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
    showSavePanel(detectedKey?.root || '');
};

function showSavePanel(tonoOriginal) {
    const existing = document.getElementById('savePanel');
    if (existing) existing.remove();

    const panel = document.createElement('div');
    panel.id = 'savePanel';
    panel.className = 'save-panel';
    panel.innerHTML = `
        <p class="section-title" style="margin-bottom:1rem;">Guardar en Biblioteca</p>
        <div class="save-fields">
            <input id="saveNombre"    class="save-input" type="text"   placeholder="Nombre de la canción *" />
            <input id="saveCantautor" class="save-input" type="text"   placeholder="Cantautor *" />
            <input id="saveBpm"       class="save-input" type="number" placeholder="BPM" min="1" max="300" />
            <input id="saveEtiquetas" class="save-input" type="text"   placeholder="Etiquetas (separadas por coma)" />
            <input id="saveNotas"     class="save-input" type="text"   placeholder="Notas adicionales" />
        </div>
        <button id="btnGuardar" class="btn-action" style="margin-top:1rem;">Guardar canción</button>
        <p id="saveMsg" style="margin-top:0.5rem;font-size:0.85rem;text-align:center;"></p>
    `;

    document.getElementById('finalOutput').after(panel);

    document.getElementById('btnGuardar').onclick = async () => {
        const nombre    = document.getElementById('saveNombre').value.trim();
        const cantautor = document.getElementById('saveCantautor').value.trim();
        const msg       = document.getElementById('saveMsg');

        if (!nombre || !cantautor) {
            msg.style.color = 'var(--danger, #e55)';
            msg.textContent = 'Nombre y cantautor son obligatorios.';
            return;
        }

        try {
            document.getElementById('btnGuardar').disabled = true;
            await API.crear({
                nombre,
                cantautor,
                tonoOriginal: tonoOriginal,
                bpm: document.getElementById('saveBpm').value || null,
                etiquetas: document.getElementById('saveEtiquetas').value,
                notas: document.getElementById('saveNotas').value.trim()
            });
            msg.style.color = 'var(--accent, #4c8)';
            msg.textContent = '✅ Canción guardada en la biblioteca.';
            document.getElementById('btnGuardar').textContent = 'Guardado';
        } catch (err) {
            msg.style.color = 'var(--danger, #e55)';
            msg.textContent = `❌ ${err.message}`;
            document.getElementById('btnGuardar').disabled = false;
        }
    };
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