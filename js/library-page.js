import API from './api.js';
import { initTheme } from './ui.js';

// ── State ──────────────────────────────────────────────────────
let songs        = [];
let favIds       = new Set();
let setlists     = [];
let currentSection     = 'canciones';
let viewMode           = localStorage.getItem('libViewMode') || 'table';
let filters            = { q: '', key: '', sort: 'recent' };
let editingId          = null;
let deletingId         = null;
let addingToSetlistId  = null;
let selectedSetlistId  = null;
let debounceTimer      = null;

// ── DOM refs ───────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const libSidebar          = $('libSidebar');
const libSidebarOverlay   = $('libSidebarOverlay');
const libMenuBtn          = $('libMenuBtn');
const libNav              = $('libNav');
const libPageTitle        = $('libPageTitle');
const libSearch           = $('libSearch');
const libFilterKey        = $('libFilterKey');
const libFilterSort       = $('libFilterSort');
const libSongsList        = $('libSongsList');
const libSetlistsSection  = $('libSetlistsSection');
const libSetlistsGrid     = $('libSetlistsGrid');
const libSetlistSongsHeader = $('libSetlistSongsHeader');
const libSetlistSongsTitle  = $('libSetlistSongsTitle');

// Modals
const modalEditar       = $('libModalEditar');
const modalConfirmar    = $('libModalConfirmar');
const modalSetlist      = $('libModalSetlist');
const modalAddSetlist   = $('libModalAddSetlist');

// ── Init ───────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);

async function init() {
    initTheme();
    setupNav();
    setupMobileSidebar();
    setupToolbar();
    setupViewBtns();
    setupModals();
    setupSongActions();
    setupSetlistActions();
    updateViewBtns();
    await Promise.all([loadStats(), loadFavs(), loadSongs()]);
}

// ── Navigation ─────────────────────────────────────────────────
function setupNav() {
    libNav?.querySelectorAll('.lib-nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
            setSection(btn.dataset.section);
            closeMobileSidebar();
        });
    });

    document.querySelector('.lib-back-btn')?.addEventListener('click', e => {
        e.preventDefault();
        const overlay = document.getElementById('pageTransitionOverlay');
        if (overlay) {
            overlay.classList.add('active');
            setTimeout(() => { window.location.href = 'index.html'; }, 300);
        } else {
            window.location.href = 'index.html';
        }
    });
}

function setSection(section) {
    currentSection = section;
    libNav?.querySelectorAll('.lib-nav-item').forEach(b =>
        b.classList.toggle('active', b.dataset.section === section)
    );
    const titles = { canciones: 'Mis Canciones', favoritos: 'Favoritos', setlists: 'Setlists' };
    if (libPageTitle) libPageTitle.textContent = titles[section] || 'Biblioteca';

    if (section === 'setlists') {
        libSetlistsSection.style.display = 'block';
        $('libToolbar').style.display = 'none';
        selectedSetlistId = null;
        libSetlistSongsHeader.style.display = 'none';
        libSongsList.innerHTML = '';
        loadSetlists();
    } else {
        libSetlistsSection.style.display = 'none';
        libSetlistSongsHeader.style.display = 'none';
        $('libToolbar').style.display = '';
        loadSongs();
    }
}

// ── Mobile sidebar ─────────────────────────────────────────────
function setupMobileSidebar() {
    libMenuBtn?.addEventListener('click', () => {
        libSidebar?.classList.toggle('open');
        libSidebarOverlay?.classList.toggle('open');
    });
    libSidebarOverlay?.addEventListener('click', closeMobileSidebar);
}
function closeMobileSidebar() {
    libSidebar?.classList.remove('open');
    libSidebarOverlay?.classList.remove('open');
}

// ── Stats ──────────────────────────────────────────────────────
async function loadStats() {
    try {
        const s = await API.obtenerStats();
        $('statTotal').textContent    = s.totalCanciones    ?? '—';
        $('statArtistas').textContent = s.totalCantautores  ?? '—';
        $('statBpm').textContent      = s.bpmPromedio       || '—';
        $('statTono').textContent     = s.tonoMasFrecuente  || '—';
    } catch (_) {}
}

