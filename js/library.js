import API from './api.js';

let cancionesActuales = [];
let cancionEnEdicion  = null;
let cancionAEliminar  = null;

// ── DOM refs ──────────────────────────────────────────
const seccionLib       = document.getElementById('seccionBiblioteca');
const btnOcultar       = document.getElementById('btnOcultarBiblioteca');
const listaCanciones   = document.getElementById('listaCanciones');

const inputBuscar  = document.getElementById('libBuscar');
const filtBpmMin   = document.getElementById('libBpmMin');
const filtBpmMax   = document.getElementById('libBpmMax');
const filtTono     = document.getElementById('libTono');
const btnLimpiar   = document.getElementById('libLimpiar');

const modalEditar      = document.getElementById('modalEditar');
const formEditar       = document.getElementById('formEditar');
const btnCerrarEditar  = document.getElementById('btnCerrarEditar');

const modalConfirmar   = document.getElementById('modalConfirmar');
const btnConfirmarDel  = document.getElementById('btnConfirmarEliminar');
const btnCancelarDel   = document.getElementById('btnCancelarEliminar');

// ── Cargar y renderizar ───────────────────────────────
async function cargarBiblioteca() {
    listaCanciones.innerHTML = '<p class="lib-loading">Cargando...</p>';
    try {
        cancionesActuales = await API.obtenerTodas();
        renderizarLista(cancionesActuales);
        actualizarStats(cancionesActuales);
    } catch {
        listaCanciones.innerHTML = '<p class="lib-loading">No se pudo conectar con el backend.</p>';
    }
}

function renderizarLista(canciones) {
    if (!canciones.length) {
        listaCanciones.innerHTML = `
            <div class="lib-empty">
                <p>No hay canciones guardadas.</p>
                <p>Transposa y guarda una canción para verla aquí.</p>
            </div>`;
        return;
    }
    listaCanciones.innerHTML = canciones.map(c => `
        <div class="lib-card">
            <div class="lib-card-top">
                <div>
                    <p class="lib-nombre">${esc(c.nombre)}</p>
                    <p class="lib-cantautor">por ${esc(c.cantautor)}</p>
                </div>
                <div class="lib-badges">
                    ${c.tono_original ? `<span class="lib-badge">${c.tono_original}</span>` : ''}
                    ${c.bpm           ? `<span class="lib-badge">${c.bpm} bpm</span>` : ''}
                </div>
            </div>
            ${c.etiquetas?.length ? `
                <div class="lib-tags">
                    ${c.etiquetas.map(e => `<span class="lib-tag">${esc(e)}</span>`).join('')}
                </div>` : ''}
            ${c.notas ? `<p class="lib-notas">${esc(c.notas)}</p>` : ''}
            <div class="lib-acciones">
                <button class="lib-btn lib-btn-edit"   onclick="window._libEditar(${c.id})">Editar</button>
                <button class="lib-btn lib-btn-delete" onclick="window._libEliminar(${c.id})">Eliminar</button>
            </div>
        </div>`).join('');
}

function actualizarStats(canciones) {
    document.getElementById('statTotal').textContent      = canciones.length;
    document.getElementById('statArtistas').textContent   = new Set(canciones.map(c => c.cantautor)).size;
    const bpms = canciones.map(c => c.bpm).filter(Boolean);
    document.getElementById('statBpm').textContent =
        bpms.length ? Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length) : '—';
}

// ── Filtros ────────────────────────────────────────────
function aplicarFiltros() {
    const q      = inputBuscar.value.toLowerCase();
    const bpmMin = parseInt(filtBpmMin.value) || 0;
    const bpmMax = parseInt(filtBpmMax.value) || Infinity;
    const tono   = filtTono.value;

    const filtrados = cancionesActuales.filter(c => {
        const texto = !q ||
            c.nombre.toLowerCase().includes(q) ||
            c.cantautor.toLowerCase().includes(q) ||
            (c.etiquetas || []).some(e => e.toLowerCase().includes(q));
        const bpm  = c.bpm >= bpmMin && c.bpm <= bpmMax;
        const tone = !tono || c.tono_original === tono;
        return texto && bpm && tone;
    });
    renderizarLista(filtrados);
}

