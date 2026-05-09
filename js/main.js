import * as music from './music.js';
import * as ui from './ui.js';
import * as template from './template.js';
import API from './api.js';
import { toggleLibrary } from './library.js';
import { parseLaCuerda } from './lacuerda.js';
import { parseCifraClub } from './cifraclub.js';

let songData          = [];
let targetKey         = null;
let detectedKey       = null;
let lastTransposedData = null;
let notationMode      = 'classic';
let tagEditor         = null;
let pendingMeta       = null;  // metadata pre-cargada desde LaCuerda

document.addEventListener('DOMContentLoaded', async () => {
    ui.initTheme();
    initTemplateModal();
    initAlertModal();
    initSavePanelDrawer();
    initNotationToggle();
    initSetlistPopup();
    initUrlImport();
    ui.initSFM(toggleLibrary, scrollToOrShowSavePanel, openSetlistPopup);
    ui.updateSFMSaveState(false);
    await loadPendingSong();
});

const btnProcess = document.getElementById('btnProcess');
const fileInput  = document.getElementById('fileInput');
const statusText = document.getElementById('statusText');
const loaderWrap = document.getElementById('loaderWrap');
const btnTranspose = document.getElementById('btnTranspose');

// --- Selección de plantillas ---
fileInput.onchange = () => {
    const files     = Array.from(fileInput.files);
    const container = document.getElementById('thumbnailContainer');

    if (container) {
        container.innerHTML = '';
        for (const file of files) {
            const fmt = template.detectFormat(file.name);
            if (!fmt) continue;
            const div = document.createElement('div');
            div.className = 'thumb-item thumb-item--template';
            div.innerHTML = `<span class="thumb-tpl-label">${fmt.toUpperCase()}</span>`;
            container.appendChild(div);
        }
    }
    btnProcess.disabled = files.length === 0;
};

// --- Procesamiento de plantilla ---
btnProcess.onclick = async () => {
    try {
        ui.showScanner(loaderWrap, statusText, "Cargando plantilla...");
        songData = [];
        lastTransposedData = null;
        ui.updateSFMSaveState(false);
        document.getElementById('detectionResults').innerHTML = "";
        document.getElementById('finalOutput').style.display = 'none';

        for (const file of Array.from(fileInput.files)) {
            const fmt = template.detectFormat(file.name);
            if (!fmt) continue;
            const text = await file.text();
            songData.push(...template.parseTemplate(text, fmt, music.extractChordsWithRepetition));
        }
        refreshUI();
    } catch (error) { console.error("Error:", error); }
    finally { loaderWrap.style.display = 'none'; }
};

// ── Importar desde LaCuerda.net ────────────────────────────────────────────

function initUrlImport() {
    const btnToggle = document.getElementById('btnToggleUrlImport');
    const panel     = document.getElementById('urlImportPanel');
    const input     = document.getElementById('urlImportInput');
    const btnGo     = document.getElementById('btnImportUrl');
    if (!btnToggle || !panel) return;

    btnToggle.addEventListener('click', () => {
        const isHidden = panel.hidden;
        panel.hidden = !isHidden;
        if (isHidden) input?.focus();
    });

    btnGo?.addEventListener('click', _doImportUrl);
    input?.addEventListener('keydown', e => { if (e.key === 'Enter') _doImportUrl(); });
}

