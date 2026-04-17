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

        // Buscador de función de transposición (Safe-mode)
        const transFn = (Tonal.Note && Tonal.Note.transpose) || Tonal.transpose;
        if (!transFn) return chord;

        let transposedRoot = transFn(root, interval);

        // Enarmonía inteligente
        const enharmonicFn = (Tonal.Note && Tonal.Note.enharmonic) || Tonal.enharmonic;
        if (enharmonicFn) {
            if (preferFlats && transposedRoot.includes('#')) transposedRoot = enharmonicFn(transposedRoot);
            else if (!preferFlats && transposedRoot.includes('b')) transposedRoot = enharmonicFn(transposedRoot);
        }

        const simplifyFn = (Tonal.Note && Tonal.Note.simplify) || Tonal.simplify;
        const finalRoot = simplifyFn ? simplifyFn(transposedRoot) : transposedRoot;

        return finalRoot + formatQuality(quality);
    } catch (e) { return chord; }
}
