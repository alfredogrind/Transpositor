# 🎨 FASE 5️⃣: UI/UX PARA GESTIÓN DE CANCIONES

**Duración:** 45 min
**Objetivo:** Agregar interfaz visual para ver, editar y borrar canciones
**Riesgo:** BAJO - Agregar nuevos elementos HTML/CSS/JS sin tocar lógica existente

---

## ¿QUÉ HAREMOS?

Actualmente:
- ❌ No se ve dónde están las canciones guardadas
- ❌ No hay botón para listarlas
- ❌ No hay forma de editarlas
- ❌ No hay forma de borrarlas

Después:
- ✅ Botón "Ver Canciones Guardadas"
- ✅ Lista con todas las canciones
- ✅ Botón "Editar" en cada canción
- ✅ Botón "Eliminar" en cada canción
- ✅ Modal para editar
- ✅ Confirmación antes de eliminar
- ✅ Búsqueda y filtros

---

## ESTRUCTURA ACTUAL vs NUEVA

### Antes (Fase 4)
```
Frontend
├── Formulario para agregar canción
└── (Nada para ver las guardadas)
```

### Después (Fase 5)
```
Frontend
├── Formulario para agregar canción
├── [NUEVO] Botón "Ver Canciones"
├── [NUEVO] Lista de canciones guardadas
│   ├── Búsqueda en tiempo real
│   ├── Filtros (BPM, tono, etc)
│   └── Para cada canción:
│       ├── Botón Editar
│       └── Botón Eliminar
├── [NUEVO] Modal para editar
└── [NUEVO] Confirmación para eliminar
```

---

## PASO 1: ACTUALIZAR HTML (frontend/index.html)

### 1.1 - Agregar botón para ver canciones

**BUSCA en tu `index.html` donde tengas el formulario de agregar canción**

**AGREGA DESPUÉS del formulario:**

```html
<!-- ============================================ -->
<!-- SECCIÓN: VER CANCIONES GUARDADAS -->
<!-- ============================================ -->

<div id="seccionCanciones" style="display: none;">
    <div class="canciones-container">
        <div class="canciones-header">
            <h2>🎵 Mis Canciones Guardadas</h2>
            <button id="btnOcultarLista" class="btn btn-secondary">
                Ocultar Lista
            </button>
        </div>

        <!-- Búsqueda y Filtros -->
        <div class="filtros-section">
            <input 
                type="text" 
                id="inputBuscar" 
                class="input-buscar" 
                placeholder="Buscar por cantautor, nombre, etiquetas..."
            >
            
            <div class="filtros-grupo">
                <input 
                    type="number" 
                    id="filtBpmMin" 
                    class="input-filtro" 
                    placeholder="BPM mín"
                    min="40"
                >
                <input 
                    type="number" 
                    id="filtBpmMax" 
                    class="input-filtro" 
                    placeholder="BPM máx"
                    max="300"
                >
                <select id="filtTono" class="input-filtro">
                    <option value="">Todos los tonos</option>
                    <option value="C">Do (C)</option>
                    <option value="C#">Do# (C#)</option>
                    <option value="D">Re (D)</option>
                    <option value="D#">Re# (D#)</option>
                    <option value="E">Mi (E)</option>
                    <option value="F">Fa (F)</option>
                    <option value="F#">Fa# (F#)</option>
                    <option value="G">Sol (G)</option>
                    <option value="G#">Sol# (G#)</option>
                    <option value="A">La (A)</option>
                    <option value="A#">La# (A#)</option>
                    <option value="B">Si (B)</option>
                </select>
                <button id="btnLimpiarFiltros" class="btn btn-secondary btn-small">
                    Limpiar filtros
                </button>
            </div>
        </div>

        <!-- Estadísticas -->
        <div id="statsContainer" class="stats-container">
            <div class="stat-item">
                <span class="stat-value" id="totalCanciones">0</span>
                <span class="stat-label">Canciones</span>
            </div>
            <div class="stat-item">
                <span class="stat-value" id="totalCantautores">0</span>
                <span class="stat-label">Cantautores</span>
            </div>
            <div class="stat-item">
                <span class="stat-value" id="promedioBpm">0</span>
                <span class="stat-label">BPM Promedio</span>
            </div>
        </div>

        <!-- Lista de canciones -->
        <div id="listaCanciones" class="lista-canciones">
            <!-- Se llenará con JavaScript -->
        </div>
    </div>
</div>

<!-- ============================================ -->
<!-- BOTÓN PARA MOSTRAR CANCIONES (siempre visible) -->
<!-- ============================================ -->

<div class="container-botones-principales">
    <button id="btnMostrarCanciones" class="btn btn-primary btn-grande">
        📋 Ver Canciones Guardadas
    </button>
</div>
```

