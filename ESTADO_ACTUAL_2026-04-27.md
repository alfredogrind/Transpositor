# Estado Actual — Transpositor Modular Pro
**Actualizado:** 2026-04-27

---

## Visión General

App web para músicos. Escanea partituras/cifras (imágenes, PDFs, plantillas) con OCR, detecta la tonalidad automáticamente (Krumhansl-Schmuckler), transpone a cualquier tono, muestra acordes en notación clásica o por grados, y gestiona una biblioteca local de canciones persistida en SQLite.

**Stack:** HTML + CSS vanilla + JS modular (ES modules). Sin framework.  
**Servidor local:** `live-server` o `python -m http.server` en `http://127.0.0.1:5500` (o 5000).

---

## Estructura de Archivos

```
/
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── main.js         — Orquestador principal
│   ├── music.js        — Lógica musical pura (sin modificar)
│   ├── ui.js           — Rendering, temas, FAB, SFM
│   ├── api.js          — Cliente HTTP → backend
│   ├── library.js      — Biblioteca: modal, CRUD, filtros
│   ├── ocr.js          — OCR (Tesseract.js + PDF.js)
│   └── template.js     — Plantillas TXT/CSV/JSON
├── backend/
│   ├── server.js
│   ├── database.js
│   ├── canciones.db
│   ├── routes/canciones.js
│   └── middleware/
│       ├── validation.js
│       └── errorHandler.js
├── manifest.json
├── vercel.json
└── .gitignore
```

---

## Estado de Funcionalidades

| Feature | Estado |
|---|---|
| OCR imágenes + PDFs | ✅ |
| Parseo de plantillas TXT/CSV/JSON | ✅ |
| Detección de tonalidad (Krumhansl-Schmuckler) | ✅ |
| Transposición inteligente (enarmónicos, slash chords) | ✅ |
| Modo de notación: Clásica / Grados | ✅ |
| Drag & drop para reordenar secciones | ✅ |
| Smart Floating Menu (SFM) | ✅ |
| FAB drag & drop (mouse + touch, posición persistida) | ✅ |
| Colisión SFM ↔ FAB con reposicionamiento automático | ✅ |
| Temas dark/light + paletas de color | ✅ |
| Tamaños de texto accesibles (xs/sm/lg/xl) | ✅ |
| Modal de alerta estilizado | ✅ |
| Biblioteca como Modal Overlay (glassmorphism) | ✅ |
| Biblioteca: listar, buscar, filtrar | ✅ |
| Biblioteca: editar (modal) | ✅ |
| Biblioteca: eliminar (modal de confirmación) | ✅ |
| Biblioteca: estadísticas | ✅ |
| Panel "Guardar en Biblioteca" — activación manual | ✅ |
| API REST backend (CRUD completo) | ✅ |
| Notificaciones toast | ✅ |
| Deploy a producción | ⏳ Pendiente |
| Autenticación de usuarios | ⏳ Pendiente |

---

## Cambios Realizados en Esta Sesión (2026-04-27)

### 1. Smart Floating Menu (SFM)

**Objetivo:** Reemplazar el botón "Biblioteca" inline por un menú flotante persistente.

**Archivos modificados:** `index.html`, `css/styles.css`, `js/ui.js`, `js/library.js`, `js/main.js`

**Qué se hizo:**
- Eliminado `<button id="btnBiblioteca">` del flujo del documento.
- Eliminado el `<script type="module">` separado de `library.js` — ahora lo importa `main.js` directamente.
- Añadido `#sfmGroup` al HTML: trigger circular `+` (rota a `×` al abrirse) + dos ítems pill.
- El FAB de personalización se movió de `bottom: 30px` a `bottom: 100px` para dejar espacio al SFM.
- `_checkSFMCollision(fabEl)` en `ui.js` — usa `getBoundingClientRect()` para detectar superposición entre SFM y FAB al arrastrar el FAB, y reposiciona el SFM automáticamente. Se llama en drag end (mouse y touch), en restore de posición inicial y en `resize`.
- `initSFM(onOpenLibrary, onSaveScan)` exportado desde `ui.js` — maneja toggle, click-outside y tecla Escape.
- `updateSFMSaveState(hasData)` exportado desde `ui.js` — alterna `.sfm-item--inactive` en "Guardar escaneo".
- `toggleLibrary()` exportado desde `library.js` — reemplaza el event listener del botón eliminado.

