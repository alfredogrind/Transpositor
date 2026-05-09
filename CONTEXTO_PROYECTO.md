# Transpositor Modular Pro — Contexto del Proyecto

> Actualizado: 2026-05-04

---

## Descripción General

App web llamada **Transpositor Modular Pro** con diseño Apple (dark mode por defecto). Permite a músicos escanear partituras/cifras con OCR y transponer acordes a cualquier tonalidad, con opción de ver en notación clásica o por grados. Incluye biblioteca de canciones persistida en SQLite con página propia.

**Stack:** HTML + CSS vanilla + JS modular (ES modules), sin framework.  
**Servidor:** Node.js + Express en puerto 3000. Sirve archivos estáticos desde `../` (raíz del proyecto).

---

## Archivos del Proyecto

```
index.html            — Transpositor principal
library.html          — Página dedicada a la biblioteca
manifest.json         — PWA manifest
vercel.json           — Config de despliegue

css/styles.css        — Design system Apple (variables, glassmorphism, animaciones)
css/library.css       — Estilos exclusivos de library.html

js/main.js            — Orquestador principal (index.html)
js/music.js           — Lógica musical pura
js/ui.js              — Rendering, temas, SFM, createTagEditor
js/api.js             — Cliente HTTP → backend (clase API estática)
js/library.js         — (legacy) modal de biblioteca, importado por main.js
js/library-page.js    — Controlador completo de library.html
js/ocr.js             — OCR con Tesseract.js + conversión PDF con PDF.js
js/template.js        — Generar/parsear plantillas .txt/.csv/.json

backend/
  server.js           — Entry point; CORS, rate limit, rutas, static
  database.js         — initDB() con better-sqlite3
  routes/canciones.js
  routes/setlists.js
  routes/favoritos.js
  middleware/errorHandler.js
  middleware/validation.js
```

- `library.js` NO tiene `<script>` propio en index.html — lo importa `main.js`.
- `library-page.js` se carga solo en `library.html`.

---

## Librerías Externas (CDN)

| Librería | Versión | Uso |
|---|---|---|
| Tesseract.js | v5 | OCR para imágenes |
| PDF.js | 3.4.120 | Convierte PDF a imágenes para OCR |
| Tonal.js | latest | Transposición, enarmónicos, análisis de acordes |

---

## Sistema de Diseño (css/styles.css)

Variables CSS en `:root` (dark) y `body.light-mode` (light):

```css
--bg, --surface, --surface2, --border
--accent: #c8a96e  /* dorado — cambia con paletas */
--text, --text2, --text3
--radius: 28px
--card-shadow, --transition, --accent-glow
```

**Paletas** (`data-palette` en `<body>`):

| Índice | Nombre | Color accent |
|---|---|---|
| 0 | Starlight | `#c8a96e` |
| 1 | Artic | `rgb(96, 165, 250)` |
| 2 | Ambar Solar | `rgb(251, 146, 60)` |
| 3 | Menta Zen | `rgb(74, 222, 128)` |

**Tamaños de acorde** (`data-chord-size` en `<html>`): `xs`, `sm`, *(default)*, `lg`, `xl`.

---

## Estado Global (js/main.js)

```js
let songData           = [];
let targetKey          = null;
let detectedKey        = null;
let lastTransposedData = null;
let notationMode       = 'classic';   // 'classic' | 'degrees'
let tagEditor          = null;        // instancia de ui.createTagEditor()
```

---

## Flujo Principal (index.html)

1. **Upload** → separa media (OCR) de plantillas (`.txt` / `.csv` / `.json`)
2. **Escanear** → OCR/parse → `songData`; resetea `lastTransposedData`; desactiva SFM "Guardar"
3. `refreshUI()` → detecta tonalidad (KS) → renderiza secciones con drag & drop → grid de tonos
4. Usuario selecciona `targetKey`
5. **Transponer** → genera `lastTransposedData` → renderiza → activa SFM "Guardar"
6. **Guardar** (SFM) → abre `#savePanelOverlay` → `API.crear()`
7. **Biblioteca** (SFM) → navega a `library.html` con transición de página
8. **Setlist** (SFM) → abre `#setlistPopupOverlay` inline sin salir de la página