### 1.2 - Agregar Modal para Editar

**AGREGA ANTES de cerrar `</body>`:**

```html
<!-- ============================================ -->
<!-- MODAL PARA EDITAR CANCIÓN -->
<!-- ============================================ -->

<div id="modalEditar" class="modal" style="display: none;">
    <div class="modal-contenido">
        <div class="modal-header">
            <h2>✏️ Editar Canción</h2>
            <button id="btnCerrarModal" class="btn-cerrar">&times;</button>
        </div>
        
        <form id="formEditar" class="form-editar">
            <div class="form-grupo">
                <label for="editCantautor">Cantautor *</label>
                <input 
                    type="text" 
                    id="editCantautor" 
                    required
                    placeholder="Nombre del artista"
                >
            </div>

            <div class="form-grupo">
                <label for="editNombre">Nombre de la canción *</label>
                <input 
                    type="text" 
                    id="editNombre" 
                    required
                    placeholder="Nombre de la canción"
                >
            </div>

            <div class="form-grupo">
                <label for="editTono">Tono original</label>
                <select id="editTono">
                    <option value="">Selecciona tono...</option>
                    <option value="C">Do (C)</option>
                    <option value="C#">Do# (C#)</option>
                    <option value="D">Re (D)</option>
                    <option value="D#">Re# (D#)</option>
                    <option value="E">Mi (E)</option>
                    <option value="F">Fa (F)</option>
                    <option value="F#">Fa# (F#)</option>
                    <option value="G">Sol (G)</option>
                    <option value="G#">Sol# (G#)</option>
                    <option value="A">La (A)</option>
                    <option value="A#">La# (A#)</option>
                    <option value="B">Si (B)</option>
                </select>
            </div>

            <div class="form-grupo">
                <label for="editBpm">BPM</label>
                <input 
                    type="number" 
                    id="editBpm"
                    placeholder="ej: 120"
                    min="40"
                    max="300"
                >
            </div>

            <div class="form-grupo">
                <label for="editEtiquetas">Etiquetas (separadas por coma)</label>
                <input 
                    type="text" 
                    id="editEtiquetas"
                    placeholder="ej: bachata, romántica, clásica"
                >
            </div>

            <div class="form-grupo">
                <label for="editNotas">Notas adicionales</label>
                <textarea 
                    id="editNotas"
                    placeholder="Acordes, estructura, variaciones..."
                    rows="3"
                ></textarea>
            </div>

            <div class="modal-acciones">
                <button type="submit" class="btn btn-success">
                    💾 Guardar cambios
                </button>
                <button type="button" id="btnCancelarModal" class="btn btn-secondary">
                    Cancelar
                </button>
            </div>
        </form>
    </div>
</div>

<!-- ============================================ -->
<!-- MODAL DE CONFIRMACIÓN PARA ELIMINAR -->
<!-- ============================================ -->

<div id="modalConfirmar" class="modal modal-confirmacion" style="display: none;">
    <div class="modal-contenido modal-pequeno">
        <div class="modal-header">
            <h2>⚠️ Confirmar eliminación</h2>
        </div>
        
        <div class="modal-body">
            <p id="msgConfirmacion">¿Estás seguro de que quieres eliminar esta canción?</p>
            <p id="nombreCancionEliminar" class="cancion-nombre-eliminar"></p>
        </div>

        <div class="modal-acciones">
            <button id="btnConfirmarEliminar" class="btn btn-danger">
                🗑️ Sí, eliminar
            </button>
            <button id="btnCancelarEliminar" class="btn btn-secondary">
                Cancelar
            </button>
        </div>
    </div>
</div>
```