**Acciones del SFM:**
| Ítem | Acción |
|---|---|
| ♫ Biblioteca | Llama `toggleLibrary()` → abre/cierra el modal de biblioteca |
| ⊕ Guardar escaneo | Solo activo cuando hay datos transpuestos; llama `scrollToOrShowSavePanel()` |

**Estado del ítem "Guardar escaneo":**
- `inactive` (opacidad 0.38, no interactivo) al inicio y al escanear de nuevo.
- Activo tras una transposición exitosa.
- Vuelve a `inactive` si el usuario rescana.

---

### 2. Biblioteca como Modal Overlay

**Objetivo:** Eliminar el comportamiento "empuja el layout" y convertir la biblioteca en un modal centrado con glassmorphism.

**Archivos modificados:** `index.html`, `css/styles.css`, `js/library.js`

**Qué se hizo:**
- Eliminado `#seccionBiblioteca` de `<main>` completamente.
- Añadido `#modalBiblioteca` como `.modal-overlay` fuera del flujo del documento, con el mismo patrón que los modales existentes (`.open` class).
- Estructura del modal:
  ```
  #modalBiblioteca (.modal-overlay)
  └── .modal-card.lib-modal-card
      ├── .lib-modal-header   — ícono ♫ + título + botón ✕
      └── .lib-modal-body     — scrollable internamente
          ├── .lib-stats
          ├── .lib-filtros
          └── #listaCanciones
  ```
- `.lib-modal-card` sobreescribe `.modal-card`:
  - Ancho: `min(700px, 95vw)` (más ancho que los modales estándar de 420px).
  - Alto máximo: `88vh` con scroll interno en `.lib-modal-body`.
  - `padding: 0` — padding gestionado internamente por header y body.
  - Glassmorphism intensificado: `blur(48px) saturate(220%)`.
  - Glow ring en el borde: `box-shadow` con `var(--accent-glow)`.
  - Inset highlight: `inset 0 1px 0 rgba(255,255,255,0.06)`.
  - Animación de apertura más dramática: `scale(0.94)` → `scale(1)` (vs. `0.97` del base).
- `.lib-modal-header` con gradiente sutil `var(--accent-glow)` → `transparent`.
- `.lib-modal-body` con scrollbar personalizada de 4px que se tiñe con `var(--accent)` al hover.
- `overscroll-behavior: contain` para evitar que el scroll escape al body.
- Breakpoint `560px`: padding reducido, `max-height: 93vh`.

**Comportamiento de cierre:**
- Botón ✕ del header.
- Click en el fondo del overlay.
- Tecla Escape (integrado en el handler global).

**Cómo interactúa con los modales de editar/eliminar:**  
Cuando el usuario hace clic en "Editar" o "Eliminar" desde dentro de la biblioteca, el modal correspondiente (que está más adelante en el DOM) aparece encima. Al cerrarlo, la biblioteca sigue visible.

---

### 3. Fix: Panel "Guardar" no se abre automáticamente

**Objetivo:** El panel de guardado solo debe aparecer cuando el usuario lo pide explícitamente.

**Archivo modificado:** `js/main.js` (una línea)

**Qué se hizo:**
- Eliminada la llamada `showSavePanel(detectedKey?.root || '')` del handler `btnTranspose.onclick`.
- Añadido `document.getElementById('savePanel')?.remove()` en su lugar — limpia cualquier panel previo cuando el usuario re-transpone, evitando que quede un panel con datos obsoletos.
- `showSavePanel()` ahora solo se invoca desde `scrollToOrShowSavePanel()`, que se llama únicamente al hacer clic en "Guardar escaneo" en el SFM.

**Flujo resultante:**
```
Transponer → renderiza resultado → limpia panel anterior → activa SFM "Guardar"
                                                                    ↓
                                                         Usuario hace clic en SFM
                                                                    ↓
                                               scrollToOrShowSavePanel() crea el panel
                                               y hace scroll suave hasta él
```

---

## Arquitectura de Módulos JS

