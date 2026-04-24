/* global Tonal */

export const SECTION_KEYWORDS = ['INTRO', 'ESTROFA', 'VERSO', 'VERSE', 'PRE-CORO', 'PRE-CHORUS', 'CORO', 'CHORUS', 'PUENTE', 'BRIDGE', 'OUTRO', 'FINAL', 'SOLO', 'CODA'];

export function extractChordsWithRepetition(text) {
    let results = [];
    const triplePattern = /\|{3,}(.*?)\|{3,}/g; 
    const doublePattern = /\|{2}(.*?)\|{2}/g;    
    let tempText = text;

    tempText = tempText.replace(triplePattern, (match, content) => {
        const chords = getChordsOnly(content);
        results.push(...chords, ...chords, ...chords);
        return ""; 
    });

    tempText = tempText.replace(doublePattern, (match, content) => {
        const chords = getChordsOnly(content);
        results.push(...chords, ...chords);
        return ""; 
    });

    results.push(...getChordsOnly(tempText));
    return results;
}

function getChordsOnly(text) {
    let cleanText = text.toUpperCase().replace(/♯/g, '#').replace(/♭/g, 'b');
    const chordRegex = /[A-G][\s]?[#b]?(M|m|MAJ|MIN|DIM|AUG|SUS|ADD|7|9|13)?(?=\s|$|[-(),|/])/g;
    const matches = cleanText.match(chordRegex) || [];

    return matches.map(chord => {
        let n = chord.replace(/\s+/g, '');
        // 'M' sola al final = sufijo menor (era 'm' minúscula antes de toUpperCase)
        // Aplica a: DM→Dm, AM→Am, C#M→C#m, BBM→Bm, etc.
        if (/^[A-G][#b]?M$/.test(n)) return n.slice(0, -1) + 'm';
        return n;
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
        const chordInfo = Tonal.Chord.get(chord);
        const root = chordInfo.tonic;
        const quality = chordInfo.type || "";
        if (!root) return chord;

        let transposedRoot;
        if (Tonal.Note && Tonal.Note.transpose) {
            transposedRoot = Tonal.Note.transpose(root, interval);
        } else if (Tonal.transpose) {
            transposedRoot = Tonal.transpose(root, interval);
        } else { return chord; }

        if (preferFlats && transposedRoot.includes('#')) {
            transposedRoot = Tonal.Note.enharmonic(transposedRoot);
        } else if (!preferFlats && transposedRoot.includes('b')) {
            transposedRoot = Tonal.Note.enharmonic(transposedRoot);
        }

        return (Tonal.Note.simplify(transposedRoot)) + formatQuality(quality);
    } catch (e) { return chord; }
}

const CHROMATIC_MAP = { C:0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11 };
const DEGREE_NAMES  = ['1','1#','2','2#','3','4','4#','5','5#','6','6#','7'];

export function convertChordToDegree(chord, rootNote) {
    try {
        const chordInfo  = Tonal.Chord.get(chord);
        const chordRoot  = chordInfo.tonic;
        if (!chordRoot || CHROMATIC_MAP[chordRoot] === undefined || CHROMATIC_MAP[rootNote] === undefined) return chord;

        const semitones    = ((CHROMATIC_MAP[chordRoot] - CHROMATIC_MAP[rootNote]) % 12 + 12) % 12;
        const degree       = DEGREE_NAMES[semitones];
        const qualitySuffix = chord.slice(chordRoot.length);
        return degree + qualitySuffix;
    } catch (e) { return chord; }
}

export function convertToDegrees(chords, keyInfo) {
    if (!keyInfo?.root) return chords;
    return chords.map(c => convertChordToDegree(c, keyInfo.root));
}

export function detectSongKey(allChords) {
    if (!allChords || allChords.length === 0) return null;
    const firstChord = allChords[0];
    try {
        const chordInfo = Tonal.Chord.get(firstChord);
        const root = chordInfo.tonic || firstChord.match(/^[A-G][#b]?/)[0];
        // Fuente primaria: Tonal reconoce el tipo del acorde
        // Fallback: 'm' minúscula inmediatamente después de la raíz ([A-G] + accidental)
        const isMinor = chordInfo.type?.toLowerCase().includes('minor') ||
                        /^[A-G][#b]?m(?!aj)/i.test(firstChord);
        return { root, quality: isMinor ? 'menor' : 'Mayor' };
    } catch (e) { return { root: firstChord, quality: '' }; }
}