### Carga de canción desde la biblioteca

- `loadPendingSong()` en `DOMContentLoaded` — lee `localStorage('pendingSongId')`, lo borra, llama `loadSongById(id)`
- `loadSongById(id)` — carga canción desde API, parsea `letra_acordes` → `songData`, llama `refreshUI()`, muestra toast

---

## Panel de Guardado (`#savePanelOverlay`)

Overlay glassmorphism siempre en el DOM, visible/oculto con `.open`.

```
#saveNombre     — texto, obligatorio
#saveCantautor  — texto, obligatorio
#saveBpm        — type="text" inputmode="numeric" maxlength="3"
                  Validación JS: solo dígitos, máx 3
#spTagEditor    — chip editor (--i:3)
  #spTagChips   — chips con color dot
  #spTagInput   — input transparente
#saveEtiquetas  — type="hidden" (poblado por createTagEditor)
#saveNotas      — textarea
```

Tag editor instanciado con `ui.createTagEditor(chipsEl, inputEl, hiddenEl)`.  
Comparte `localStorage('tagColors')` con `library-page.js`. Se resetea en cada apertura.

---

## Smart Floating Menu (SFM)

Presente en `index.html` y `library.html`. Posición: `bottom: 20px; right: 20px`. Trigger `+` → `×`.

### Ítems en index.html (orden DOM, aparecen de abajo a arriba)

| ID | Icono | Acción | Estado |
|---|---|---|---|
| `#sfmPersonalizar` | ◉ | Abre `#personalizarPanel` | Siempre activo |
| `#sfmOpenSetlist` | ≡ | `openSetlistPopup()` | Siempre activo |
| `#sfmOpenLibrary` | ♫ | Navega a `library.html` | Siempre activo |
| `#sfmSaveScan` | ⊕ | `scrollToOrShowSavePanel()` | Inactivo hasta tener `lastTransposedData` |

### Ítems en library.html

| ID | Icono | Acción |
|---|---|---|
| `#sfmPersonalizar` | ◉ | Abre `#personalizarPanel` |

**API de ui.js:**
- `initSFM(onOpenLibrary?, onSaveScan?, onOpenSetlist?)` — callbacks opcionales
- `updateSFMSaveState(hasData)` — toggle `.sfm-item--inactive` en `#sfmSaveScan`

---

## Panel de Personalización (`#personalizarPanel`)

`.personalizar-panel`, `position: fixed; bottom: 90px; right: 20px`.  
Togglado por `#sfmPersonalizar`. Cierra con clic fuera o Escape.

### Filas del panel

**Tema** — `.pers-theme-modes`:
- `#themeDark` (`.pers-theme-mode`) — activa dark mode
- `#themeLight` (`.pers-theme-mode`) — activa light mode
- `syncThemeBtns()` gestiona el estado `.active`

> ⚠️ El antiguo `#themeToggle` (toggle único) fue eliminado y reemplazado por estos dos botones separados.

**Paleta** — `#sfmPaletteRow` (`.pers-swatches`) — 4 botones `.pers-swatch` generados por `initTheme()`

**Texto** — `#sfmSizeRow` (`.pers-sizes`) — 5 botones `.pers-size-btn` generados por `initTheme()`

---

## Setlist Popup (index.html)

Overlay `#setlistPopupOverlay` (`.setlist-popup-overlay`) + tarjeta `#setlistPopupCard`.  
Permite explorar setlists y abrir canciones **sin salir de index.html**.

### Funciones en main.js

```
initSetlistPopup()          — registra listeners (close, back, overlay click, Escape)
openSetlistPopup()          — muestra overlay + llama showSetlistList()
showSetlistList()           — carga setlists desde API, renderiza .sl-pick-card
showSetlistSongs(id, sets)  — carga canciones, renderiza .sl-song-row
                              Clic → closeSetlistPopup() + loadSongById(id)
```

### Header del popup