// ── Favorites ──────────────────────────────────────────────────
async function loadFavs() {
    try {
        const favs = await API.obtenerFavoritos();
        favIds = new Set(favs.map(f => f.id));
    } catch (_) {}
}

// ── Songs ──────────────────────────────────────────────────────
async function loadSongs() {
    showSkeletons();
    try {
        const params = { ...filters };
        if (currentSection === 'favoritos') params.favoritos = '1';
        if (currentSection === 'setlists' && selectedSetlistId) {
            const sl = await API.obtenerSetlist(selectedSetlistId);
            songs = sl.canciones || [];
            renderSetlistSongs(songs);
            return;
        }
        songs = await API.listar(params);
        renderSongs(songs);
    } catch (_) {
        libSongsList.innerHTML = `<div class="lib-empty"><p>No se pudo cargar las canciones.</p></div>`;
    }
}

function showSkeletons() {
    if (viewMode === 'table') {
        const rows = Array(6).fill(0).map(() =>
            `<tr class="lib-skeleton-row">${Array(6).fill(0).map(() =>
                `<td><div style="height:0.9rem;border-radius:4px;" class="lib-skeleton"></div></td>`
            ).join('')}</tr>`
        ).join('');
        libSongsList.innerHTML = `
            <div class="lib-table-wrap">
                <table class="lib-table">
                    <thead><tr>
                        <th></th><th>Canción</th><th>Artista</th><th>Tono</th><th>BPM</th><th></th>
                    </tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>`;
    } else {
        libSongsList.innerHTML = `
            <div class="lib-songs-grid">
                ${Array(6).fill(0).map(() =>
                    `<div class="lib-grid-card" style="min-height:120px;">
                        <div class="lib-skeleton" style="height:0.9rem;border-radius:6px;margin-bottom:0.5rem;"></div>
                        <div class="lib-skeleton" style="height:0.75rem;width:60%;border-radius:6px;"></div>
                    </div>`
                ).join('')}
            </div>`;
    }
}

function renderSongs(data) {
    if (!data.length) {
        libSongsList.innerHTML = `<div class="lib-empty"><p>No hay canciones aquí todavía.</p></div>`;
        return;
    }
    viewMode === 'table' ? renderTable(data) : renderGrid(data);
}

function renderSetlistSongs(data) {
    if (!data.length) {
        libSongsList.innerHTML = `
            <div class="lib-empty">
                <p>Este setlist está vacío.</p>
                <span style="font-size:0.82rem;">Añade canciones desde la sección "Canciones".</span>
            </div>`;
        return;
    }
    const rows = data.map((c, i) => `
        <tr data-id="${c.id}" title="Doble clic para abrir en el transpositor" class="lib-row-openable">
            <td class="lib-cell-pos">${(c.posicion ?? i) + 1}</td>
            <td class="lib-cell-nombre">${esc(c.nombre)}</td>
            <td class="lib-cell-muted">${esc(c.cantautor)}</td>
            <td>${c.tono_original
                ? `<span class="lib-badge">${esc(c.tono_original)}</span>`
                : '<span class="lib-cell-muted">—</span>'}</td>
            <td class="lib-cell-actions">
                <button class="lib-row-btn danger"
                        data-action="removefromsetlist"
                        data-id="${c.id}"
                        title="Quitar del setlist">✕</button>
            </td>
        </tr>`).join('');

    libSongsList.innerHTML = `
        <div class="lib-table-wrap">
            <table class="lib-table">
                <thead><tr>
                    <th>#</th>
                    <th>Canción</th>
                    <th>Artista</th>
                    <th>Tono</th>
                    <th></th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`;
}