---

## PASO 2: ACTUALIZAR CSS (frontend/css/styles.css)

**AGREGA AL FINAL de tu archivo `styles.css`:**

```css
/* ============================================
   SECCIÓN: CANCIONES GUARDADAS
   ============================================ */

.container-botones-principales {
    display: flex;
    justify-content: center;
    gap: 15px;
    padding: 20px;
    margin: 20px 0;
    flex-wrap: wrap;
}

.btn-grande {
    padding: 15px 30px;
    font-size: 1.1em;
    min-width: 250px;
}

#seccionCanciones {
    animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
    from {
        opacity: 0;
        transform: translateY(-20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* ============================================
   HEADER DE CANCIONES
   ============================================ */

.canciones-container {
    background: white;
    border-radius: 12px;
    padding: 25px;
    margin: 20px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.canciones-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 25px;
    padding-bottom: 15px;
    border-bottom: 2px solid #f0f0f0;
}

.canciones-header h2 {
    font-size: 1.8em;
    color: #333;
    margin: 0;
}

/* ============================================
   FILTROS Y BÚSQUEDA
   ============================================ */

.filtros-section {
    background: #f8f9fa;
    padding: 20px;
    border-radius: 8px;
    margin-bottom: 20px;
    border-left: 4px solid #667eea;
}

.input-buscar {
    width: 100%;
    padding: 12px 15px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 1em;
    margin-bottom: 15px;
    transition: border-color 0.3s;
}

.input-buscar:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.filtros-grupo {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 10px;
}

.input-filtro {
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 0.95em;
    transition: border-color 0.3s;
}

.input-filtro:focus {
    outline: none;
    border-color: #667eea;
}

.btn-small {
    padding: 10px 16px;
    font-size: 0.9em;
}

/* ============================================
   ESTADÍSTICAS
   ============================================ */

.stats-container {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 15px;
    margin-bottom: 25px;
}

.stat-item {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 20px;
    border-radius: 8px;
    text-align: center;
    box-shadow: 0 4px 6px rgba(102, 126, 234, 0.2);
}

.stat-value {
    display: block;
    font-size: 2.5em;
    font-weight: bold;
    margin-bottom: 5px;
}

.stat-label {
    display: block;
    font-size: 0.95em;
    opacity: 0.9;
}

/* ============================================
   LISTA DE CANCIONES
   ============================================ */

.lista-canciones {
    display: grid;
    gap: 15px;
    animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
}

.cancion-tarjeta {
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 18px;
    transition: all 0.3s ease;
    cursor: default;
}

.cancion-tarjeta:hover {
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
    border-color: #667eea;
    transform: translateY(-2px);
}

.cancion-tarjeta-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 12px;
}

.cancion-titulo {
    font-size: 1.3em;
    font-weight: bold;
    color: #667eea;
    margin: 0;
}

.cancion-cantautor {
    font-size: 0.95em;
    color: #666;
    font-style: italic;
    margin: 5px 0 0 0;
}

.cancion-info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 12px;
    margin-bottom: 12px;
    padding: 12px 0;
    border-top: 1px solid #f0f0f0;
    border-bottom: 1px solid #f0f0f0;
}

.cancion-info-item {
    font-size: 0.9em;
    color: #555;
}

.cancion-info-label {
    display: block;
    font-weight: 600;
    color: #333;
    margin-bottom: 3px;
}

.cancion-info-valor {
    display: block;
    color: #666;
}

.cancion-etiquetas {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 12px;
}

.etiqueta {
    background: #e9ecef;
    color: #495057;
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 0.85em;
    font-weight: 500;
}

.etiqueta:hover {
    background: #dee2e6;
}

.cancion-notas {
    background: #f8f9fa;
    padding: 10px 12px;
    border-radius: 6px;
    margin-bottom: 12px;
    border-left: 3px solid #667eea;
    font-size: 0.9em;
    color: #555;
}

.cancion-acciones {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    padding-top: 12px;
    border-top: 1px solid #f0f0f0;
}

.btn-accion {
    padding: 8px 16px;
    font-size: 0.9em;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
    font-weight: 500;
}

.btn-editar {
    background: #17a2b8;
    color: white;
}

.btn-editar:hover {
    background: #138496;
    transform: translateY(-1px);
}

.btn-eliminar {
    background: #dc3545;
    color: white;
}

.btn-eliminar:hover {
    background: #c82333;
    transform: translateY(-1px);
}

.cancion-vacia {
    text-align: center;
    padding: 40px 20px;
    color: #999;
    font-size: 1.1em;
}

/* ============================================
   MODALES
   ============================================ */

.modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.3s ease-out;
}

.modal-contenido {
    background: white;
    border-radius: 12px;
    padding: 0;
    max-width: 500px;
    width: 90%;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
    animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
    from {
        opacity: 0;
        transform: translateY(30px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid #f0f0f0;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
}

.modal-header h2 {
    margin: 0;
    font-size: 1.5em;
}

.btn-cerrar {
    background: none;
    border: none;
    font-size: 1.8em;
    cursor: pointer;
    color: white;
    padding: 0;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.2s;
}

.btn-cerrar:hover {
    transform: scale(1.2);
}

.form-editar {
    padding: 20px;
}

.form-grupo {
    margin-bottom: 15px;
}

.form-grupo label {
    display: block;
    margin-bottom: 6px;
    font-weight: 600;
    color: #333;
    font-size: 0.95em;
}

.form-grupo input,
.form-grupo select,
.form-grupo textarea {
    width: 100%;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 0.95em;
    font-family: inherit;
    transition: border-color 0.3s;
}

.form-grupo input:focus,
.form-grupo select:focus,
.form-grupo textarea:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-grupo textarea {
    resize: vertical;
    min-height: 100px;
}

.modal-acciones {
    display: flex;
    gap: 10px;
    padding: 20px;
    border-top: 1px solid #f0f0f0;
    background: #f8f9fa;
}

.btn-success {
    background: #28a745;
}

.btn-success:hover {
    background: #218838;
}

.btn-danger {
    background: #dc3545;
}

.btn-danger:hover {
    background: #c82333;
}

/* Modal de confirmación pequeño */
.modal-pequeno {
    max-width: 400px;
}

.modal-body {
    padding: 20px;
    text-align: center;
}

.modal-body p {
    margin: 10px 0;
    font-size: 1em;
    color: #555;
}

.cancion-nombre-eliminar {
    font-size: 1.2em;
    font-weight: bold;
    color: #667eea;
    margin-top: 15px !important;
}

.modal-confirmacion .modal-acciones {
    justify-content: center;
}

/* ============================================
   RESPONSIVE
   ============================================ */

@media (max-width: 768px) {
    .canciones-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 15px;
    }

    .canciones-header h2 {
        font-size: 1.4em;
    }

    .filtros-grupo {
        grid-template-columns: 1fr;
    }

    .cancion-info-grid {
        grid-template-columns: 1fr;
    }

    .cancion-acciones {
        flex-direction: column;
    }

    .btn-accion {
        width: 100%;
        text-align: center;
    }

    .modal-contenido {
        width: 95%;
        max-height: 95vh;
    }

    .stats-container {
        grid-template-columns: 1fr;
    }

    .container-botones-principales {
        flex-direction: column;
    }

    .btn-grande {
        width: 100%;
    }
}
```

