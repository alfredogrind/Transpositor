/* global Tonal */

export const SECTION_KEYWORDS = [
    'INTRO', 'ESTROFA', 'VERSO', 'VERSE',
    'PRE-CORO', 'PRE-CHORUS', 'CORO', 'CHORUS',
    'PUENTE', 'BRIDGE', 'OUTRO', 'FINAL', 'SOLO', 'CODA',
];

// ─── EXTRACCIÓN DE ACORDES ───────────────────────────────────────────────────

export function extractChordsWithRepetition(text) {
    let results = [];
    const triplePattern = /\|{3,}(.*?)\|{3,}/g;
    const doublePattern = /\|{2}(.*?)\|{2}/g;
    let tempText = text;

    tempText = tempText.replace(triplePattern, (_, content) => {
        const chords = _getChordsOnly(content);
        results.push(...chords, ...chords, ...chords);
        return '';
    });

    tempText = tempText.replace(doublePattern, (_, content) => {
        const chords = _getChordsOnly(content);
        results.push(...chords, ...chords);
        return '';
    });

    results.push(..._getChordsOnly(tempText));
    return results;
}

function _getChordsOnly(text) {
    const clean = text.toUpperCase().replace(/♯/g, '#').replace(/♭/g, 'b');
    const chordRegex = /[A-G][\s]?[#b]?(M|m|MAJ|MIN|DIM|AUG|SUS|ADD|7|9|13)?(?=\s|$|[-(),|/])/g;
    const matches = clean.match(chordRegex) || [];
    return matches.map(chord => {
        const n = chord.replace(/\s+/g, '');
        // M sola al final = sufijo menor (era 'm' antes del toUpperCase)
        if (/^[A-G][#b]?M$/.test(n)) return n.slice(0, -1) + 'm';
        return n;
    });
}

// ─── TRANSPOSICIÓN ───────────────────────────────────────────────────────────

function _formatQuality(quality) {
    const q = quality.toLowerCase();
    if (q === 'major' || q === 'maj' || q === '') return '';
    if (q === 'minor' || q === 'min' || q === 'm') return 'm';
    if (q === 'augmented' || q === 'aug') return 'aug';
    if (q === 'diminished' || q === 'dim') return 'dim';
    return quality;
}

export function smartTransposeChord(chord, interval, preferFlats) {
    try {
        const chordInfo = Tonal.Chord.get(chord);
        const root = chordInfo.tonic;
        const quality = chordInfo.type || '';
        if (!root) return chord;

        let transposedRoot;
        if (Tonal.Note?.transpose) {
            transposedRoot = Tonal.Note.transpose(root, interval);
        } else if (Tonal.transpose) {
            transposedRoot = Tonal.transpose(root, interval);
        } else { return chord; }

        if (preferFlats && transposedRoot.includes('#')) {
            transposedRoot = Tonal.Note.enharmonic(transposedRoot);
        } else if (!preferFlats && transposedRoot.includes('b')) {
            transposedRoot = Tonal.Note.enharmonic(transposedRoot);
        }

        return Tonal.Note.simplify(transposedRoot) + _formatQuality(quality);
    } catch { return chord; }
}

// ─── MAPA CROMÁTICO Y CONVERSIÓN A GRADOS ────────────────────────────────────

// Mapa unificado: usado tanto por convertChordToDegree como por el motor de detección
const CHROMATIC_MAP = {
    'C':0, 'C#':1, 'Db':1, 'D':2, 'D#':3, 'Eb':3,
    'E':4, 'F':5,  'F#':6, 'Gb':6,'G':7,  'G#':8,
    'Ab':8,'A':9,  'A#':10,'Bb':10,'B':11,
};

const DEGREE_NAMES = ['1','1#','2','2#','3','4','4#','5','5#','6','6#','7'];

export function convertChordToDegree(chord, rootNote) {
    try {
        const chordInfo = Tonal.Chord.get(chord);
        const chordRoot = chordInfo.tonic;
        if (
            !chordRoot ||
            CHROMATIC_MAP[chordRoot] === undefined ||
            CHROMATIC_MAP[rootNote]  === undefined
        ) return chord;

        const semitones    = ((CHROMATIC_MAP[chordRoot] - CHROMATIC_MAP[rootNote]) % 12 + 12) % 12;
        const qualitySuffix = chord.slice(chordRoot.length);
        return DEGREE_NAMES[semitones] + qualitySuffix;
    } catch { return chord; }
}

export function convertToDegrees(chords, keyInfo) {
    if (!keyInfo?.root) return chords;
    return chords.map(c => convertChordToDegree(c, keyInfo.root));
}

// ─── MOTOR DE DETECCIÓN DE TONALIDAD (Krumhansl-Schmuckler) ──────────────────
//
// Algoritmo:
//   1. Descompone cada acorde en sus pitch classes (0-11).
//   2. Construye un histograma de frecuencias sobre todos los acordes.
//   3. Calcula el producto escalar del histograma contra los 24 perfiles KS
//      (12 tonalidades mayores + 12 menores).
//   4. La tonalidad con mayor puntuación es la ganadora.
//
// Los perfiles KS son coeficientes derivados de experimentos perceptuales
// que ponderan cada grado de la escala por su "estabilidad tonal" percibida.
// Esto diferencia, por ejemplo, Do Mayor de La menor aunque compartan notas.

const _CHORD_IVS = {
    major: [0,4,7],         minor: [0,3,7],
    dim:   [0,3,6],         aug:   [0,4,8],
    sus2:  [0,2,7],         sus4:  [0,5,7],
    maj7:  [0,4,7,11],      dom7:  [0,4,7,10],
    m7:    [0,3,7,10],      mM7:   [0,3,7,11],
    dim7:  [0,3,6,9],       hdim:  [0,3,6,10],
    maj9:  [0,4,7,11,2],    dom9:  [0,4,7,10,2],
    m9:    [0,3,7,10,2],    add9:  [0,4,7,2],
    dom11: [0,4,7,10,2,5],  dom13: [0,4,7,10,2,5,9],
    six:   [0,4,7,9],       m6:    [0,3,7,9],
};

// Índice 0 = tónica; los demás = grados cromáticos relativos a ella
const _KS_MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const _KS_MINOR = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

// Etiqueta preferida por pitch class — todas presentes en CHROMATIC_MAP
const _KEY_LABEL = ['C','Db','D','Eb','E','F','F#','G','Ab','A','Bb','B'];

function _parseQuality(suffix) {
    // Normalizar a minúsculas para que los patrones sean case-insensitive
    const s = suffix.replace(/\s/g, '').toLowerCase();
    if (!s)                                 return 'major';
    // Orden de mayor a menor especificidad para evitar coincidencias parciales
    if (/^(mm7|mmaj7|minmaj7)/.test(s))     return 'mM7';   // minor-major 7ª
    if (/^(m7b5|ø)/.test(s))               return 'hdim';  // semidisminuido
    if (/^(dim7|°7)/.test(s))              return 'dim7';
    if (/^(dim|°)/.test(s))               return 'dim';
    if (/^(aug|\+)/.test(s))              return 'aug';
    if (/^maj9/.test(s))                  return 'maj9';
    if (/^maj7/.test(s))                  return 'maj7';
    if (/^maj/.test(s))                   return 'major';
    if (/^m9/.test(s))                    return 'm9';
    if (/^m7/.test(s))                    return 'm7';
    if (/^m6/.test(s))                    return 'm6';
    if (/^m/.test(s))                     return 'minor';
    if (/^sus4/.test(s))                  return 'sus4';
    if (/^sus2/.test(s))                  return 'sus2';
    if (/^add[29]/.test(s))              return 'add9';
    if (/^13/.test(s))                   return 'dom13';
    if (/^11/.test(s))                   return 'dom11';
    if (/^9/.test(s))                    return 'dom9';
    if (/^7/.test(s))                    return 'dom7';
    if (/^6/.test(s))                    return 'six';
    return 'major';
}

function _chordPitchClasses(chord) {
    const main = chord.split('/')[0].trim();   // ignora el bajo en acordes slash
    const m    = main.match(/^([A-G][#b]?)(.*)/);
    if (!m) return [];
    const rootPc = CHROMATIC_MAP[m[1]];
    if (rootPc === undefined) return [];
    const ivs = _CHORD_IVS[_parseQuality(m[2])] ?? [0, 4, 7];
    return [...new Set(ivs.map(i => (rootPc + i) % 12))];
}

export function detectSongKey(allChords) {
    if (!allChords || allChords.length === 0) return null;

    // 1 ── Histograma de pitch classes (0-11) acumulado sobre todos los acordes
    const freq  = new Float32Array(12);
    let   total = 0;
    for (const chord of allChords) {
        for (const pc of _chordPitchClasses(chord)) { freq[pc]++; total++; }
    }

    // Fallback: sin acordes reconocibles → usar el primer acorde como referencia
    if (total === 0) {
        const root    = allChords[0].match(/^[A-G][#b]?/)?.[0] ?? allChords[0];
        const isMinor = /^[A-G][#b]?m(?!aj)/i.test(allChords[0]);
        return { root, quality: isMinor ? 'menor' : 'Mayor', confidence: 0 };
    }

    // 2 ── Producto escalar freq · perfil KS para las 24 tonalidades
    let bestScore  = -Infinity;
    let secondBest = -Infinity;
    let bestRoot   = 0;
    let bestMode   = 'major';

    for (let r = 0; r < 12; r++) {
        for (const [mode, profile] of [['major', _KS_MAJOR], ['minor', _KS_MINOR]]) {
            let score = 0;
            for (let pc = 0; pc < 12; pc++) {
                score += freq[pc] * profile[((pc - r) % 12 + 12) % 12];
            }
            if (score > bestScore) {
                secondBest = bestScore;
                bestScore  = score;
                bestRoot   = r;
                bestMode   = mode;
            } else if (score > secondBest) {
                secondBest = score;
            }
        }
    }

    // 3 ── Confianza: separación relativa entre la tonalidad ganadora y la segunda
    const confidence = parseFloat(
        Math.min(Math.max((bestScore - secondBest) / bestScore, 0), 1).toFixed(2)
    );

    return {
        root:       _KEY_LABEL[bestRoot],
        quality:    bestMode === 'major' ? 'Mayor' : 'menor',
        confidence,                        // 0–1: qué tan inequívoca es la detección
    };
}