function renderTable(data) {
    const rows = data.map(c => `
        <tr data-id="${c.id}" title="Doble clic para abrir en el transpositor" class="lib-row-openable">
            <td class="lib-cell-fav">
                <button class="lib-fav-btn${favIds.has(c.id) ? ' active' : ''}"
                        data-action="fav" data-id="${c.id}" title="Favorito">♥</button>
            </td>
            <td class="lib-cell-nombre">${esc(c.nombre)}</td>
            <td class="lib-cell-muted">${esc(c.cantautor)}</td>
            <td>${c.tono_original ? `<span class="lib-badge">${esc(c.tono_original)}</span>` : '<span class="lib-cell-muted">—</span>'}</td>
            <td class="lib-cell-muted">${c.bpm ? `${c.bpm}` : '—'}</td>
            <td class="lib-tags-wrap">${tags(c.etiquetas)}</td>
            <td class="lib-cell-actions">
                <button class="lib-row-btn" data-action="addsetlist" data-id="${c.id}" title="Añadir a setlist">+</button>
                <button class="lib-row-btn" data-action="edit"       data-id="${c.id}" title="Editar">✎</button>
                <button class="lib-row-btn danger" data-action="delete"  data-id="${c.id}" title="Eliminar">✕</button>
            </td>
        </tr>`).join('');

    libSongsList.innerHTML = `
        <div class="lib-table-wrap">
            <table class="lib-table">
                <thead><tr>
                    <th></th>
                    <th>Canción</th>
                    <th>Artista</th>
                    <th>Tono</th>
                    <th>BPM</th>
                    <th>Etiquetas</th>
                    <th></th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`;
}

function renderGrid(data) {
    libSongsList.innerHTML = `
        <div class="lib-songs-grid">
            ${data.map(c => `
                <div class="lib-grid-card" data-id="${c.id}" title="Doble clic para abrir en el transpositor">
                    <div class="lib-grid-top">
                        <button class="lib-fav-btn${favIds.has(c.id) ? ' active' : ''}"
                                data-action="fav" data-id="${c.id}" title="Favorito">♥</button>
                        <div class="lib-grid-badges">
                            ${c.tono_original ? `<span class="lib-badge">${esc(c.tono_original)}</span>` : ''}
                            ${c.bpm           ? `<span class="lib-badge">${c.bpm} bpm</span>`            : ''}
                        </div>
                    </div>
                    <p class="lib-grid-nombre">${esc(c.nombre)}</p>
                    <p class="lib-grid-artista">${esc(c.cantautor)}</p>
                    ${c.etiquetas?.length ? `<div>${tags(c.etiquetas, 3)}</div>` : ''}
                    <div class="lib-grid-actions">
                        <button class="lib-row-btn" data-action="addsetlist" data-id="${c.id}">+</button>
                        <button class="lib-row-btn" data-action="edit"       data-id="${c.id}">✎</button>
                        <button class="lib-row-btn danger" data-action="delete" data-id="${c.id}">✕</button>
                    </div>
                </div>`).join('')}
        </div>`;
}

// ── Song actions (delegated) ───────────────────────────────────
function setupSongActions() {
    libSongsList.addEventListener('click', e => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const id     = parseInt(btn.dataset.id);
        const action = btn.dataset.action;
        if (action === 'fav')                    toggleFavorito(id, btn);
        else if (action === 'edit')              openEditModal(id);
        else if (action === 'delete')            openDeleteModal(id);
        else if (action === 'addsetlist')        openAddToSetlistModal(id);
        else if (action === 'removefromsetlist') removeFromSetlist(id);
    });

    libSongsList.addEventListener('dblclick', e => {
        if (e.target.closest('button')) return;
        const row = e.target.closest('tr[data-id], .lib-grid-card[data-id]');
        if (!row) return;
        openInTranspositor(parseInt(row.dataset.id));
    });
}

function openInTranspositor(id) {
    localStorage.setItem('pendingSongId', id);
    const overlay = document.getElementById('pageTransitionOverlay');
    if (overlay) {
        overlay.classList.add('active');
        setTimeout(() => { window.location.href = 'index.html'; }, 300);
    } else {
        window.location.href = 'index.html';
    }
}

// ── Toolbar ────────────────────────────────────────────────────
function setupToolbar() {
    libSearch?.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            filters.q = libSearch.value;
            loadSongs();
        }, 300);
    });
    libFilterKey?.addEventListener('change', () => { filters.key = libFilterKey.value; loadSongs(); });
    libFilterSort?.addEventListener('change', () => { filters.sort = libFilterSort.value; loadSongs(); });
}

