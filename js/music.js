/* global Tonal */

export const SECTION_KEYWORDS = [
    'INTRO', 'ESTROFA', 'VERSO', 'VERSE',
    'PRE-CORO', 'PRE-CHORUS', 'PRE-ESTRIBILLO', 'CORO', 'CHORUS',
    'PUENTE', 'BRIDGE', 'INTERMEDIO', 'OUTRO', 'FINAL', 'SOLO', 'CODA',
    'INSTRUMENTAL',
];

// Alias → nombre canónico (en mayúsculas).
// Permite que los parsers y el parser de plantillas entiendan términos
// alternativos y los unifiquen con el vocabulario estándar del proyecto.
export const SECTION_ALIASES = {
    'primera parte':  'ESTROFA',
    'estribillo':     'CORO',
    'segunda parte':  'ESTROFA 2',
    'instrumental':   'INSTRUMENTAL',
    'intermedio':     'PUENTE',
    'pre-estribillo': 'PRE-CORO',
    'pre estribillo': 'PRE-CORO',
};

/**
 * Normaliza una etiqueta de sección cruda al nombre canónico:
 *   - Elimina signos de puntuación y corchetes del principio/fin.
 *   - Aplica el mapa de alias si coincide (case-insensitive).
 *   - VERSO [N] → ESTROFA [N]
 *   - Si no hay alias, convierte a mayúsculas.
 */
