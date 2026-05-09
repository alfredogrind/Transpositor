// Parser para cifraclub.com / cifraclub.com.br
// Extrae secciones y acordes del HTML de una página de CifraClub.

import { SECTION_ALIASES, normalizeSection } from './music.js';

const SECTION_RE = /^(intro|estrofa|verso|verse|pre[\s-]?coro|pre[\s-]?chorus|pre[\s-]?estribillo|coro|chorus|refrain|puente|bridge|intermedio|final|outro|solo|instrumental|coda|interludio|interlude|refrão|estrofe)(\s+\d{1,3})?$/i;

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
 * Parsea el HTML de una página de CifraClub y retorna el mismo formato
 * de songData que usa el resto del proyecto:
 *   [{ section: "INTRO", chords: ["C", "G", "Am", "F"] }, ...]
 *
 * También retorna `meta` con nombre, cantautor y tono si los encuentra.
 */
export function parseCifraClub(htmlString) {
    const doc = new DOMParser().parseFromString(htmlString, 'text/html');

    const pre = doc.querySelector('.cifra_cnt pre') ?? doc.querySelector('pre');
    if (!pre) throw new Error('No se encontró contenido musical en esta página. Verifica que sea una URL de cifraclub.com.');

    const songData = [];
    let current = null;

    for (const rawLine of pre.innerHTML.split('\n')) {
        const temp = document.createElement('div');
        temp.innerHTML = rawLine;

        const plainText = temp.textContent.trim();
        if (!plainText) continue;

        const bolds = temp.querySelectorAll('b');

        if (bolds.length > 0) {
            // Detectar sección inline al inicio de la línea (ej. "INTERMEDIO: // G/B - C9")
            const inlineSection = _sectionAtLineStart(plainText);
            if (inlineSection) {
                current = { section: normalizeSection(inlineSection), chords: [] };
                songData.push(current);
            }

            // Línea de acordes: extraer texto de cada <b>
            const chords = Array.from(bolds)
                .map(b => b.textContent.trim())
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
        // Líneas de letra sin <b>: ignorar
    }

    return { songData, meta: _extractMeta(doc) };
}

function _extractMeta(doc) {
    const meta = {};

    const h1 = doc.querySelector('h1');
    const h2 = doc.querySelector('h2');
    if (h1?.textContent) meta.nombre    = h1.textContent.trim();
    if (h2?.textContent) meta.cantautor = h2.textContent.trim();

    // Fallback desde el título: "Artista - Cancion | CifraClub"
    if (!meta.nombre) {
        const parts = doc.title.split(/\s*[-|]\s*/);
        if (parts.length >= 2) {
            meta.cantautor = parts[0].trim();
            meta.nombre    = parts[1].trim();
        }
    }

    // Extraer metadata del bloque window._ccq.push(['song/page', ..., { ... }])
    for (const script of doc.querySelectorAll('script')) {
        const src = script.textContent;
        if (!src.includes('_ccq') || !src.includes('song/page')) continue;

        const nameMatch   = src.match(/\bname\s*:\s*['"]([^'"]+)['"]/);
        const artistMatch = src.match(/\bartist\s*:\s*['"]([^'"]+)['"]/);
        const keyMatch    = src.match(/\bkey\s*:\s*['"]([A-G][#b]?m?)['"]/);
        const capoMatch   = src.match(/\bcapo\s*:\s*(\d+)/);

        if (nameMatch   && !meta.nombre)    meta.nombre    = nameMatch[1];
        if (artistMatch && !meta.cantautor) meta.cantautor = artistMatch[1];
        if (keyMatch    && !meta.tono)      meta.tono      = keyMatch[1];
        if (capoMatch)                      meta.capo      = parseInt(capoMatch[1]);
        break;
    }

    return meta;
}