---

## PASO 3: ACTUALIZAR JAVASCRIPT (frontend/js/ui.js)

**CREA O ACTUALIZA `frontend/js/ui.js` CON:**

```javascript
// ============================================
// GESTOR DE UI - CANCIONES
// ============================================

let cancionesActuales = [];
let cancionEnEdicion = null;

// ============================================
// ELEMENTOS DEL DOM
// ============================================

const btnMostrarCanciones = document.getElementById('btnMostrarCanciones');
const btnOcultarLista = document.getElementById('btnOcultarLista');
const seccionCanciones = document.getElementById('seccionCanciones');
const listaCanciones = document.getElementById('listaCanciones');

const inputBuscar = document.getElementById('inputBuscar');
const filtBpmMin = document.getElementById('filtBpmMin');
const filtBpmMax = document.getElementById('filtBpmMax');
const filtTono = document.getElementById('filtTono');
const btnLimpiarFiltros = document.getElementById('btnLimpiarFiltros');

const modalEditar = document.getElementById('modalEditar');
const formEditar = document.getElementById('formEditar');
const btnCerrarModal = document.getElementById('btnCerrarModal');
const btnCancelarModal = document.getElementById('btnCancelarModal');

const modalConfirmar = document.getElementById('modalConfirmar');
const btnConfirmarEliminar = document.getElementById('btnConfirmarEliminar');
const btnCancelarEliminar = document.getElementById('btnCancelarEliminar');

// ============================================
// FUNCIONES DE CARGA
// ============================================

async function cargarCanciones() {
    try {
        cancionesActuales = await API.obtenerTodas();
        renderizarCanciones(cancionesActuales);
        actualizarEstadisticas(cancionesActuales);
    } catch (error) {
        console.error('Error al cargar canciones:', error);
        mostrarNotificacion('Error al cargar canciones', 'error');
    }
}

// ============================================
// RENDERIZAR CANCIONES
// ============================================

function renderizarCanciones(canciones) {
    listaCanciones.innerHTML = '';

    if (!canciones || canciones.length === 0) {
        listaCanciones.innerHTML = `
            <div class="cancion-vacia">
                <p>📭 No hay canciones guardadas</p>
                <p style="font-size: 0.9em; color: #bbb;">
                    Agrega una canción desde el formulario para que aparezca aquí
                </p>
            </div>
        `;
        return;
    }

    const html = canciones.map(cancion => `
        <div class="cancion-tarjeta" data-id="${cancion.id}">
            <div class="cancion-tarjeta-header">
                <div>
                    <h3 class="cancion-titulo">${escaparHTML(cancion.nombre)}</h3>
                    <p class="cancion-cantautor">por ${escaparHTML(cancion.cantautor)}</p>
                </div>
            </div>

            <div class="cancion-info-grid">
                ${cancion.tono_original ? `
                    <div class="cancion-info-item">
                        <span class="cancion-info-label">🎹 Tono</span>
                        <span class="cancion-info-valor">${cancion.tono_original}</span>
                    </div>
                ` : ''}

                ${cancion.bpm ? `
                    <div class="cancion-info-item">
                        <span class="cancion-info-label">⏱️ BPM</span>
                        <span class="cancion-info-valor">${cancion.bpm}</span>
                    </div>
                ` : ''}

                <div class="cancion-info-item">
                    <span class="cancion-info-label">📅 Guardada</span>
                    <span class="cancion-info-valor">
                        ${formatearFecha(cancion.created_at)}
                    </span>
                </div>
            </div>

            ${cancion.etiquetas && cancion.etiquetas.length > 0 ? `
                <div class="cancion-etiquetas">
                    ${cancion.etiquetas.map(etiqueta => 
                        `<span class="etiqueta">${escaparHTML(etiqueta)}</span>`
                    ).join('')}
                </div>
            ` : ''}

            ${cancion.notas ? `
                <div class="cancion-notas">
                    <strong>Notas:</strong> ${escaparHTML(cancion.notas)}
                </div>
            ` : ''}

            <div class="cancion-acciones">
                <button class="btn-accion btn-editar" onclick="abrirEditar(${cancion.id})">
                    ✏️ Editar
                </button>
                <button class="btn-accion btn-eliminar" onclick="abrirConfirmarEliminar(${cancion.id})">
                    🗑️ Eliminar
                </button>
            </div>
        </div>
    `).join('');

    listaCanciones.innerHTML = html;
}

// ============================================
// BÚSQUEDA Y FILTROS
// ============================================

function filtrarCanciones() {
    const termino = inputBuscar.value.toLowerCase();
    const bpmMin = parseInt(filtBpmMin.value) || 0;
    const bpmMax = parseInt(filtBpmMax.value) || Infinity;
    const tono = filtTono.value;

    const filtrados = cancionesActuales.filter(cancion => {
        // Búsqueda por texto
        const coincideTexto = !termino || 
            cancion.nombre.toLowerCase().includes(termino) ||
            cancion.cantautor.toLowerCase().includes(termino) ||
            (cancion.etiquetas && cancion.etiquetas.some(e => 
                e.toLowerCase().includes(termino)
            ));

        // Filtro BPM
        const coincideBpm = cancion.bpm >= bpmMin && cancion.bpm <= bpmMax;

        // Filtro tono
        const coincideTono = !tono || cancion.tono_original === tono;

        return coincideTexto && coincideBpm && coincideTono;
    });

    renderizarCanciones(filtrados);
}

// ============================================
// ESTADÍSTICAS
// ============================================

function actualizarEstadisticas(canciones) {
    const total = canciones.length;
    const cantautores = new Set(canciones.map(c => c.cantautor)).size;
    
    let promedioBpm = 0;
    if (canciones.length > 0) {
        const sumaBpm = canciones.reduce((sum, c) => sum + (c.bpm || 0), 0);
        promedioBpm = Math.round(sumaBpm / canciones.length);
    }

    document.getElementById('totalCanciones').textContent = total;
    document.getElementById('totalCantautores').textContent = cantautores;
    document.getElementById('promedioBpm').textContent = promedioBpm || '-';
}

// ============================================
// MODAL EDITAR
// ============================================

function abrirEditar(id) {
    cancionEnEdicion = cancionesActuales.find(c => c.id === id);
    
    if (!cancionEnEdicion) {
        mostrarNotificacion('Canción no encontrada', 'error');
        return;
    }

    // Llenar formulario
    document.getElementById('editCantautor').value = cancionEnEdicion.cantautor;
    document.getElementById('editNombre').value = cancionEnEdicion.nombre;
    document.getElementById('editTono').value = cancionEnEdicion.tono_original || '';
    document.getElementById('editBpm').value = cancionEnEdicion.bpm || '';
    document.getElementById('editEtiquetas').value = 
        (cancionEnEdicion.etiquetas || []).join(', ');
    document.getElementById('editNotas').value = cancionEnEdicion.notas || '';

    // Mostrar modal
    modalEditar.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Prevenir scroll
}

function cerrarModalEditar() {
    modalEditar.style.display = 'none';
    document.body.style.overflow = 'auto';
    cancionEnEdicion = null;
    formEditar.reset();
}

// ============================================
// GUARDAR CAMBIOS
// ============================================

formEditar.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!cancionEnEdicion) return;

    const datosActualizados = {
        cantautor: document.getElementById('editCantautor').value.trim(),
        nombre: document.getElementById('editNombre').value.trim(),
        tonoOriginal: document.getElementById('editTono').value,
        bpm: parseInt(document.getElementById('editBpm').value) || null,
        etiquetas: document.getElementById('editEtiquetas').value
            .split(',')
            .map(e => e.trim())
            .filter(e => e),
        notas: document.getElementById('editNotas').value.trim()
    };

    try {
        await API.actualizar(cancionEnEdicion.id, datosActualizados);
        mostrarNotificacion('✅ Canción actualizada correctamente', 'success');
        cerrarModalEditar();
        await cargarCanciones();
        filtrarCanciones(); // Mantener filtros aplicados
    } catch (error) {
        console.error('Error al actualizar:', error);
        mostrarNotificacion(`❌ ${error.message}`, 'error');
    }
});

// ============================================
// MODAL CONFIRMAR ELIMINAR
// ============================================

let cancionParaEliminar = null;

function abrirConfirmarEliminar(id) {
    cancionParaEliminar = cancionesActuales.find(c => c.id === id);
    
    if (!cancionParaEliminar) return;

    document.getElementById('nombreCancionEliminar').textContent = 
        `"${escaparHTML(cancionParaEliminar.nombre)}" de ${escaparHTML(cancionParaEliminar.cantautor)}`;
    
    modalConfirmar.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function cerrarModalConfirmar() {
    modalConfirmar.style.display = 'none';
    document.body.style.overflow = 'auto';
    cancionParaEliminar = null;
}

btnConfirmarEliminar.addEventListener('click', async () => {
    if (!cancionParaEliminar) return;

    try {
        await API.eliminar(cancionParaEliminar.id);
        mostrarNotificacion('✅ Canción eliminada correctamente', 'success');
        cerrarModalConfirmar();
        await cargarCanciones();
        filtrarCanciones();
    } catch (error) {
        console.error('Error al eliminar:', error);
        mostrarNotificacion(`❌ ${error.message}`, 'error');
    }
});

// ============================================
// EVENT LISTENERS
// ============================================

// Botones mostrar/ocultar
btnMostrarCanciones.addEventListener('click', () => {
    seccionCanciones.style.display = 'block';
    cargarCanciones();
    btnMostrarCanciones.style.display = 'none';
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

btnOcultarLista.addEventListener('click', () => {
    seccionCanciones.style.display = 'none';
    btnMostrarCanciones.style.display = 'block';
});

// Búsqueda y filtros en tiempo real
inputBuscar.addEventListener('input', filtrarCanciones);
filtBpmMin.addEventListener('change', filtrarCanciones);
filtBpmMax.addEventListener('change', filtrarCanciones);
filtTono.addEventListener('change', filtrarCanciones);

btnLimpiarFiltros.addEventListener('click', () => {
    inputBuscar.value = '';
    filtBpmMin.value = '';
    filtBpmMax.value = '';
    filtTono.value = '';
    filtrarCanciones();
});

// Modal editar
btnCerrarModal.addEventListener('click', cerrarModalEditar);
btnCancelarModal.addEventListener('click', cerrarModalEditar);

// Modal confirmar
btnCancelarEliminar.addEventListener('click', cerrarModalConfirmar);

// Cerrar modal al clickear fuera
[modalEditar, modalConfirmar].forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            if (modal === modalEditar) cerrarModalEditar();
            if (modal === modalConfirmar) cerrarModalConfirmar();
        }
    });
});

// Tecla ESC para cerrar modales
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        cerrarModalEditar();
        cerrarModalConfirmar();
    }
});

// ============================================
// FUNCIONES AUXILIARES
// ============================================

function escaparHTML(texto) {
    const div = document.createElement('div');
    div.textContent = texto;
    return div.innerHTML;
}

function formatearFecha(fechaISO) {
    const fecha = new Date(fechaISO);
    return fecha.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function mostrarNotificacion(mensaje, tipo = 'success') {
    // Si tu app ya tiene un sistema de notificaciones, úsalo
    // Si no, crea uno simple:
    const div = document.createElement('div');
    div.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${tipo === 'success' ? '#28a745' : '#dc3545'};
        color: white;
        border-radius: 6px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideInRight 0.3s ease-out;
    `;
    div.textContent = mensaje;
    document.body.appendChild(div);

    setTimeout(() => {
        div.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => div.remove(), 300);
    }, 3000);
}
```

---

## PASO 4: ACTUALIZAR index.html (Importar ui.js)

**VERIFICA que en tu `index.html` tienes estos scripts al final (antes de `</body>`):**

```html
<script src="js/api.js"></script>
<script src="js/ui.js"></script>
<script src="js/main.js"></script>
<script src="js/music.js"></script>
<script src="js/ocr.js"></script>
<script src="js/template.js"></script>
```

**ORDEN IMPORTANTE:**
1. `api.js` - Define clase API
2. `ui.js` - Funciones de UI
3. Tus scripts existentes

---

## PASO 5: CONECTAR CON TU FORMULARIO ACTUAL

**En tu `main.js`, DESPUÉS de agregar una canción, agrega esto:**

```javascript
// Después de guardar una canción exitosamente:

async function guardarCancion(datos) {
    try {
        await API.crear(datos);
        mostrarNotificacion('✅ Canción guardada correctamente', 'success');
        // Recargar lista si está visible
        if (document.getElementById('seccionCanciones').style.display !== 'none') {
            await cargarCanciones();
        }
        // Limpiar formulario
        document.getElementById('miFormulario').reset();
    } catch (error) {
        mostrarNotificacion(`❌ ${error.message}`, 'error');
    }
}
```

---

## ✅ FASE 5 - CHECKLIST

```
[ ] Agregar HTML (botones, modales, lista)
[ ] Agregar CSS (estilos de tarjetas, modales, filtros)
[ ] Crear/actualizar ui.js con todas las funciones
[ ] Verificar orden de scripts en index.html
[ ] Backend ejecutándose: npm start
[ ] Frontend ejecutándose: python -m http.server 5000
[ ] Abrir http://localhost:5000/index.html
[ ] Click "Ver Canciones Guardadas" → muestra lista
[ ] Agregar nueva canción → aparece en lista
[ ] Click "Editar" → abre modal
[ ] Cambiar datos → click "Guardar" → se actualiza
[ ] Click "Eliminar" → pide confirmación
[ ] Confirmar → se elimina de la lista y BD
[ ] Búsqueda en tiempo real → funciona
[ ] Filtros (BPM, tono) → funcionan
[ ] Stats (total, cantautores, BPM promedio) → se actualizan
[ ] Responsivo en móvil → se ve bien
```

---

## 🧪 TEST COMPLETO

**Caso 1: Crear y listar**
1. Llenar formulario con una canción
2. Click "Guardar"
3. Click "Ver Canciones Guardadas"
4. Debe aparecer en la lista

**Caso 2: Editar**
1. Click "Editar" en una canción
2. Cambiar datos
3. Click "Guardar cambios"
4. Debe actualizar en lista y BD

**Caso 3: Eliminar**
1. Click "Eliminar"
2. Confirmar
3. Debe desaparecer de lista y BD

**Caso 4: Búsqueda**
1. Escribir en buscar
2. Lista se filtra en tiempo real

**Caso 5: Filtros**
1. Cambiar BPM min/max
2. Cambiar tonalidad
3. Lista se filtra correctamente

---

## 📊 ESTRUCTURA NUEVA

```
Tu App
├── Formulario (existente)
├── [NUEVO] Botón "Ver Canciones"
│   └── Si activo:
│       ├── Búsqueda en tiempo real
│       ├── Filtros avanzados
│       ├── Estadísticas
│       ├── Lista de canciones
│       │   ├── Editar (modal)
│       │   └── Eliminar (confirmación)
│       └── Botón ocultar
└── [NUEVO] Modales
    ├── Modal editar
    └── Modal confirmar eliminar