export function normalizeSection(raw) {
    const clean = raw.replace(/^[\s([{*#\-]+|[\s)\]}*#.:;\-]+$/g, '').trim();
    const aliased = SECTION_ALIASES[clean.toLowerCase()];
    if (aliased) return aliased;
    const upper = clean.toUpperCase();
    const versoMatch = upper.match(/^VERSO(\s+\d+)?$/);
    if (versoMatch) return 'ESTROFA' + (versoMatch[1] ?? '');
    return upper;
}

// ─── EXTRACCIÓN DE ACORDES ───────────────────────────────────────────────────

// Mantenido para compatibilidad con datos antiguos en BD (tokens separados '||', '||', '//')
export const REPEAT_TOKENS = new Set(['||', '|||', '//']);

// Separa el prefijo y sufijo de repetición embebidos en un string de acorde.
// Ej: '||C' → { prefix:'||', pure:'C', suffix:'' }
//     'F||' → { prefix:'', pure:'F', suffix:'||' }
//     'C'   → { prefix:'', pure:'C', suffix:'' }
function _extractRepeatMarkers(chord) {
    const prefixMatch = chord.match(/^(\|{2,}|\/{2,})/);
    const prefix = prefixMatch ? prefixMatch[1] : '';
    const rest   = chord.slice(prefix.length);
    const suffixMatch = rest.match(/(\|{2,}|\/{2,})$/);
    const suffix = suffixMatch ? suffixMatch[1] : '';
    const pure   = rest.slice(0, rest.length - suffix.length);
    return { prefix, pure, suffix };
}

// Normaliza el texto OCR antes de parsear: convierte patrones de barra simple o mal
// leídos (| simple) en || doble cuando encierran una secuencia de acordes.
// Bug corregido: usar [^|\n]* (asterisco) en lugar de [^|\n]+ (plus) para que el
// patrón funcione cuando el contenido empieza directamente con una nota (Bm, Am, G…)
// o cuando hay un único acorde entre las barras.
function _normalizeOCRRepeatMarkers(text) {
    return text.split('\n').map(line => {
        if (!/[A-G]/.test(line)) return line;
        return line
            // Barras (|, ||, |||, o más) encerrando acordes → normalizar a || o |||
            .replace(/(\|+)([^|\n]*[A-G][^|\n]*)(\|+)/g, (_, open, content) => {
                const mark = open.length >= 3 ? '|||' : '||';
                return mark + content + mark;
            })
            // Slashes (/, //, ///) encerrando acordes → normalizar a // o ///
            .replace(/(\/+)([^/\n]*[A-G][^/\n]*)(\/+)/g, (_, open, content) => {
                const mark = open.length >= 3 ? '///' : '//';
                return mark + content + mark;
            });
    }).join('\n');
}

export function extractChordsWithRepetition(text) {
    let results = [];
    // Normalizar primero para reparar || que OCR haya leído como | simple
    const normalized = _normalizeOCRRepeatMarkers(text);
    const triplePattern = /\|{3,}(.*?)\|{3,}/g;
    const doublePattern = /\|{2}(.*?)\|{2}/g;
    const slashPattern  = /\/{2}(.*?)\/{2}/g;
    let tempText = normalized;

    // Embebe el marcador como prefijo del primer acorde y sufijo del último.
    // Así '||C-G-A-F||' → ['||C', 'G', 'A', 'F||'] en lugar de tokens separados.
    function embedMarkers(chords, mark) {
        if (!chords.length) return;
        const marked = [...chords];
        marked[0] = mark + marked[0];
        marked[marked.length - 1] = marked[marked.length - 1] + mark;
        results.push(...marked);
    }

    // Triple pipe primero para que ||| no sea capturado como dos bloques ||
    tempText = tempText.replace(triplePattern, (_, content) => {
        embedMarkers(_getChordsOnly(content), '|||');
        return '';
    });

    tempText = tempText.replace(doublePattern, (_, content) => {
        embedMarkers(_getChordsOnly(content), '||');
        return '';
    });

    tempText = tempText.replace(slashPattern, (_, content) => {
        embedMarkers(_getChordsOnly(content), '//');
        return '';
    });

    results.push(..._getChordsOnly(tempText));
    return results;
}

function _getChordsOnly(text) {
    // Normalización en dos fases para preservar la 'b' bemol frente al toUpperCase().
    // Sin esto, 'Bb' → 'BB' y el bemol queda irreconocible como nombre de nota.
    // Fase 1: proteger '[A-G]b' (raíz mayúscula + bemol) antes de convertir a mayúsculas.
    // Fase 2: uppercase todo; el símbolo ♭ no se ve afectado.
    // Fase 3: restaurar ♭ como 'b' minúscula para que [#b]? siga funcionando.
    const clean = text
        .replace(/♯/g, '#')
        .replace(/♭/g, 'b')
        .replace(/([A-G])b/g, '$1♭')     // protege bemoles con raíz mayúscula: Bb → B♭
        .replace(/([a-g])b/g, (_, r) => r.toUpperCase() + '♭')  // y con raíz minúscula: ab → A♭
        .toUpperCase()
        .replace(/♭/g, 'b');             // restaura bemol como 'b' minúscula

    // (?:\/[A-G][#b]?)? consume el bajo en acordes slash (D/F#) como token único.
    // '/' ya no está en el lookahead porque es parte del acorde, no un delimitador.
    const chordRegex = /[A-G][#b]?(M|m|MAJ|MIN|DIM|AUG|SUS|ADD|7|9|13)?(?:\/[A-G][#b]?)?(?=\s|$|[-(),|])/g;
    const matches = clean.match(chordRegex) || [];
    return matches.map(chord => {
        // M inmediatamente tras la raíz (antes del slash o al final) = sufijo menor.
        // Cubre: DM → Dm, AM/C → Am/C, DM/F# → Dm/F#
        if (/^[A-G][#b]?M(\/[A-G][#b]?)?$/.test(chord)) return chord.replace('M', 'm');
        return chord;
    });
}

// ─── TRANSPOSICIÓN ───────────────────────────────────────────────────────────


export function smartTransposeChord(chord, interval, preferFlats) {
    const { prefix, pure, suffix } = _extractRepeatMarkers(chord);
    // Token de marcador puro (ej. '||' solo) o string vacío: pasar intacto
    if (!pure) return chord;
    try {
        // Separar el acorde principal de la nota del bajo ANTES de llamar a Tonal.
        // Tonal.Chord.get no soporta slash chords y devuelve tonic:null para "D/F#",
        // lo que haría que el acorde completo se devuelva sin transponer.
        const slashIdx  = pure.indexOf('/');
        const mainChord = slashIdx >= 0 ? pure.slice(0, slashIdx) : pure;
        const bassNote  = slashIdx >= 0 ? pure.slice(slashIdx + 1) : null;

        const chordInfo     = Tonal.Chord.get(mainChord);
        const root          = chordInfo.tonic;
        if (!root) return chord;
        // Preservar el sufijo exactamente como viene del original (ej. "9", "m7", "maj7")
        // en lugar de usar chordInfo.type que Tonal expande a "dominant ninth", etc.
        const qualitySuffix = mainChord.slice(root.length);

        // Helper: transpone una sola nota con el mismo intervalo y preferencia de alteración
        const transposeNote = (note) => {
            let t;
            if (Tonal.Note?.transpose) t = Tonal.Note.transpose(note, interval);
            else if (Tonal.transpose)  t = Tonal.transpose(note, interval);
            else return note;
            if (preferFlats && t.includes('#'))  t = Tonal.Note.enharmonic(t);
            else if (!preferFlats && t.includes('b')) t = Tonal.Note.enharmonic(t);
            return Tonal.Note.simplify(t);
        };

        const newRoot  = transposeNote(root);
        const newChord = newRoot + qualitySuffix;

        // Si había bajo, transponerlo con el mismo intervalo y reconstruir "Root/Bass"
        const transposed = !bassNote ? newChord : newChord + '/' + transposeNote(bassNote);
        return prefix + transposed + suffix;
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
    const { prefix, pure, suffix } = _extractRepeatMarkers(chord);
    if (!pure) return chord;  // token de marcador puro: pasar intacto
    try {
        // Separar el acorde principal del bajo en notación slash (ej. "D/F#" → "D" + "F#").
        // Tonal.Chord.get no reconoce slash chords, por lo que hay que aislar cada parte
        // antes de invocarla; de lo contrario devuelve tonic=null y el fallback devuelve
        // el nombre literal en lugar del grado.
        const slashIdx  = pure.indexOf('/');
        const mainChord = slashIdx >= 0 ? pure.slice(0, slashIdx) : pure;
        const bassNote  = slashIdx >= 0 ? pure.slice(slashIdx + 1) : null;

        const chordInfo = Tonal.Chord.get(mainChord);
        const chordRoot = chordInfo.tonic;
        if (
            !chordRoot ||
            CHROMATIC_MAP[chordRoot] === undefined ||
            CHROMATIC_MAP[rootNote]  === undefined
        ) return chord;

        // Grado del acorde principal relativo a la tonalidad
        const rootPc        = CHROMATIC_MAP[rootNote];
        const semitones     = ((CHROMATIC_MAP[chordRoot] - rootPc) % 12 + 12) % 12;
        const qualitySuffix = mainChord.slice(chordRoot.length);
        const degree        = DEGREE_NAMES[semitones] + qualitySuffix;

        let result;
        if (!bassNote) {
            result = degree;
        } else {
            // Grado del bajo relativo a la misma tonalidad
            const bassPc = CHROMATIC_MAP[bassNote];
            if (bassPc === undefined) result = degree + '/' + bassNote; // bajo desconocido: literal
            else {
                const bassDegree = ((bassPc - rootPc) % 12 + 12) % 12;
                result = degree + '/' + DEGREE_NAMES[bassDegree];
            }
        }

        return prefix + result + suffix;
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
//   2. Construye un histograma de frecuencias (normalizado a media cero).
//   3. Calcula el producto escalar normalizado contra los 24 perfiles KS
//      (12 tonalidades mayores + 12 menores), también normalizados a media cero.
//   4. Aplica heurísticas de apoyo (primer/último acorde, proporción mayor/menor).
//   5. La tonalidad con mayor puntuación es la ganadora.
//
// La normalización a media cero (paso 2-3) elimina el sesgo sistemático hacia
// el modo menor que produce la versión sin normalizar, porque los perfiles KS
// menores tienen una suma total mayor que los mayores.

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

// Perfiles normalizados a media cero — eliminan el sesgo hacia el modo menor
const _KS_MAJOR_NORM = (() => { const m = _KS_MAJOR.reduce((a,b)=>a+b,0)/12; return _KS_MAJOR.map(v=>v-m); })();
const _KS_MINOR_NORM = (() => { const m = _KS_MINOR.reduce((a,b)=>a+b,0)/12; return _KS_MINOR.map(v=>v-m); })();

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
    const { pure } = _extractRepeatMarkers(chord);
    if (!pure) return [];  // marcador puro: no contribuye al histograma
    const main = pure.split('/')[0].trim();   // ignora el bajo en acordes slash
    const m    = main.match(/^([A-G][#b]?)(.*)/);
    if (!m) return [];
    const rootPc = CHROMATIC_MAP[m[1]];
    if (rootPc === undefined) return [];
    const ivs = _CHORD_IVS[_parseQuality(m[2])] ?? [0, 4, 7];
    return [...new Set(ivs.map(i => (rootPc + i) % 12))];
}

// Calcula la tonalidad relativa (Mayor↔menor) dada una raíz y modo interno.
// mode: 'major' | 'minor'   →   retorna { root, quality } con strings de display.
function _relativeKey(rootLabel, mode) {
    const rootPc = CHROMATIC_MAP[rootLabel];
    if (rootPc === undefined) return null;
    if (mode === 'major') {
        return { root: _KEY_LABEL[(rootPc + 9) % 12], quality: 'menor' };
    } else {
        return { root: _KEY_LABEL[(rootPc + 3) % 12], quality: 'Mayor' };
    }
}

// Recoge señales heurísticas de los acordes de la canción para apoyar la
// decisión cuando el perfil KS es ambiguo (ej. Do Mayor vs La menor).
function _gatherHeuristics(allChords) {
    const real = allChords.filter(c => {
        const { pure } = _extractRepeatMarkers(c);
        return pure && /^[A-G]/.test(pure);
    });

    let majorCount = 0, minorCount = 0;
    const rootFreq = new Array(12).fill(0);

    for (const c of real) {
        const { pure } = _extractRepeatMarkers(c);
        const m = pure.match(/^([A-G][#b]?)(.*)/);
        if (!m) continue;
        const pc = CHROMATIC_MAP[m[1]];
        if (pc !== undefined) rootFreq[pc]++;
        if (/^[A-G][#b]?m(?!aj)/i.test(pure)) minorCount++;
        else majorCount++;
    }

    return {
        first:      real[0]                   ?? null,
        last:       real[real.length - 1]     ?? null,
        majorRatio: (majorCount + minorCount) > 0
            ? majorCount / (majorCount + minorCount)
            : 0.5,
        rootFreq,
    };
}

// Devuelve una puntuación adicional para (rootPc, mode) basada en las heurísticas.
// Los valores están calibrados para influir solo en casos ambiguos (KS gap pequeño).
function _heuristicBoost(rootPc, mode, h) {
    let boost = 0;

    // La raíz más frecuente es probablemente la tónica
    const maxFreq = Math.max(...h.rootFreq);
    if (maxFreq > 0 && h.rootFreq[rootPc] === maxFreq) boost += 0.8;

    // Primer acorde: señal fuerte sobre la tónica
    if (h.first) {
        const { pure } = _extractRepeatMarkers(h.first);
        const m = pure.match(/^([A-G][#b]?)(.*)/);
        if (m) {
            const firstPc      = CHROMATIC_MAP[m[1]];
            const firstIsMinor = /^[A-G][#b]?m(?!aj)/i.test(pure);
            if (firstPc === rootPc) {
                boost += 1.2;
                if (firstIsMinor === (mode === 'minor')) boost += 0.5;
            }
        }
    }

    // Último acorde: también suele ser la tónica
    if (h.last && h.last !== h.first) {
        const { pure } = _extractRepeatMarkers(h.last);
        const m = pure.match(/^([A-G][#b]?)(.*)/);
        if (m && CHROMATIC_MAP[m[1]] === rootPc) boost += 0.8;
    }

    // Proporción de acordes mayores vs menores
    if (mode === 'major' && h.majorRatio > 0.60) boost += 0.6;
    if (mode === 'minor' && h.majorRatio < 0.40) boost += 0.6;

    return boost;
}

export function detectSongKey(allChords) {
    if (!allChords || allChords.length === 0) return null;

    // 1 ── Histograma de pitch classes (0-11) acumulado sobre todos los acordes
    const freq  = new Float32Array(12);
    let   total = 0;
    for (const chord of allChords) {
        for (const pc of _chordPitchClasses(chord)) { freq[pc]++; total++; }
    }

    // Fallback: sin acordes reconocibles → usar el primer acorde real como referencia
    if (total === 0) {
        const firstRaw = allChords.find(c => /[A-G]/.test(c)) ?? allChords[0];
        const { pure } = _extractRepeatMarkers(firstRaw);
        const root     = pure.match(/^[A-G][#b]?/)?.[0] ?? pure;
        const mode     = /^[A-G][#b]?m(?!aj)/i.test(pure) ? 'minor' : 'major';
        return {
            root,
            quality:    mode === 'major' ? 'Mayor' : 'menor',
            confidence: 0,
            relative:   _relativeKey(root, mode),
        };
    }

    // 2 ── Normalizar histograma a media cero (elimina sesgo de magnitud absoluta)
    const freqMean = freq.reduce((a, b) => a + b, 0) / 12;
    const freqNorm = Float32Array.from(freq, v => v - freqMean);

    // 3 ── Producto escalar con perfiles KS normalizados para las 24 tonalidades
    const scores = [];
    for (let r = 0; r < 12; r++) {
        let majScore = 0, minScore = 0;
        for (let pc = 0; pc < 12; pc++) {
            const idx = ((pc - r) % 12 + 12) % 12;
            majScore += freqNorm[pc] * _KS_MAJOR_NORM[idx];
            minScore += freqNorm[pc] * _KS_MINOR_NORM[idx];
        }
        scores.push({ score: majScore, root: r, mode: 'major' });
        scores.push({ score: minScore, root: r, mode: 'minor' });
    }

    // 4 ── Heurísticas de apoyo: primer/último acorde, proporción mayor/menor
    const h = _gatherHeuristics(allChords);
    for (const s of scores) s.score += _heuristicBoost(s.root, s.mode, h);

    // 5 ── Seleccionar ganador y calcular confianza
    scores.sort((a, b) => b.score - a.score);
    const winner = scores[0];
    const spread = winner.score - scores[scores.length - 1].score;
    const gap    = winner.score - scores[1].score;
    const confidence = parseFloat(
        Math.min(spread > 0 ? gap / spread : 0, 1).toFixed(2)
    );

    const root    = _KEY_LABEL[winner.root];
    const quality = winner.mode === 'major' ? 'Mayor' : 'menor';

    return {
        root,
        quality,
        confidence,           // 0–1: qué tan inequívoca es la detección
        relative: _relativeKey(root, winner.mode),
    };
}