// ── View toggle ────────────────────────────────────────────────
function setupViewBtns() {
    document.querySelectorAll('.lib-view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            viewMode = btn.dataset.mode;
            localStorage.setItem('libViewMode', viewMode);
            updateViewBtns();
            renderSongs(songs);
        });
    });
}
function updateViewBtns() {
    document.querySelectorAll('.lib-view-btn').forEach(btn =>
        btn.classList.toggle('active', btn.dataset.mode === viewMode)
    );
}

// ── Favorites ──────────────────────────────────────────────────
async function toggleFavorito(id, btn) {
    try {
        const isFav = await API.toggleFavorito(id);
        if (isFav) { favIds.add(id); btn.classList.add('active'); }
        else        { favIds.delete(id); btn.classList.remove('active'); }
        if (currentSection === 'favoritos') loadSongs();
        notif(isFav ? '♥ Añadido a favoritos' : 'Eliminado de favoritos');
    } catch (err) { notif(err.message, true); }
}

// ── Setlists ───────────────────────────────────────────────────
async function loadSetlists() {
    libSetlistsGrid.innerHTML = Array(3).fill(
        `<div class="lib-setlist-card" style="pointer-events:none;">
            <div class="lib-setlist-color lib-skeleton" style="background:none;"></div>
            <div class="lib-setlist-info">
                <div class="lib-skeleton" style="height:0.85rem;border-radius:4px;margin-bottom:0.3rem;"></div>
                <div class="lib-skeleton" style="height:0.65rem;width:50%;border-radius:4px;"></div>
            </div>
        </div>`
    ).join('');

    try {
        setlists = await API.obtenerSetlists();
        renderSetlists();
    } catch (_) {
        libSetlistsGrid.innerHTML = `<p style="color:var(--text3);font-size:0.85rem;">Error al cargar setlists.</p>`;
    }
}

function renderSetlists() {
    if (!setlists.length) {
        libSetlistsGrid.innerHTML = `<p style="color:var(--text3);font-size:0.85rem;">No hay setlists. Crea uno nuevo.</p>`;
        return;
    }
    libSetlistsGrid.innerHTML = setlists.map(sl => `
        <div class="lib-setlist-card${selectedSetlistId === sl.id ? ' selected' : ''}"
             data-action="selectsetlist" data-id="${sl.id}">
            <div class="lib-setlist-color" style="background:${esc(sl.color || '#667eea')};"></div>
            <div class="lib-setlist-info">
                <p class="lib-setlist-name">${esc(sl.nombre)}</p>
                <p class="lib-setlist-count">${sl.total_canciones || 0} canciones</p>
            </div>
            <button class="lib-row-btn danger" data-action="deletesetlist" data-id="${sl.id}" title="Eliminar setlist">✕</button>
        </div>`).join('');
}

function setupSetlistActions() {
    libSetlistsGrid?.addEventListener('click', e => {
        const deleteBtn = e.target.closest('[data-action="deletesetlist"]');
        if (deleteBtn) { e.stopPropagation(); deleteSetlist(parseInt(deleteBtn.dataset.id)); return; }
        const card = e.target.closest('[data-action="selectsetlist"]');
        if (card) selectSetlist(parseInt(card.dataset.id));
    });

    $('btnDeselectSetlist')?.addEventListener('click', () => {
        selectedSetlistId = null;
        libSetlistSongsHeader.style.display = 'none';
        libSongsList.innerHTML = '';
        renderSetlists();
    });
}

async function selectSetlist(id) {
    selectedSetlistId = id;
    const sl = setlists.find(s => s.id === id);
    libSetlistSongsTitle.textContent = sl ? sl.nombre : 'Setlist';
    libSetlistSongsHeader.style.display = 'flex';
    renderSetlists();
    await loadSongs();
}