```
main.js
├── import music.js          — lógica musical (sin tocar)
├── import ui.js             — rendering + initTheme + initSFM + updateSFMSaveState
├── import api.js            — cliente HTTP
├── import template.js       — plantillas
├── import ocr.js            — OCR
└── import library.js        — toggleLibrary, cargarBiblioteca
```

`library.js` ya no se carga como `<script>` separado en el HTML — lo importa `main.js`.

---

## Estado Global (js/main.js)

```js
let songData           = [];       // [{ section: string, chords: string[] }]
let targetKey          = null;     // nota destino: "G", "Dm", "F#m"...
let detectedKey        = null;     // { root: string, quality: 'Mayor'|'menor', confidence: 0-1 }
let lastTransposedData = null;     // igual forma que songData — acordes ya transpuestos
let notationMode       = 'classic'; // 'classic' | 'degrees'
```

---

## Exports de ui.js

| Función | Descripción |
|---|---|
| `renderResults(container, data, onUpdate, onReorder, labelFn)` | Secciones con drag & drop y edición inline |
| `renderFinalResults(container, data, labelFn)` | Resultado transpuesto (sin drag) |
| `renderToneGrid(container, mode, onSelect)` | Grid de 12 notas |
| `renderDetectedKey(container, keyInfo)` | Badge flotante de tonalidad |
| `showScanner(container, statusTextEl, message)` | Animación escáner láser |
| `initTheme()` | Temas, paletas, a11y, FAB con drag y collision check |
| `initSFM(onOpenLibrary, onSaveScan)` | Smart Floating Menu |
| `updateSFMSaveState(hasData)` | Activa/desactiva ítem "Guardar escaneo" |

---

## Exports de library.js

| Función | Descripción |
|---|---|
| `toggleLibrary()` | Abre/cierra `#modalBiblioteca` y carga datos |
| `cargarBiblioteca()` | Recarga la lista desde la API (útil para refresh externo) |

---

## API REST Backend

**Puerto:** 3000 · **BD:** `backend/canciones.db` (SQLite, better-sqlite3 v9)

```
GET    /api/canciones               — Todas las canciones
GET    /api/canciones/search?q=...  — Búsqueda (q, bpmMin, bpmMax, tono)
GET    /api/canciones/stats         — { totalCanciones, totalCantautores, bpmPromedio }
POST   /api/canciones               — Crear
PUT    /api/canciones/:id           — Editar
DELETE /api/canciones/:id           — Eliminar
GET    /api/health                  — Health check
```

---

## Iniciar en Local

```bash
# Terminal 1 — Backend
cd backend && npm start
# → http://localhost:3000

# Terminal 2 — Frontend (desde raíz del proyecto)
python -m http.server 5000
# → http://localhost:5000/index.html
```

---

## Patrones y Convenciones

- **Modales:** siempre `.classList.add/remove('open')` + `aria-hidden`. Nunca `display`.
- **SFM y FAB:** ambos en `position: fixed; right: 30px`. SFM en `bottom: 30px`, FAB en `bottom: 100px` (CSS default). `_checkSFMCollision()` corre en cada drag-end y resize.
- **`labelFn`:** nunca muta `songData` ni `lastTransposedData`; solo transforma la visualización.
- **`window._libEditar` / `window._libEliminar`:** globales necesarios porque los botones de las tarjetas se generan con `innerHTML`.
- **Escape global:** cierra editar, confirmar y biblioteca en un solo listener.
- **Panel de guardado:** se crea solo cuando el usuario lo pide; se destruye al re-transponer.

---

## Roadmap

```
✅ Backend CRUD (Node.js + SQLite)
✅ Frontend modular (ES modules)
✅ OCR + plantillas
✅ Transposición inteligente + slash chords
✅ Detección de tonalidad (Krumhansl-Schmuckler)
✅ Modo grados / clásica
✅ Smart Floating Menu (SFM) con collision detection
✅ Biblioteca como Modal Overlay glassmorphism
✅ Panel de guardado manual (no automático)
⏳ Deploy a producción (Vercel + Railway)
⏳ Autenticación de usuarios
⏳ Features avanzados (letras, exportar PDF, etc.)
```