| Elemento | ID | Descripción |
|---|---|---|
| Botón ‹ | `#setlistPopupBack` | Volver a la lista (visibility:hidden en vista lista) |
| Título | `#setlistPopupTitle` | "Setlists" o nombre del setlist activo |
| Botón ✕ | `#setlistPopupClose` | Cerrar |

---

## Transición de Página

`#pageTransitionOverlay` (`.page-transition-overlay`) presente en **ambas páginas**.  
Al navegar → `.active` → 300ms → `window.location.href`.  
`openInTranspositor(id)` en library-page.js guarda `pendingSongId` en localStorage antes de navegar.

---

## Página de Biblioteca — Layout actual

```
.lib-shell
└── .lib-main
    ├── .lib-topbar           — título (#libPageTitle) + avatar (#libAvatar)
    ├── .lib-stats-row        — 4 stat cards
    ├── .lib-filter-pills     — Recientes | Todos | Favoritos | Setlists
    ├── .lib-setlists-section — grid de setlists (oculto por defecto)
    └── .lib-content-section
        ├── .lib-toolbar      — búsqueda + selects ocultos + vista
        └── #libSongsList     — renderizado por JS
.lib-bottom-nav               — nav fija: Canciones / Favoritos / Setlists / ↩ Transpositor
```

> ⚠️ La `.lib-sidebar` lateral fue **eliminada** del HTML. La navegación es ahora `.lib-bottom-nav`.  
> Las referencias a `libSidebar` / `libSidebarOverlay` en library-page.js existen pero devuelven null.

### Toolbar (`.lib-toolbar`)

- `#libSearch` — input de búsqueda (visible)
- `#libFilterKey` — select de tono (`display:none`)
- `#libFilterSort` — select de orden (`display:none`)
- `.lib-view-btns` — toggle vista tabla (≡) / cuadrícula (⊞)

### Filter Pills (`#libFilterPills`)

| Pill | `data-filter` | Efecto |
|---|---|---|
| Recientes | `recientes` | `filters.sort = 'recent'`, sección canciones |
| Todos | `todos` | `filters.sort = 'alpha'`, sección canciones |
| Favoritos | `favoritos` | Sección favoritos (`params.favoritos = '1'` → servidor) |
| Setlists | `setlists` | Sección setlists |

### Búsqueda en tiempo real

- `filters.q` → **client-side** sobre `songs` ya cargado (sin skeleton flash)
- `applySearchFilter(data)` → filtra por nombre, cantautor o tags
- `filters.key` y `filters.sort` → van al servidor (recargan desde API)
- Debounce 300ms; clase `.lib-filtering` (opacity 0.45) durante la espera
- `loadSongs()` **no** envía `q` al backend

### Estado global en library-page.js

```js
let songs, favIds, setlists
let currentSection, viewMode
let filters            // { q, key, sort }
let editingId, deletingId, addingToSetlistId, selectedSetlistId
let tagColors, editingTags, activePalette, debounceTimer
```

---

## Sistema de Tags

- `localStorage('tagColors')` — `{ tagName: '#hex' }` compartido entre index.html y library.html
- Chips con color dot en modal de edición y save panel
- Paleta:

```js
TAG_PALETTE = [
  '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#1abc9c',
  '#3498db', '#9b59b6', '#e91e8c', '#95a5a6'
]
```

---

## Exports de ui.js

| Función | Descripción |
|---|---|
| `renderResults(container, data, onUpdate, onReorder, labelFn)` | Secciones con drag & drop |
| `renderFinalResults(container, data, labelFn)` | Resultado transpuesto (sin drag) |
| `renderToneGrid(container, mode, onSelect)` | Grid de 12 notas |
| `renderDetectedKey(container, keyInfo)` | Badge flotante de tonalidad |
| `showScanner(container, statusEl, message)` | Animación escáner láser |
| `initTheme()` | Temas, paletas, tamaños de acorde |
| `initSFM(onLib, onSave, onSetlist)` | Smart Floating Menu |
| `updateSFMSaveState(hasData)` | Activa/desactiva "Guardar escaneo" |
| `closeOverlay(overlay, animatedEl)` | Cierre con transición CSS + fallback 500ms |
| `createTagEditor(chipsEl, inputEl, hiddenEl)` | Devuelve `{ reset(), getTags() }` |

