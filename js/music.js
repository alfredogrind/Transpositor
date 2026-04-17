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

export function detectSongKey(allChords) {
    if (!allChords || allChords.length === 0) return null;
    const firstChord = allChords[0];
    try {
        const chordInfo = Tonal.Chord.get(firstChord);
        const root = chordInfo.tonic || firstChord.match(/^[A-G][#b]?/i)[0];
        const isMinor = chordInfo.type.toLowerCase().includes('minor') || 
                        (firstChord.includes('m') && !firstChord.toLowerCase().includes('maj'));
        return { root, quality: isMinor ? 'menor' : 'Mayor' };
    } catch (e) { return { root: firstChord, quality: '' }; }
}