import * as ocr from './ocr.js';
import * as music from './music.js';
import * as ui from './ui.js';
import * as template from './template.js';

let songData = [];
let targetKey = null;

document.addEventListener('DOMContentLoaded', () => {
    ui.initTheme();
    initTemplateModal();
});

const btnProcess = document.getElementById('btnProcess');
const fileInput  = document.getElementById('fileInput');
const statusText = document.getElementById('statusText');
const loaderWrap = document.getElementById('loaderWrap');
const btnTranspose = document.getElementById('btnTranspose');

// ─── Modal de plantilla ────────────────────────────────────────────────────────

function initTemplateModal() {
    const modal    = document.getElementById('templateModal');
    const btnOpen  = document.getElementById('btnTemplate');
    const btnClose = document.getElementById('modalClose');
    if (!modal || !btnOpen) return;

    btnOpen.addEventListener('click', () => {
        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
    });

    const closeModal = () => {
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
    };

    btnClose?.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

    modal.querySelectorAll('.modal-option').forEach(btn => {
        btn.addEventListener('click', () => {
            template.downloadTemplate(btn.dataset.format);
            closeModal();
        });
    });
}

// ─── Selección de archivos ─────────────────────────────────────────────────────

fileInput.onchange = async () => {
    const files      = Array.from(fileInput.files);
    const mediaFiles = files.filter(f => !template.detectFormat(f.name));
    const tplFiles   = files.filter(f =>  template.detectFormat(f.name));
    const container  = document.getElementById('thumbnailContainer');

    if (container) {
        container.innerHTML = '';
        // Miniaturas para imágenes/PDFs
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
            const img = document.createElement('img');
            img.src = src;
            div.appendChild(img);
            container.appendChild(div);
        }
        // Indicador visual para archivos de plantilla
        for (const file of tplFiles) {
            const div = document.createElement('div');
            div.className = 'thumb-item thumb-item--template';
            div.innerHTML = `<span class="thumb-tpl-label">${template.detectFormat(file.name).toUpperCase()}</span>`;
            container.appendChild(div);
        }
    }

    // Habilitar botón para cualquier archivo — el procesamiento ocurre al hacer clic
    btnProcess.disabled = files.length === 0;
};

btnProcess.onclick = async () => {
    try {
        loaderWrap.style.display = 'flex';
        songData = [];
        document.getElementById('detectionResults').innerHTML = "";
        document.getElementById('finalOutput').style.display = 'none';

        const files      = Array.from(fileInput.files);
        const mediaFiles = files.filter(f => !template.detectFormat(f.name));
        const tplFiles   = files.filter(f =>  template.detectFormat(f.name));

        // Parsear plantillas de texto
        for (const file of tplFiles) {
            statusText.textContent = `Importando: ${file.name}`;
            const fmt    = template.detectFormat(file.name);
            const text   = await file.text();
            const parsed = template.parseTemplate(text, fmt, music.extractChordsWithRepetition);
            songData.push(...parsed);
        }

        // OCR para imágenes/PDFs
        for (const file of mediaFiles) {
            statusText.textContent = `Preparando: ${file.name}`;
            const sources = (file.type === "application/pdf")
                ? await ocr.pdfToImages(file)
                : [await toBase64(file)];
            for (const src of sources) {
                const text = await ocr.runOCR(src);
                processTextToSongData(text);
            }
        }

        refreshUI();
    } catch (error) {
        console.error("Error:", error);
    } finally {
        loaderWrap.style.display = 'none';
    }
};

function processTextToSongData(text) {
    const lines = text.split('\n');
    lines.forEach(line => {
        let cleanLine = line.trim();
        if (!cleanLine) return;
        if (cleanLine.startsWith('#')) cleanLine = cleanLine.substring(1).trim();

        const upperLine = cleanLine.toUpperCase();
        const foundSection = music.SECTION_KEYWORDS.find(k => upperLine.includes(k));
        
        if (foundSection) {
            songData.push({ section: upperLine, chords: [] });
        } else {
            const chords = music.extractChordsWithRepetition(cleanLine);
            if (chords.length > 0) {
                if (songData.length === 0) songData.push({ section: "INICIO", chords: [] });
                songData[songData.length - 1].chords.push(...chords);
            }
        }
    });
}

function refreshUI() {
    // Omitir secciones sin acordes
    songData = songData.filter(s => s.chords.length > 0);

    const allChords = songData.flatMap(section => section.chords);
    const keyInfo = music.detectSongKey(allChords);
    ui.renderDetectedKey(document.getElementById('keyFloatingBadge'), keyInfo);

    ui.renderResults(document.getElementById('detectionResults'), songData, 
        (idx, title) => { songData[idx].section = title; },
        (idx) => { songData.splice(idx, 1); refreshUI(); }
    );
    ui.renderToneGrid(document.getElementById('gridTones'), (note) => {
        targetKey = note;
    });
    document.getElementById('toneSelector').style.display = 'block';
    document.getElementById('editHint')?.style && (document.getElementById('editHint').style.display = 'block');
}

btnTranspose.onclick = () => {
    if (!targetKey) return alert("Selecciona un tono.");
    if (!songData.length || !songData[0].chords.length) return alert("No hay acordes.");

    const firstChord = songData[0].chords[0];
    const originalKeyRoot = Tonal.Chord.get(firstChord).tonic || firstChord.match(/^[A-G][#b]?/)[0];

    const distFn = (Tonal.Note && Tonal.Note.distance) ? Tonal.Note.distance : Tonal.distance;
    const interval = distFn(originalKeyRoot, targetKey);
    const container = document.getElementById('outputContainer');
    const preferFlats = ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb'].includes(targetKey);
    const transposedData = songData.map(item => ({
        section: item.section,
        chords: item.chords.map(chord => music.smartTransposeChord(chord, interval, preferFlats))
    }));
    ui.renderFinalResults(container, transposedData);

    document.getElementById('finalOutput').style.display = 'block';
    window.scrollTo({ top: document.getElementById('finalOutput').offsetTop - 50, behavior: 'smooth' });
};

const toBase64 = file => new Promise(res => {
    const r = new FileReader(); r.onload = e => res(e.target.result); r.readAsDataURL(file);
});