async function deleteSetlist(id) {
    if (!confirm('¿Eliminar este setlist?')) return;
    try {
        await API.eliminarSetlist(id);
        if (selectedSetlistId === id) { selectedSetlistId = null; libSetlistSongsHeader.style.display = 'none'; libSongsList.innerHTML = ''; }
        notif('Setlist eliminado');
        await loadSetlists();
    } catch (err) { notif(err.message, true); }
}

async function removeFromSetlist(cancionId) {
    try {
        await API.eliminarDeSetlist(selectedSetlistId, cancionId);
        notif('Canción quitada del setlist');
        await loadSongs();
        setlists = await API.obtenerSetlists();
        renderSetlists();
    } catch (err) { notif(err.message, true); }
}

// ── Modals ─────────────────────────────────────────────────────
function openModal(modal) {
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
}
function closeModal(modal) {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
}

function setupModals() {
    // Edit
    $('libBtnCerrarEditar')?.addEventListener('click',  () => closeModal(modalEditar));
    $('libBtnCerrarEditar2')?.addEventListener('click', () => closeModal(modalEditar));
    modalEditar?.addEventListener('click', e => { if (e.target === modalEditar) closeModal(modalEditar); });
    $('libFormEditar')?.addEventListener('submit', submitEdit);

    // Delete
    $('libBtnCancelarDel')?.addEventListener('click',   () => closeModal(modalConfirmar));
    $('libBtnConfirmarDel')?.addEventListener('click',  confirmDelete);
    modalConfirmar?.addEventListener('click', e => { if (e.target === modalConfirmar) closeModal(modalConfirmar); });

    // New setlist
    $('btnNewSetlist')?.addEventListener('click', () => { $('libSetlistNombre').value = ''; $('libSetlistDesc').value = ''; openModal(modalSetlist); });
    $('libBtnCerrarSetlist')?.addEventListener('click', () => closeModal(modalSetlist));
    modalSetlist?.addEventListener('click', e => { if (e.target === modalSetlist) closeModal(modalSetlist); });
    $('libFormSetlist')?.addEventListener('submit', submitNewSetlist);

    // Add to setlist
    $('libBtnCerrarAddSetlist')?.addEventListener('click', () => closeModal(modalAddSetlist));
    modalAddSetlist?.addEventListener('click', e => { if (e.target === modalAddSetlist) closeModal(modalAddSetlist); });

    // ESC
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            [modalEditar, modalConfirmar, modalSetlist, modalAddSetlist]
                .filter(m => m?.classList.contains('open'))
                .forEach(closeModal);
        }
    });
}

// ── Edit ───────────────────────────────────────────────────────
function openEditModal(id) {
    const song = songs.find(s => s.id === id);
    if (!song) return;
    editingId = id;
    $('libEditCantautor').value  = song.cantautor;
    $('libEditNombre').value     = song.nombre;
    $('libEditTono').value       = song.tono_original || '';
    $('libEditBpm').value        = song.bpm || '';
    $('libEditEtiquetas').value  = (Array.isArray(song.etiquetas) ? song.etiquetas : []).join(', ');
    $('libEditNotas').value      = song.notas || '';
    $('libEditMsg').textContent  = '';
    openModal(modalEditar);
}

async function submitEdit(e) {
    e.preventDefault();
    if (!editingId) return;
    const btn = e.target.querySelector('[type=submit]');
    btn.disabled = true;
    try {
        await API.actualizar(editingId, {
            cantautor:    $('libEditCantautor').value.trim(),
            nombre:       $('libEditNombre').value.trim(),
            tonoOriginal: $('libEditTono').value,
            bpm:          $('libEditBpm').value || null,
            etiquetas:    $('libEditEtiquetas').value,
            notas:        $('libEditNotas').value.trim(),
        });
        closeModal(modalEditar);
        notif('Canción actualizada', false, true);
        await Promise.all([loadStats(), loadSongs()]);
    } catch (err) {
        $('libEditMsg').textContent = err.message;
    } finally { btn.disabled = false; }
}

// ── Delete ─────────────────────────────────────────────────────
function openDeleteModal(id) {
    const song = songs.find(s => s.id === id);
    if (!song) return;
    deletingId = id;
    $('libConfirmarNombre').textContent = `"${song.nombre}" de ${song.cantautor}`;
    openModal(modalConfirmar);
}