async function _doImportUrl() {
    const input = document.getElementById('urlImportInput');
    const rawUrl = input?.value.trim();
    if (!rawUrl) return;

    // Normalizar: añadir protocolo si falta
    const url = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;

    // Detectar fuente y validar URL
    let source;
    try {
        const u = new URL(url);
        if (u.hostname === 'acordes.lacuerda.net') {
            if (!u.pathname.endsWith('.shtml')) {
                showAlert('URL inválida. El formato de LaCuerda debe ser:\nacordes.lacuerda.net/artista/cancion-N.shtml');
                return;
            }
            source = 'lacuerda';
        } else if (u.hostname.includes('cifraclub.com')) {
            source = 'cifraclub';
        } else {
            showAlert('URL no reconocida. Introduce una URL de:\n• cifraclub.com/artista/cancion\n• acordes.lacuerda.net/artista/cancion.shtml');
            return;
        }
    } catch {
        showAlert('URL inválida.');
        return;
    }

    const sourceLabel = source === 'lacuerda' ? 'LaCuerda' : 'CifraClub';
    ui.showScanner(loaderWrap, statusText, `Obteniendo acordes desde ${sourceLabel}…`);
    songData = [];
    lastTransposedData = null;
    pendingMeta = null;
    ui.updateSFMSaveState(false);
    document.getElementById('detectionResults').innerHTML = '';
    document.getElementById('finalOutput').style.display = 'none';

    try {
        let html, parsed, meta;
        if (source === 'lacuerda') {
            html = await API.lacuerda(url);
            ({ songData: parsed, meta } = parseLaCuerda(html));
        } else {
            html = await API.cifraclub(url);
            ({ songData: parsed, meta } = parseCifraClub(html));
        }

        if (!parsed.length) throw new Error('No se encontraron acordes en la página.');

        songData    = parsed;
        pendingMeta = meta;
        document.getElementById('urlImportPanel').hidden = true;
        refreshUI();
    } catch (err) {
        showAlert(`Error al importar: ${err.message}`);
    } finally {
        loaderWrap.style.display = 'none';
    }
}


function getLabelFn(referenceRoot) {
    if (notationMode === 'degrees' && referenceRoot) {
        return c => music.convertChordToDegree(c, referenceRoot);
    }
    return c => c;
}

function refreshUI() {
    songData    = songData.filter(s => s.chords.length > 0);
    const chords = songData.flatMap(s => s.chords);
    detectedKey  = music.detectSongKey(chords);
    targetKey    = null;

    ui.renderResults(
        document.getElementById('detectionResults'),
        songData,
        (idx, title) => { songData[idx].section = title; },
        (newOrder) => { songData = newOrder.map(i => songData[i]); },
        getLabelFn(detectedKey?.root)
    );

    _renderKeySection();
    document.getElementById('toneSelector').style.display = 'block';
    ui.updateSFMSaveState(true);
}

function _renderKeySection() {
    const keyModeRow = document.getElementById('keyModeRow');
    const gridTones  = document.getElementById('gridTones');

    ui.renderKeyToggle(keyModeRow, detectedKey, (newQuality) => {
        if (!detectedKey || newQuality === detectedKey.quality) return;

        // Intercambiar con la tonalidad relativa
        detectedKey = {
            root:       detectedKey.relative.root,
            quality:    detectedKey.relative.quality,
            confidence: detectedKey.confidence,
            relative:   { root: detectedKey.root, quality: detectedKey.quality },
        };

        // Limpiar selección previa y re-renderizar el grid en el nuevo modo
        targetKey = null;
        document.querySelectorAll('.btn-tone').forEach(b => b.classList.remove('selected'));
        ui.renderToneGrid(gridTones, detectedKey.quality, (note) => { targetKey = note; });
    });

    ui.renderToneGrid(gridTones, detectedKey?.quality, (note) => { targetKey = note; });
}

