import * as ocr from './ocr.js';
import * as music from './music.js';
import * as ui from './ui.js';

let songData = []; 
let targetKey = null;

/**
 * LOGICA DE MODO OSCURO/CLARO
 * Inicialización inmediata del tema al cargar el script
 */
function startTheme() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => ui.initTheme());
    } else {
        ui.initTheme();
    }
}
startTheme();

const btnProcess = document.getElementById('btnProcess');
const fileInput = document.getElementById('fileInput');
const statusText = document.getElementById('statusText');
const loaderWrap = document.getElementById('loaderWrap');
const btnTranspose = document.getElementById('btnTranspose');

fileInput.onchange = () => { btnProcess.disabled = false; };

btnProcess.onclick = async () => {
    try {
        loaderWrap.style.display = 'flex';
        songData = []; 
        document.getElementById('detectionResults').innerHTML = "";
        document.getElementById('finalOutput').style.display = 'none';
        
        const files = Array.from(fileInput.files);
        for (let file of files) {
            statusText.textContent = `Preparando: ${file.name}`;
            let sources = (file.type === "application/pdf") ? await ocr.pdfToImages(file) : [await toBase64(file)];
            for (let src of sources) {
                const text = await ocr.runOCR(src);
                processTextToSongData(text);
            }
        }
        refreshUI();
    } catch (error) {
        console.error("Error en escaneo:", error);
    } finally {
        loaderWrap.style.display = 'none';
    }
};

function processTextToSongData(text) {
    const lines = text.split('\n');
    lines.forEach(line => {
        let cleanLine = line.trim();
        if (!cleanLine) return;

        if (cleanLine.startsWith('#')) {
            cleanLine = cleanLine.substring(1).trim();
        }

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
    ui.renderResults(document.getElementById('detectionResults'), songData, 
        (idx, title) => { songData[idx].section = title; },
        (idx) => { songData.splice(idx, 1); refreshUI(); }
    );
    ui.renderToneGrid(document.getElementById('gridTones'), (note) => {
        targetKey = note;
    });
    document.getElementById('toneSelector').style.display = 'block';
    document.getElementById('editHint').style.display = 'block';
}

btnTranspose.onclick = () => {
    if (!targetKey) return alert("Selecciona un tono de destino.");
    if (!songData.length || !songData[0].chords.length) return alert("No hay acordes.");

    const firstChord = songData[0].chords[0];
    const chordInfo = Tonal.Chord ? Tonal.Chord.get(firstChord) : Tonal.chord(firstChord);
    const originalKeyRoot = chordInfo.tonic || firstChord.match(/^[A-G][#b]?/)[0];

    let interval = "1P"; 
    try {
        if (Tonal.Note && Tonal.Note.distance) {
            interval = Tonal.Note.distance(originalKeyRoot, targetKey);
        } else if (Tonal.distance) {
            interval = Tonal.distance(originalKeyRoot, targetKey);
        } else if (Tonal.interval) {
            interval = Tonal.interval(originalKeyRoot, targetKey);
        }
    } catch (e) { console.error(e); }

    const preferFlats = ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb'].includes(targetKey);
    const container = document.getElementById('outputContainer');
    container.innerHTML = "";
    
    songData.forEach(item => {
        const transposedChords = item.chords.map(chord => music.smartTransposeChord(chord, interval, preferFlats));
        
        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'output-section';
        // CAMBIO: Se usa var(--text) en lugar de #fff para que cambie según el modo
        sectionDiv.innerHTML = `
            <div class="section-title" style="color: var(--accent2); border:none;">${item.section}</div>
            <div class="chord-grid" style="margin-top:0.5rem">
                ${transposedChords.map(c => `<span class="chord-pill" style="border-color: var(--accent2); color: var(--text);">${c}</span>`).join('')}
            </div>
        `;
        container.appendChild(sectionDiv);
    });

    document.getElementById('finalOutput').style.display = 'block';
    window.scrollTo({ top: document.getElementById('finalOutput').offsetTop, behavior: 'smooth' });
};

const toBase64 = file => new Promise(res => {
    const r = new FileReader(); r.onload = e => res(e.target.result); r.readAsDataURL(file);
});