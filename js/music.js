/* global Tonal */

// Palabras clave para detectar secciones
export const SECTION_KEYWORDS = ['INTRO', 'ESTROFA', 'VERSO', 'VERSE', 'PRE-CORO', 'PRE-CHORUS', 'CORO', 'CHORUS', 'PUENTE', 'BRIDGE', 'OUTRO', 'FINAL', 'SOLO', 'CODA'];

/**
 * Extrae acordes detectando repeticiones armónicas || (x2) y ||| (x3)
 */
export function extractChordsWithRepetition(text) {
    let results = [];
    
    // 1. Patrones de repetición: buscamos lo que esté entre barras
    const triplePattern = /\|{3,}(.*?)\|{3,}/g; // Detecta |||...|||
    const doublePattern = /\|{2}(.*?)\|{2}/g;    // Detecta ||...||

    let tempText = text;

    // Procesar repeticiones x3
    tempText = tempText.replace(triplePattern, (match, content) => {
        const chords = getChordsOnly(content);
        results.push(...chords, ...chords, ...chords);
        return ""; // Borramos del texto para que no se duplique luego
    });

    // Procesar repeticiones x2
    tempText = tempText.replace(doublePattern, (match, content) => {
        const chords = getChordsOnly(content);
        results.push(...chords, ...chords);
        return ""; // Borramos del texto
    });

    // 2. Procesar el resto del texto que no estaba entre barras
    results.push(...getChordsOnly(tempText));

    return results;
}

/**
 * Función interna para limpiar y extraer notas puras
 */
function getChordsOnly(text) {
    let cleanText = text.toUpperCase().replace(/♯/g, '#').replace(/♭/g, 'b');
    // Regex optimizada para notas y calidades con lookahead para separadores
    const chordRegex = /[A-G][\s]?[#b]?(M|m|MAJ|MIN|DIM|AUG|SUS|ADD|7|9|13)?(?=\s|$|[-(),|/])/g;
    const matches = cleanText.match(chordRegex) || [];

    return matches.map(chord => {
        let normalized = chord.replace(/\s+/g, '');
        if (normalized === 'EM') return 'Em';
        if (normalized === 'BM') return 'Bm';
        return normalized;
    });
}

function formatQuality(quality) {
    const q = quality.toLowerCase();
    if (q === 'major' || q === 'maj' || q === '') return ''; 
    if (q === 'minor' || q === 'min' || q === 'm') return 'm';
    if (q === 'augmented' || q === 'aug') return 'aug';
    if (q === 'diminished' || q === 'dim') return 'dim';
    return quality;
}

export function smartTransposeChord(chord, interval, preferFlats) {
    try {
        const chordInfo = Tonal.Chord ? Tonal.Chord.get(chord) : Tonal.chord(chord);
        const root = chordInfo.tonic;
        const quality = chordInfo.type || "";

        if (!root) return chord;

        let transposedRoot;
        if (Tonal.Note && Tonal.Note.transpose) {
            transposedRoot = Tonal.Note.transpose(root, interval);
        } else if (Tonal.transpose) {
            transposedRoot = Tonal.transpose(root, interval);
        } else {
            return chord;
        }

        // Manejo de enarmonía según destino
        if (preferFlats && transposedRoot.includes('#')) {
            transposedRoot = (Tonal.Note && Tonal.Note.enharmonic) ? Tonal.Note.enharmonic(transposedRoot) : transposedRoot;
        } else if (!preferFlats && transposedRoot.includes('b')) {
            transposedRoot = (Tonal.Note && Tonal.Note.enharmonic) ? Tonal.Note.enharmonic(transposedRoot) : transposedRoot;
        }

        return (Tonal.Note.simplify ? Tonal.Note.simplify(transposedRoot) : transposedRoot) + formatQuality(quality);
    } catch (e) {
        return chord;
    }
}