btnTranspose.onclick = () => {
    if (!songData.length) return showAlert('Primero carga y escanea una partitura.');
    if (!targetKey) return showAlert('Selecciona un tono de destino.');

    // targetKey puede ser "Dm", "F#m"… — extraer solo la raíz para cálculos de intervalo
    const targetRoot = targetKey.replace(/m$/, '');

    // Buscar el primer acorde real (puede tener marcadores embebidos como '||C')
    const firstRaw  = songData.flatMap(s => s.chords).find(c => /[A-G]/.test(c)) ?? '';
    const firstPure = firstRaw.replace(/^(\|{2,}|\/{2,})/, '').replace(/(\|{2,}|\/{2,})$/, '');
    const source    = Tonal.Chord.get(firstPure).tonic || firstPure.match(/^[A-G][#b]?/)?.[0];
    if (!source) return showAlert('No se pudo determinar el tono de origen.');
    const interval = Tonal.distance(source, targetRoot);

    // Claves que usan bemoles (mayor + relativas menores)
    const preferFlats = [
        'F','Bb','Eb','Ab','Db','Gb',       // mayores con bemoles
        'Dm','Gm','Cm','Fm','Bbm','Ebm',    // menores relativas
    ].includes(targetKey);

    lastTransposedData = songData.map(item => ({
        section: item.section,
        chords:  item.chords.map(c => music.smartTransposeChord(c, interval, preferFlats)),
    }));

    ui.renderFinalResults(
        document.getElementById('outputContainer'),
        lastTransposedData,
        getLabelFn(targetRoot),   // grados relativos a la raíz (sin sufijo)
    );
    document.getElementById('finalOutput').style.display = 'block';
    closeSavePanel();
    ui.updateSFMSaveState(true);
};

function scrollToOrShowSavePanel() {
    if (!songData.length) return;
    showSavePanel(detectedKey?.root || '');
}

function closeSavePanel() {
    ui.closeOverlay(
        document.getElementById('savePanelOverlay'),
        document.getElementById('savePanelDrawer')
    );
}

function showSavePanel(tonoOriginal) {
    const overlay = document.getElementById('savePanelOverlay');
    if (!overlay) return;

    ['saveNombre', 'saveCantautor', 'saveBpm', 'saveNotas'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    tagEditor?.reset();

    // Pre-llenar desde metadata de LaCuerda si está disponible
    if (pendingMeta) {
        if (pendingMeta.nombre)    document.getElementById('saveNombre').value    = pendingMeta.nombre;
        if (pendingMeta.cantautor) document.getElementById('saveCantautor').value = pendingMeta.cantautor;
        if (pendingMeta.bpm)       document.getElementById('saveBpm').value       = pendingMeta.bpm;
    }

    const msg = document.getElementById('saveMsg');
    const btn = document.getElementById('btnGuardar');
    if (msg) msg.textContent = '';
    if (btn) { btn.disabled = false; btn.textContent = 'Guardar canción'; }

    overlay.dataset.tonoOriginal = pendingMeta?.tono || tonoOriginal;
    overlay.setAttribute('aria-hidden', 'false');
    overlay.classList.add('open');
    document.getElementById('saveNombre')?.focus();
}

function initSavePanelDrawer() {
    const overlay = document.getElementById('savePanelOverlay');
    if (!overlay) return;

    tagEditor = ui.createTagEditor(
        document.getElementById('spTagChips'),
        document.getElementById('spTagInput'),
        document.getElementById('saveEtiquetas')
    );

    document.getElementById('saveBpm')?.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 3);
    });

    document.getElementById('savePanelClose')?.addEventListener('click', closeSavePanel);

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeSavePanel();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeSavePanel();
    });

    document.getElementById('btnGuardar')?.addEventListener('click', async () => {
        const nombre    = document.getElementById('saveNombre').value.trim();
        const cantautor = document.getElementById('saveCantautor').value.trim();
        const msg       = document.getElementById('saveMsg');
        const btn       = document.getElementById('btnGuardar');

        if (!nombre || !cantautor) {
            msg.style.color = 'var(--danger, #e55)';
            msg.textContent = 'Nombre y cantautor son obligatorios.';
            return;
        }

        try {
            btn.disabled = true;
            await API.crear({
                nombre,
                cantautor,
                tonoOriginal: overlay.dataset.tonoOriginal || '',
                bpm: document.getElementById('saveBpm').value || null,
                etiquetas: document.getElementById('saveEtiquetas').value,
                notas: document.getElementById('saveNotas').value.trim(),
                letrasAcordes: JSON.stringify(songData),
            });
            msg.style.color = 'var(--accent)';
            msg.textContent = '✅ Canción guardada en la biblioteca.';
            btn.textContent = 'Guardado';
        } catch (err) {
            msg.style.color = 'var(--danger, #e55)';
            msg.textContent = `❌ ${err.message}`;
            btn.disabled = false;
        }
    });
}


