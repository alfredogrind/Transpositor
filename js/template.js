const DEFAULT_SECTIONS = ['-INTRO', '-ESTROFA', '-PRE-CORO', '-CORO', '-ESTROFA 2', '-PUENTE', '-OUTRO'];

// ─── Generadores ───────────────────────────────────────────────────────────────

export function generateTxt() {
    return DEFAULT_SECTIONS.map(s => `${s}\n\n`).join('\n');
}

export function generateCsv() {
    const rows = DEFAULT_SECTIONS.map(s => `${s},`);
    return ['seccion,acordes', ...rows].join('\n');
}

export function generateJson() {
    const obj = {};
    DEFAULT_SECTIONS.forEach(s => { obj[s] = ''; });
    return JSON.stringify(obj, null, 2);
}

// ─── Descarga ──────────────────────────────────────────────────────────────────

function downloadFile(content, filename, mime) {
    const blob = new Blob([content], { type: mime });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
}

export function downloadTemplate(format) {
    if (format === 'txt')  downloadFile(generateTxt(),  'plantilla_cancion.txt',  'text/plain');
    if (format === 'csv')  downloadFile(generateCsv(),  'plantilla_cancion.csv',  'text/csv');
    if (format === 'json') downloadFile(generateJson(), 'plantilla_cancion.json', 'application/json');
}

// ─── Parser agnóstico ─────────────────────────────────────────────────────────
// Convierte txt/csv/json relleno → [{ section: "INTRO", chords: ["C","G"] }]
// El mismo formato que produce processTextToSongData en main.js

export function parseTemplate(text, format, extractChordsFn) {
    const sections = [];

    if (format === 'json') {
        try {
            const obj = JSON.parse(text);
            for (const [key, value] of Object.entries(obj)) {
                if (!key.startsWith('-')) continue;
                const name   = key.slice(1).trim().toUpperCase();
                const chords = value ? extractChordsFn(String(value)) : [];
                if (name) sections.push({ section: name, chords });
            }
        } catch (e) { console.error('JSON parse error:', e); }

    } else if (format === 'csv') {
        const lines = text.split('\n');
        const start = lines[0]?.toLowerCase().startsWith('sec') ? 1 : 0;
        for (let i = start; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            const sep   = line.indexOf(',');
            const key   = sep >= 0 ? line.slice(0, sep).trim() : line.trim();
            const value = sep >= 0 ? line.slice(sep + 1).trim() : '';
            if (!key.startsWith('-')) continue;
            const name   = key.slice(1).trim().toUpperCase();
            const chords = value ? extractChordsFn(value) : [];
            if (name) sections.push({ section: name, chords });
        }

    } else { // txt
        let current = null;
        for (const raw of text.split('\n')) {
            const line = raw.trim();
            if (!line) continue;
            if (line.startsWith('-')) {
                const name = line.slice(1).trim().toUpperCase();
                current = { section: name, chords: [] };
                sections.push(current);
            } else if (current) {
                current.chords.push(...extractChordsFn(line));
            }
        }
    }

    return sections.filter(s => s.section);
}

// ─── Utilidades ───────────────────────────────────────────────────────────────

export function detectFormat(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    return ['txt', 'csv', 'json'].includes(ext) ? ext : null;
}