inputBuscar.addEventListener('input',  aplicarFiltros);
filtBpmMin.addEventListener('change',  aplicarFiltros);
filtBpmMax.addEventListener('change',  aplicarFiltros);
filtTono.addEventListener('change',    aplicarFiltros);
btnLimpiar.addEventListener('click',   () => {
    inputBuscar.value = filtBpmMin.value = filtBpmMax.value = filtTono.value = '';
    aplicarFiltros();
});

// ── Modal editar ───────────────────────────────────────
window._libEditar = function(id) {
    cancionEnEdicion = cancionesActuales.find(c => c.id === id);
    if (!cancionEnEdicion) return;
    document.getElementById('editCantautor').value  = cancionEnEdicion.cantautor;
    document.getElementById('editNombre').value     = cancionEnEdicion.nombre;
    document.getElementById('editTono').value       = cancionEnEdicion.tono_original || '';
    document.getElementById('editBpm').value        = cancionEnEdicion.bpm || '';
    document.getElementById('editEtiquetas').value  = (cancionEnEdicion.etiquetas || []).join(', ');
    document.getElementById('editNotas').value      = cancionEnEdicion.notas || '';
    modalEditar.classList.add('open');
};

function cerrarEditar() {
    modalEditar.classList.remove('open');
    cancionEnEdicion = null;
    formEditar.reset();
}

formEditar.addEventListener('submit', async e => {
    e.preventDefault();
    if (!cancionEnEdicion) return;
    const btn = formEditar.querySelector('[type=submit]');
    btn.disabled = true;
    try {
        await API.actualizar(cancionEnEdicion.id, {
            cantautor:   document.getElementById('editCantautor').value.trim(),
            nombre:      document.getElementById('editNombre').value.trim(),
            tonoOriginal:document.getElementById('editTono').value,
            bpm:         document.getElementById('editBpm').value || null,
            etiquetas:   document.getElementById('editEtiquetas').value,
            notas:       document.getElementById('editNotas').value.trim()
        });
        notificar('Canción actualizada');
        cerrarEditar();
        await cargarBiblioteca();
    } catch (err) {
        notificar(err.message, true);
    } finally {
        btn.disabled = false;
    }
});

btnCerrarEditar.addEventListener('click', cerrarEditar);
document.getElementById('btnCerrarEditar2')?.addEventListener('click', cerrarEditar);
modalEditar.addEventListener('click', e => { if (e.target === modalEditar) cerrarEditar(); });

// ── Modal confirmar eliminar ───────────────────────────
window._libEliminar = function(id) {
    cancionAEliminar = cancionesActuales.find(c => c.id === id);
    if (!cancionAEliminar) return;
    document.getElementById('confirmarNombre').textContent =
        `"${cancionAEliminar.nombre}" de ${cancionAEliminar.cantautor}`;
    modalConfirmar.classList.add('open');
};

function cerrarConfirmar() {
    modalConfirmar.classList.remove('open');
    cancionAEliminar = null;
}

btnConfirmarDel.addEventListener('click', async () => {
    if (!cancionAEliminar) return;
    btnConfirmarDel.disabled = true;
    try {
        await API.eliminar(cancionAEliminar.id);
        notificar('Canción eliminada');
        cerrarConfirmar();
        await cargarBiblioteca();
    } catch (err) {
        notificar(err.message, true);
    } finally {
        btnConfirmarDel.disabled = false;
    }
});

btnCancelarDel.addEventListener('click', cerrarConfirmar);
modalConfirmar.addEventListener('click', e => { if (e.target === modalConfirmar) cerrarConfirmar(); });

// ESC cierra cualquier modal abierto
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { cerrarEditar(); cerrarConfirmar(); }
});

// ── Toggle sección ─────────────────────────────────────
export function toggleLibrary() {
    const visible = seccionLib.style.display !== 'none';
    if (visible) {
        seccionLib.style.display = 'none';
    } else {
        seccionLib.style.display = 'block';
        cargarBiblioteca();
    }
}

btnOcultar.addEventListener('click', () => {
    seccionLib.style.display = 'none';
});

// ── Utilidades ─────────────────────────────────────────
function esc(t) {
    const d = document.createElement('div');
    d.textContent = t || '';
    return d.innerHTML;
}

function notificar(msg, error = false) {
    const el = document.createElement('div');
    el.className = 'lib-notif' + (error ? ' lib-notif-error' : '');
    el.textContent = msg;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('lib-notif-show'));
    setTimeout(() => {
        el.classList.remove('lib-notif-show');
        setTimeout(() => el.remove(), 300);
    }, 3000);
}

export { cargarBiblioteca };