function showAlert(msg) {
    const modal = document.getElementById('alertModal');
    document.getElementById('alertModalText').textContent = msg;
    modal.setAttribute('aria-hidden', 'false');
    modal.classList.add('open');
}

function initAlertModal() {
    const modal = document.getElementById('alertModal');
    if (!modal) return;
    document.getElementById('closeAlertBtn').onclick = () => {
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
    };
    modal.addEventListener('click', e => {
        if (e.target === modal) {
            modal.classList.remove('open');
            modal.setAttribute('aria-hidden', 'true');
        }
    });
}

function initNotationToggle() {
    const pills = document.querySelectorAll('.notation-pill');
    pills.forEach(pill => {
        pill.addEventListener('click', () => {
            notationMode = pill.dataset.mode;
            pills.forEach(p => p.classList.toggle('active', p.dataset.mode === notationMode));

            if (songData.length) {
                ui.renderResults(
                    document.getElementById('detectionResults'),
                    songData,
                    (idx, title) => { songData[idx].section = title; },
                    (newOrder) => { songData = newOrder.map(i => songData[i]); },
                    getLabelFn(detectedKey?.root)
                );
            }
            if (lastTransposedData) {
                ui.renderFinalResults(document.getElementById('outputContainer'), lastTransposedData, getLabelFn(targetKey?.replace(/m$/, '')));
            }
        });
    });
}

async function loadSongById(id) {
    try {
        const cancion = await API.obtenerCancion(parseInt(id));

        lastTransposedData = null;
        targetKey = null;
        ui.updateSFMSaveState(false);
        document.getElementById('finalOutput').style.display = 'none';
        document.getElementById('detectionResults').innerHTML = '';
        document.getElementById('toneSelector').style.display = 'none';

        if (cancion.letra_acordes) {
            try { songData = JSON.parse(cancion.letra_acordes); }
            catch { songData = []; }
        } else {
            songData = [];
        }

        if (songData.length) {
            refreshUI();
            showToast(`♪ ${cancion.nombre} — ${cancion.cantautor}`);
        } else {
            showToast(`${cancion.nombre} cargada (sin acordes guardados)`, true);
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
        console.error('Error al cargar canción:', err);
    }
}

async function loadPendingSong() {
    const id = localStorage.getItem('pendingSongId');
    if (!id) return;
    localStorage.removeItem('pendingSongId');
    await loadSongById(id);
}

function showToast(msg, warn = false) {
    const t = document.createElement('div');
    t.className = 'lib-toast' + (warn ? ' lib-toast--warn' : '');
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('show')));
    setTimeout(() => {
        t.classList.remove('show');
        setTimeout(() => t.remove(), 400);
    }, 3800);
}

function initTemplateModal() {
    const modal = document.getElementById('templateModal');
    const btnOpen = document.getElementById('btnTemplate');
    const btnClose = document.getElementById('modalClose');
    if (!modal || !btnOpen) return;
    btnOpen.onclick = () => modal.classList.add('open');
    btnClose.onclick = () => modal.classList.remove('open');
    modal.querySelectorAll('.modal-option').forEach(btn => {
        btn.onclick = () => { template.downloadTemplate(btn.dataset.format); modal.classList.remove('open'); };
    });
}

