// Parser para acordes.lacuerda.net
// Extrae secciones y acordes del HTML de una página de LaCuerda.

import { SECTION_ALIASES, normalizeSection } from './music.js';

const SECTION_RE = /^(intro|estrofa|verso|verse|pre[\s-]?coro|pre[\s-]?chorus|pre[\s-]?estribillo|coro|chorus|refrain|puente|bridge|intermedio|final|outro|solo|instrumental|coda|interludio|interlude)(\s+\d{1,3})?$/i;

function _isSection(text) {
    if (!text || text.length > 60) return false;
    // Strip surrounding punctuation, brackets, dashes
    const clean = text.replace(/^[\s([{*#\-]+|[\s)\]}*#.:;\-]+$/g, '').trim();
    return Object.hasOwn(SECTION_ALIASES, clean.toLowerCase()) || SECTION_RE.test(clean);
}

// Detecta si una línea de acordes empieza con un nombre de sección inline
// (ej. "INTERMEDIO: // G/B - C9") y retorna el nombre crudo o null.
function _sectionAtLineStart(text) {
    const m = text.match(/^([A-Za-záéíóúñÁÉÍÓÚÑ][A-Za-záéíóúñÁÉÍÓÚÑ\s\-]*?\d*)\s*:/i);
    if (!m) return null;
    const candidate = m[1].trim();
    return _isSection(candidate) ? candidate : null;
}

/**
 * Parsea el HTML de una página de LaCuerda.net y retorna el mismo formato
 * de songData que usa el resto del proyecto:
 *   [{ section: "INTRO", chords: ["C", "G", "Am", "F"] }, ...]
 *
 * También retorna `meta` con nombre, cantautor, bpm y tono si los encuentra.
 */
export function parseLaCuerda(htmlString) {
    const doc = new DOMParser().parseFromString(htmlString, 'text/html');

    const pre = doc.querySelector('#t_body PRE') ?? doc.querySelector('#t_body pre');
    if (!pre) throw new Error('No se encontró contenido musical en esta página. Verifica que sea una URL de acordes.lacuerda.net.');

    const songData = [];
    let current = null;

    for (const rawLine of pre.innerHTML.split('\n')) {
        const temp = document.createElement('div');
        temp.innerHTML = rawLine;

        const plainText = temp.textContent.trim();
        if (!plainText) continue;

        const anchors = temp.querySelectorAll('a');

        if (anchors.length > 0) {
            // Detectar sección inline al inicio de la línea (ej. "INTERMEDIO: // G/B - C9")
            const inlineSection = _sectionAtLineStart(plainText);
            if (inlineSection) {
                current = { section: normalizeSection(inlineSection), chords: [] };
                songData.push(current);
            }

            // Línea de acordes: extraer texto de cada <A>
            const chords = Array.from(anchors)
                .map(a => a.textContent.trim())
                .filter(c => /^[A-G]/.test(c));

            if (chords.length > 0) {
                if (!current) {
                    current = { section: 'INICIO', chords: [] };
                    songData.push(current);
                }
                current.chords.push(...chords);
            }
        } else if (_isSection(plainText)) {
            current = { section: normalizeSection(plainText), chords: [] };
            songData.push(current);
        }
        // Líneas de letra sin <A>: ignorar
    }

    return { songData, meta: _extractMeta(doc) };
}

function _extractMeta(doc) {
    const meta = {};

    const h1 = doc.querySelector('h1');
    const h2 = doc.querySelector('h2');
    if (h1?.textContent) meta.nombre    = h1.textContent.trim();
    if (h2?.textContent) meta.cantautor = h2.textContent.trim();

    // Fallback desde el título de la página: "Artista - Cancion | LaCuerda.net"
    if (!meta.nombre) {
        const parts = doc.title.split(/\s*[-|]\s*/);
        if (parts.length >= 2) {
            meta.cantautor = parts[0].trim();
            meta.nombre    = parts[1].trim();
        }
    }

    // Buscar BPM y tono en scripts inline (LaCuerda usa @ para # en metadata JS)
    for (const script of doc.querySelectorAll('script')) {
        const src = script.textContent;
        const bpmMatch = src.match(/\bbpm\s*[=:]\s*(\d+)/i);
        const keyMatch = src.match(/\btono\s*[=:'"]([A-G][@#b]?m?)/i);
        if (bpmMatch && !meta.bpm)  meta.bpm  = parseInt(bpmMatch[1]);
        if (keyMatch && !meta.tono) meta.tono = keyMatch[1].replace('@', '#');
    }

    return meta;
}