async function confirmDelete() {
    if (!deletingId) return;
    const btn = $('libBtnConfirmarDel');
    btn.disabled = true;
    try {
        await API.eliminar(deletingId);
        closeModal(modalConfirmar);
        notif('Canción eliminada');
        await Promise.all([loadStats(), loadSongs()]);
    } catch (err) { notif(err.message, true); }
    finally { btn.disabled = false; deletingId = null; }
}

// ── Add to setlist ─────────────────────────────────────────────
async function openAddToSetlistModal(id) {
    const song = songs.find(s => s.id === id);
    if (!song) return;
    addingToSetlistId = id;
    $('libAddSongName').textContent = song.nombre;
    $('libAddSetlistMsg').textContent = '';

    const pickList = $('libSetlistPickList');
    pickList.innerHTML = '<p style="color:var(--text3);font-size:0.85rem;">Cargando setlists…</p>';
    openModal(modalAddSetlist);

    try {
        const all = await API.obtenerSetlists();
        if (!all.length) {
            pickList.innerHTML = '<p style="color:var(--text3);font-size:0.85rem;">No hay setlists creados.</p>';
            return;
        }
        pickList.innerHTML = all.map(sl => `
            <button class="lib-setlist-pick-item" data-id="${sl.id}">
                <span class="lib-setlist-pick-dot" style="background:${esc(sl.color || '#667eea')};"></span>
                ${esc(sl.nombre)}
                <span style="margin-left:auto;color:var(--text3);font-size:0.75rem;">${sl.total_canciones || 0}</span>
            </button>`).join('');

        pickList.addEventListener('click', async e => {
            const btn = e.target.closest('.lib-setlist-pick-item');
            if (!btn) return;
            try {
                await API.agregarASetlist(parseInt(btn.dataset.id), addingToSetlistId);
                $('libAddSetlistMsg').textContent = '✓ Añadido';
                $('libAddSetlistMsg').style.color = 'var(--accent)';
                setTimeout(() => closeModal(modalAddSetlist), 800);
                notif('Añadido al setlist');
            } catch (err) {
                $('libAddSetlistMsg').textContent = err.message;
                $('libAddSetlistMsg').style.color = '#e55';
            }
        }, { once: true });
    } catch (err) {
        pickList.innerHTML = `<p style="color:#e55;font-size:0.85rem;">${err.message}</p>`;
    }
}

// ── New setlist ────────────────────────────────────────────────
async function submitNewSetlist(e) {
    e.preventDefault();
    const btn = e.target.querySelector('[type=submit]');
    btn.disabled = true;
    try {
        await API.crearSetlist({
            nombre:      $('libSetlistNombre').value.trim(),
            descripcion: $('libSetlistDesc').value.trim(),
        });
        closeModal(modalSetlist);
        notif('Setlist creado');
        await loadSetlists();
        await loadStats();
    } catch (err) {
        $('libSetlistMsg').textContent = err.message;
    } finally { btn.disabled = false; }
}

// ── Notification toast ─────────────────────────────────────────
let notifTimer = null;
function notif(msg, isError = false, isSuccess = false) {
    const el = document.createElement('div');
    el.className = `lib-notif${isError ? ' error' : isSuccess ? ' success' : ''}`;
    el.textContent = msg;
    document.body.appendChild(el);
    requestAnimationFrame(() => { requestAnimationFrame(() => el.classList.add('show')); });
    clearTimeout(notifTimer);
    notifTimer = setTimeout(() => {
        el.classList.remove('show');
        setTimeout(() => el.remove(), 300);
    }, 2800);
}

// ── Utilities ──────────────────────────────────────────────────
function esc(t) {
    const d = document.createElement('div');
    d.textContent = t ?? '';
    return d.innerHTML;
}

function tags(etiquetas, max = 4) {
    const arr = Array.isArray(etiquetas) ? etiquetas : [];
    return arr.slice(0, max).map(e => `<span class="lib-tag">${esc(e)}</span>`).join('');
}