// ── Setlist Popup ─────────────────────────────────────────────────
function initSetlistPopup() {
    const overlay = document.getElementById('setlistPopupOverlay');
    const btnClose = document.getElementById('setlistPopupClose');
    const btnBack  = document.getElementById('setlistPopupBack');
    if (!overlay) return;

    btnClose.addEventListener('click', closeSetlistPopup);
    btnBack.addEventListener('click', showSetlistList);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeSetlistPopup(); });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && overlay.classList.contains('open')) closeSetlistPopup();
    });
}

function closeSetlistPopup() {
    const overlay = document.getElementById('setlistPopupOverlay');
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
}

async function openSetlistPopup() {
    const overlay = document.getElementById('setlistPopupOverlay');
    overlay.setAttribute('aria-hidden', 'false');
    overlay.classList.add('open');
    await showSetlistList();
}

async function showSetlistList() {
    const content  = document.getElementById('setlistPopupContent');
    const title    = document.getElementById('setlistPopupTitle');
    const btnBack  = document.getElementById('setlistPopupBack');
    title.textContent = 'Setlists';
    btnBack.style.visibility = 'hidden';
    content.innerHTML = '<p class="sl-empty">Cargando…</p>';

    try {
        const setlists = await API.obtenerSetlists();
        if (!setlists.length) {
            content.innerHTML = '<p class="sl-empty">No hay setlists creados.<br>Créalos desde la Biblioteca.</p>';
            return;
        }
        content.innerHTML = setlists.map((sl, i) => `
            <button class="sl-pick-card" data-id="${sl.id}"
                    style="animation-delay:${i * 55}ms">
                <span class="sl-pick-dot" style="background:${escHtml(sl.color || '#667eea')}"></span>
                <span class="sl-pick-name">${escHtml(sl.nombre)}</span>
                <span class="sl-pick-count">${sl.total_canciones || 0} canciones</span>
            </button>`).join('');

        content.querySelectorAll('.sl-pick-card').forEach(card => {
            card.addEventListener('click', () => showSetlistSongs(parseInt(card.dataset.id), setlists));
        });
    } catch {
        content.innerHTML = '<p class="sl-empty">Error al cargar los setlists.</p>';
    }
}

async function showSetlistSongs(id, setlists) {
    const content  = document.getElementById('setlistPopupContent');
    const title    = document.getElementById('setlistPopupTitle');
    const btnBack  = document.getElementById('setlistPopupBack');
    const sl       = setlists.find(s => s.id === id);
    title.textContent = sl?.nombre || 'Setlist';
    btnBack.style.visibility = 'visible';
    content.innerHTML = '<p class="sl-empty">Cargando…</p>';

    try {
        const data  = await API.obtenerSetlist(id);
        const songs = data.canciones || [];
        if (!songs.length) {
            content.innerHTML = '<p class="sl-empty">Este setlist está vacío.</p>';
            return;
        }
        content.innerHTML = `<div style="padding:0 0.2rem">${songs.map((c, i) => `
            <button class="sl-song-row" data-id="${c.id}" style="animation-delay:${i * 45}ms"
                    title="Abrir en el transpositor">
                <span class="sl-song-pos">${i + 1}</span>
                <div class="sl-song-info">
                    <p class="sl-song-name">${escHtml(c.nombre)}</p>
                    <p class="sl-song-artist">${escHtml(c.cantautor)}</p>
                </div>
                ${c.tono_original ? `<span class="sl-song-badge">${escHtml(c.tono_original)}</span>` : ''}
                <span class="sl-song-open-icon">›</span>
            </button>`).join('')}</div>`;

        content.querySelectorAll('.sl-song-row').forEach(row => {
            row.addEventListener('click', async () => {
                closeSetlistPopup();
                await loadSongById(parseInt(row.dataset.id));
            });
        });
    } catch {
        content.innerHTML = '<p class="sl-empty">Error al cargar las canciones.</p>';
    }
}

function escHtml(t) {
    const d = document.createElement('div');
    d.textContent = t ?? '';
    return d.innerHTML;
}