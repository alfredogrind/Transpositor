---
name: Transpositor Modular Pro — Estado Completo
description: Estado actual del proyecto web de transposición musical (actualizado 2026-04-30)
type: project
---

## Descripción General

App web llamada **Transpositor Modular Pro** con diseño Apple (dark mode por defecto). Permite a músicos escanear partituras/cifras con OCR y transponer acordes a cualquier tonalidad, con opción de ver en notación clásica o por grados. Incluye biblioteca de canciones persistida en SQLite con página propia.

**Stack:** HTML + CSS vanilla + JS modular (ES modules), sin framework.  
**Servidor de desarrollo:** `live-server` o `python -m http.server` en `http://127.0.0.1:5500` (o 5000).

---

## Archivos del Proyecto

```
index.html            — Transpositor principal (UI completa)
library.html          — Página dedicada a la biblioteca (ruta separada)
manifest.json         — PWA manifest
vercel.json           — Config de despliegue

css/styles.css        — Design system Apple (CSS variables, glassmorphism, animaciones)
css/library.css       — Estilos exclusivos de la página library.html

js/main.js            — Orquestador principal (index.html)
js/music.js           — Lógica musical pura
js/ui.js              — Rendering, temas, FAB, SFM
js/api.js             — Cliente HTTP → backend
js/library.js         — Modal de biblioteca embebido en index.html
js/library-page.js    — Controlador completo de library.html
js/ocr.js             — OCR con Tesseract.js + conversión PDF con PDF.js
js/template.js        — Generar/parsear plantillas .txt/.csv/.json

backend/              — Node.js + Express + SQLite (puerto 3000)
```

> `library.js` NO tiene `<script>` propio en index.html — lo importa `main.js` directamente.  
> `library-page.js` se carga solo en `library.html`.

---

## Librerías Externas (CDN)

- **Tesseract.js v5** — OCR para leer acordes de imágenes
- **PDF.js 3.4.120** — Convierte páginas PDF a imágenes para OCR
- **Tonal.js** — Lógica musical: transposición, enarmónicos, análisis de acordes

---

## Sistema de Diseño (css/styles.css)

Variables CSS en `:root` (dark mode) y `body.light-mode` (light mode):

```css
--bg, --surface, --surface2, --border
--accent: #c8a96e  (dorado — cambia con paletas)
--text, --text2, --text3
--radius: 28px
--card-shadow, --transition, --accent-glow
```

**Paletas disponibles** (via `data-palette` en body): Starlight, Artic, Ambar Solar, Menta Zen.  
**Tamaños de texto** (via `data-chord-size` en html): xs, sm, (default), lg, xl.

---

## Estado Global (js/main.js)

```js
let songData           = [];       // [{ section: string, chords: string[] }]
let targetKey          = null;     // nota destino: "G", "Dm", "F#m"…
let detectedKey        = null;     // { root: string, quality: 'Mayor'|'menor', confidence: 0-1 }
let lastTransposedData = null;     // igual forma que songData, acordes transpuestos
let notationMode       = 'classic'; // 'classic' | 'degrees'
```

---

## Estado Global (js/library-page.js)

```js
let songs              = [];
let favIds             = new Set();
let setlists           = [];
let currentSection     = 'canciones';   // 'canciones' | 'favoritos' | 'setlists'
let viewMode           = 'table';       // persiste en localStorage 'libViewMode'
let filters            = { q: '', key: '', sort: 'recent' };
let editingId          = null;
let deletingId         = null;
let addingToSetlistId  = null;
let selectedSetlistId  = null;
let tagColors          = {};            // { tagName: '#hex' }
let editingTags        = [];
```

---

## Flujo Principal (index.html)

1. **Upload** → fileInput → separa archivos media (OCR) de plantillas (.txt/.csv/.json)
2. **Escanear** (`btnProcess`) → OCR o parse → `songData`; resetea `lastTransposedData = null`; desactiva SFM "Guardar"
3. `refreshUI()` → detecta tonalidad (KS) → renderiza secciones con drag & drop → muestra grid de tonos
4. Usuario selecciona `targetKey` en grid de 12 notas
5. **Transponer** (`btnTranspose`) → genera `lastTransposedData` → renderiza resultado → limpia panel previo → activa SFM "Guardar"
6. **Guardar** (click en SFM "Guardar escaneo") → `scrollToOrShowSavePanel()` crea el panel → scroll suave → `API.crear()`
7. **Biblioteca** (click en SFM "Biblioteca") → navega a `library.html`

---

## Página de Biblioteca (library.html)

Página independiente con layout shell tipo dashboard:

```
.lib-shell
├── .lib-sidebar #libSidebar       — Sidebar de navegación (colapsable en móvil)
│   ├── .lib-sidebar-brand         — Ícono ♫ + "Transport"
│   ├── nav.lib-nav #libNav        — Botones: Canciones / Favoritos / Setlists
│   └── a.lib-back-btn             — Enlace ← Transpositor (→ index.html)
├── .lib-sidebar-overlay           — Overlay oscuro en móvil
└── .lib-main
    ├── .lib-topbar                — Hamburger + título de sección + acciones
    ├── .lib-stats-row             — 4 stat-cards: Canciones, Artistas, BPM prom., Tono frec.
    ├── .lib-setlists-section      — Vista setlists (display:none por defecto)
    │   ├── .lib-setlists-header   — Título + botón "+ Nuevo setlist"
    │   └── .lib-setlists-grid     — Tarjetas de setlists
    └── .lib-content-section       — Vista canciones/favoritos
        ├── .lib-toolbar           — Buscador + filtro tono + filtro orden
        └── #libSongsList          — Lista de canciones
```

**Secciones de navegación:**
- **Canciones** — listado completo con búsqueda/filtros
- **Favoritos** — canciones marcadas con ♥, persiste en `localStorage('libFavs')`
- **Setlists** — colecciones de canciones; se puede invocar desde `index.html`

**Modales en library.html:**

| ID | Propósito |
|---|---|
| `#libModalEditar` | Editar canción (nombre, artista, tono, BPM, tags) |
| `#libModalConfirmar` | Confirmar eliminación |
| `#libModalSetlist` | Ver/gestionar canciones de un setlist |
| `#libModalAddSetlist` | Crear nuevo setlist |

---

## Smart Floating Menu (SFM) — index.html

Menú flotante en `bottom: 30px; right: 30px` con trigger circular `+` (rota a `×` al abrirse).

**Ítems:**
- ♫ **Biblioteca** → navega a `library.html` — siempre activo
- ⊕ **Guardar escaneo** → `scrollToOrShowSavePanel()` — solo activo cuando `lastTransposedData !== null`

**Collision detection:** `_checkSFMCollision(fabEl)` en `ui.js` — si el FAB arrastrable se superpone al SFM, reposiciona el SFM encima del FAB. Se ejecuta en: drag-end del FAB, restauración de posición desde localStorage, y resize.

**FAB de personalización:** `bottom: 100px; right: 30px` (70px arriba del SFM para no superponerse por defecto).

---

## Panel de Guardado (index.html)

- **Solo aparece bajo demanda** — se crea al hacer clic en SFM "Guardar escaneo".
- Al re-transponer: el panel existente se destruye (`savePanel?.remove()`).
- `showSavePanel()` solo se llama desde `scrollToOrShowSavePanel()` — nunca automáticamente.

---

## Exports de ui.js

| Función | Descripción |
|---|---|
| `renderResults(...)` | Secciones con drag & drop |
| `renderFinalResults(...)` | Resultado transpuesto |
| `renderToneGrid(...)` | Grid de 12 notas |
| `renderDetectedKey(...)` | Badge flotante de tonalidad |
| `showScanner(...)` | Animación escáner láser |
| `initTheme()` | Temas, paletas, a11y, FAB drag, collision |
| `initSFM(onOpenLibrary, onSaveScan)` | Smart Floating Menu |
| `updateSFMSaveState(hasData)` | Activa/desactiva "Guardar escaneo" |

## Exports de library.js (modal embebido en index.html)

| Función | Descripción |
|---|---|
| `toggleLibrary()` | Abre/cierra `#modalBiblioteca` (legacy, ahora redirige a library.html) |
| `cargarBiblioteca()` | Recarga lista desde la API |

---

## Modales (index.html)

| ID | Propósito | Patrón cierre |
|---|---|---|
| `#templateModal` | Descargar plantilla vacía | botón ✕ |
| `#alertModal` | Validación (sin partitura / sin tono) | botón + overlay |
| `#modalBiblioteca` | Biblioteca modal (legacy) | botón ✕ + overlay + Esc |
| `#modalEditar` | Editar canción | botón ✕ + overlay + Esc |
| `#modalConfirmar` | Confirmar eliminación | botones + overlay + Esc |

---

## Sistema de Tags (library-page.js)

- Colores por etiqueta en `tagColors` (objeto `{ nombre: '#hex' }`), persiste en `localStorage('libTagColors')`.
- Paleta de 9 colores: `TAG_PALETTE = ['#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#1abc9c', '#3498db', '#9b59b6', '#e91e8c', '#95a5a6']`.
- Editor de tags en modal de edición: `editingTags` (array mutable durante edición).

---

## Patrones y Convenciones

- **Modales:** `.classList.add/remove('open')` + `aria-hidden`. Nunca `display`.
- **`labelFn`:** nunca muta datos; solo transforma visualización.
- **`window._libEditar` / `window._libEliminar`:** globales por botones generados con `innerHTML`.
- **Escape global:** cierra modales en un solo listener.
- **Panel de guardado:** solo bajo demanda; se destruye al re-transponer.
- **Posición FAB:** persistida en localStorage como `{ bottom: "Xpx", right: "Ypx" }`, clampeada al viewport en carga y resize.
- **Favoritos:** persisten en `localStorage('libFavs')` como array de IDs.
- **Vista:** `libViewMode` persiste en localStorage (`'table'` u otro modo).