---

## Modales (index.html)

| ID | Propósito | Cierre |
|---|---|---|
| `#templateModal` | Descargar plantilla | botón ✕ |
| `#alertModal` | Validación | botón + overlay |
| `#savePanelOverlay` | Guardar canción | botón ✕ + overlay + Esc |
| `#setlistPopupOverlay` | Ver/navegar setlists | botón ✕ + overlay + Esc |

---

## API Client (js/api.js)

```js
const API_URL = window.location.origin + '/api'
```

| Método | Petición | Descripción |
|---|---|---|
| `API.listar(params)` | GET /canciones | Acepta: key, sort, favoritos |
| `API.obtenerStats()` | GET /canciones/stats | totalCanciones, totalCantautores, bpmPromedio, tonoMasFrecuente |
| `API.obtenerCancion(id)` | GET /canciones/:id | Incluye `letra_acordes` (JSON de songData) |
| `API.crear(datos)` | POST /canciones | Incluye `letra_acordes` |
| `API.actualizar(id, datos)` | PUT /canciones/:id | |
| `API.eliminar(id)` | DELETE /canciones/:id | |
| `API.obtenerFavoritos()` | GET /favoritos | |
| `API.toggleFavorito(id)` | POST /favoritos/:id | Devuelve `{ favorito: bool }` |
| `API.obtenerSetlists()` | GET /setlists | Incluye `total_canciones` |
| `API.obtenerSetlist(id)` | GET /setlists/:id | Incluye array `canciones` con `posicion` |
| `API.crearSetlist(datos)` | POST /setlists | |
| `API.agregarASetlist(slId, cId)` | POST /setlists/:id/canciones | |
| `API.eliminarDeSetlist(slId, cId)` | DELETE /setlists/:id/canciones/:cId | |
| `API.eliminarSetlist(id)` | DELETE /setlists/:id | |

---

## localStorage — Claves Utilizadas

| Clave | Tipo | Descripción |
|---|---|---|
| `theme` | string | `'light'` o ausente (dark) |
| `palette` | string | Índice `'0'`–`'3'` |
| `chordSize` | string | `'xs'`, `'sm'`, `''`, `'lg'`, `'xl'` |
| `libViewMode` | string | `'table'` o `'grid'` |
| `tagColors` | JSON | `{ tagName: '#hex' }` — compartido entre páginas |
| `pendingSongId` | string | ID efímero para cargar canción al navegar library → transpositor |

---

## Patrones y Convenciones

- **Modales:** `.classList.add/remove('open')` + `aria-hidden`. Nunca `display`.
- **`labelFn`:** nunca muta datos; solo transforma la visualización del acorde.
- **Escape global:** un único listener por página cierra todos los overlays abiertos.
- **Favoritos:** gestionados vía API backend (`/api/favoritos`), no solo localStorage.
- **Búsqueda:** client-side para evitar flash; filtros de ordenación/tono van al servidor.
- **Navegación entre páginas:** siempre a través de `#pageTransitionOverlay` (300ms fade).
- **Slash chords:** `D/F#` se separa en raíz + bajo antes de pasar a Tonal para transponer.
- **Transposición con bemoles:** `preferFlats` se activa para claves: F, Bb, Eb, Ab, Db, Gb, Dm, Gm, Cm, Fm, Bbm, Ebm.

---

## Detección de Tonalidad (js/music.js)

Algoritmo **Krumhansl-Schmuckler**:
1. Descompone cada acorde en pitch classes (0–11)
2. Construye histograma de frecuencias
3. Producto escalar contra 24 perfiles KS (12 mayores + 12 menores)
4. Ganadora = mayor puntuación; `confidence` = separación relativa con la segunda

Devuelve: `{ root: string, quality: 'Mayor'|'menor', confidence: 0–1 }`

---

*Generado automáticamente desde el código fuente — 2026-05-04*