```

---

## 🎨 FEATURES IMPLEMENTADOS

✅ Listar todas las canciones guardadas
✅ Búsqueda en tiempo real
✅ Filtros por BPM, tono
✅ Estadísticas (total, cantautores, promedio)
✅ Modal para editar
✅ Modal de confirmación para eliminar
✅ Animaciones suaves
✅ Responsive (mobile/desktop)
✅ Manejo de errores
✅ Notificaciones visuales

---

## 💡 MEJORAS FUTURAS (Fase 6+)

- [ ] Exportar canciones (CSV, JSON)
- [ ] Importar canciones
- [ ] Ordenar por (nombre, cantautor, fecha, BPM)
- [ ] Vista en grid/tabla
- [ ] Dark mode
- [ ] Favoritos
- [ ] Compartir canciones
- [ ] Historial de cambios

---

## 📝 INSTRUCCIONES PARA CLAUDE CODE

Copia este contexto completo y:

```
"Implementa la Fase 5 en mi app:

1. Actualizar index.html (agregar botones, modales, lista)
2. Agregar estilos CSS (tarjetas, modales, filtros)
3. Crear/actualizar ui.js (funciones CRUD UI)
4. Verificar que funcione con API existente

Mantén mi código actual intacto, solo agrega nuevos elementos."
```

---

¡Listo! Frontend completo para gestión de canciones. 🎵
