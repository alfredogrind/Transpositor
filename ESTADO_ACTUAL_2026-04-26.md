# Estado Actual — Transpositor Modular Pro
**Actualizado:** 2026-04-26

---

## Visión General

App web para músicos. Permite escanear partituras/cifras (imágenes, PDFs, plantillas) con OCR, detectar la tonalidad automáticamente usando el algoritmo Krumhansl-Schmuckler, transponer a cualquier tono, ver acordes en notación clásica o por grados, y guardar canciones en una biblioteca local persistida con SQLite.

**Stack:** HTML + CSS vanilla + JS modular (ES modules) — sin framework.
**Servidor de desarrollo:** `live-server` o `python -m http.server` en `http://127.0.0.1:5500` (o 5000).

---

## Estructura de Archivos

```
/                           ← Raíz del proyecto
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── main.js             ← Orquestador principal
│   ├── music.js            ← Lógica musical pura
│   ├── ui.js               ← Rendering, temas, FAB
│   ├── api.js              ← Cliente HTTP → backend
│   ├── library.js          ← Biblioteca: listar/editar/eliminar
│   ├── ocr.js              ← OCR (Tesseract.js + PDF.js)
│   └── template.js         ← Plantillas TXT/CSV/JSON
├── backend/
│   ├── server.js
│   ├── database.js
│   ├── canciones.db        ← SQLite (auto-generado)
│   ├── routes/
│   │   └── canciones.js    ← CRUD REST
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
| OCR imágenes + PDFs | ✅ Funcionando |
| Parseo de plantillas TXT/CSV/JSON | ✅ Funcionando |
| Detección de tonalidad (Krumhansl-Schmuckler) | ✅ Funcionando |
| Transposición inteligente (enarmónicos, slash chords) | ✅ Funcionando |
| Modo de notación: Clásica / Grados | ✅ Funcionando |
| Drag & drop para reordenar secciones | ✅ Funcionando |
| FAB drag & drop (mouse + touch, posición persistida) | ✅ Funcionando |
| Temas dark/light + paletas de color | ✅ Funcionando |
| Tamaños de texto accesibles (xs/sm/lg/xl) | ✅ Funcionando |
| Modal de alerta estilizado (sin `alert()` nativo) | ✅ Funcionando |
| Panel "Guardar en Biblioteca" tras transponer | ✅ Funcionando |
| API REST backend (CRUD completo) | ✅ Funcionando |
| Biblioteca: listar canciones con tarjetas | ✅ Funcionando |
| Biblioteca: búsqueda + filtros (BPM, tono) | ✅ Funcionando |
| Biblioteca: estadísticas (total, artistas, BPM prom.) | ✅ Funcionando |
| Biblioteca: modal editar | ✅ Funcionando |
| Biblioteca: modal confirmar eliminar | ✅ Funcionando |
| Notificaciones toast (éxito/error) | ✅ Funcionando |
| Deploy a producción | ⏳ Pendiente |
| Autenticación de usuarios | ⏳ Pendiente |

---

## Librerías Externas (CDN)

| Librería | Versión | Uso |
|---|---|---|
| Tesseract.js | v5 | OCR de imágenes |
| PDF.js | 3.4.120 | Convierte páginas PDF a imágenes para OCR |
| Tonal.js | última | Transposición, enarmónicos, análisis de acordes |

---

## Sistema de Diseño (css/styles.css)

**Variables CSS en `:root` (dark) y `body.light-mode` (light):**

```css
--bg, --surface, --surface2, --border
--accent: #c8a96e          /* dorado — cambia con paletas */
--text, --text2, --text3
--radius: 28px
--card-shadow, --transition, --accent-glow
```

**Paletas** (via `data-palette` en `body`): `0` Starlight · `1` Artic · `2` Ambar Solar · `3` Menta Zen.

**Tamaños de texto** (via `data-chord-size` en `html`): `xs` · `sm` · *(default)* · `lg` · `xl`.

**Clases clave:**
- `.section-box` — tarjeta glassmorphism base
- `.modal-overlay` + `.modal-card` + `.open` — sistema de modales
- `.chord-pill` — acorde en vista de detección
- `.chord-result` — acorde en resultado transpuesto
- `.btn-action` — botón primario dorado
- `.notation-pill` / `.notation-pill.active` — toggle Clásica/Grados
- `.lib-card` — tarjeta de canción en la biblioteca
- `.lib-notif` / `.lib-notif-error` — toast de notificación

---

## Estado Global (js/main.js)

```js
let songData           = [];      // [{ section: string, chords: string[] }]
let targetKey          = null;    // nota seleccionada por el usuario (ej. "G" o "Dm")
let detectedKey        = null;    // { root: string, quality: 'Mayor'|'menor', confidence: 0-1 }
let lastTransposedData = null;    // igual forma que songData, acordes ya transpuestos
let notationMode       = 'classic'; // 'classic' | 'degrees'
```

---

## Flujo Principal

1. **Upload** → `fileInput` → separa archivos media (OCR) de plantillas (.txt/.csv/.json)
2. **Escanear** (`btnProcess`) → OCR o parse de plantilla → `songData`
3. `refreshUI()` → detecta tonalidad (KS) → renderiza secciones con drag & drop → muestra grid de tonos
4. Usuario selecciona `targetKey` en grid de 12 notas
5. **Transponer** (`btnTranspose`) → genera `lastTransposedData` → renderiza resultado final → muestra panel de guardado
6. **Guardar** → formulario → `API.crear()` → backend SQLite
7. Toggle de notación → re-renderiza ambas vistas con `labelFn` apropiada
8. **Biblioteca** (`btnBiblioteca`) → `library.js` carga y renderiza las canciones guardadas

---

## Funciones Clave por Módulo

### js/music.js

| Función | Descripción |
|---|---|
| `extractChordsWithRepetition(text)` | Extrae acordes; soporta `\|\|...\|\|` (×2) y `\|\|\|...\|\|\|` (×3) |
| `smartTransposeChord(chord, interval, preferFlats)` | Transpone preservando enarmónicos y slash chords |
| `detectSongKey(allChords)` | Algoritmo Krumhansl-Schmuckler — devuelve `{ root, quality, confidence }` |
| `convertChordToDegree(chord, rootNote)` | Convierte acorde a grado cromático; soporta slash chords |
| `convertToDegrees(chords, keyInfo)` | Aplica conversión a un array |
| `SECTION_KEYWORDS` | Array con keywords de secciones (INTRO, CORO, etc.) |

**Motor KS:** descompone acordes en pitch classes → histograma → producto escalar con perfiles KS → la tonalidad con mayor puntuación gana. `confidence` = separación relativa entre ganadora y segunda.

### js/ui.js

| Función | Descripción |
|---|---|
| `renderResults(container, data, onUpdate, onReorder, labelFn)` | Secciones con drag & drop y edición inline |
| `renderFinalResults(container, data, labelFn)` | Resultado transpuesto (sin drag) |
| `renderToneGrid(container, mode, onSelect)` | Grid de 12 notas; añade sufijo `m` en modo menor |
| `renderDetectedKey(container, keyInfo)` | Badge flotante de tonalidad |
| `showScanner(container, statusTextEl, message)` | Animación de escáner láser durante OCR |
| `initTheme()` | Temas, paletas, tamaño de texto, FAB completo (drag mouse+touch, clamp viewport) |

### js/main.js

| Función | Descripción |
|---|---|
| `getLabelFn(referenceRoot)` | Devuelve `c => c` (clásica) o `c => convertChordToDegree(c, referenceRoot)` (grados) |
| `refreshUI()` | Re-renderiza detección tras escaneo o reordenamiento |
| `showSavePanel(tonoOriginal)` | Crea el panel de guardado debajo del resultado |
| `initNotationToggle()` | Pills Clásica/Grados; re-renderiza ambas vistas al cambiar |
| `initAlertModal()` | Modal de alerta estilizado (sin `alert()`) |
| `initTemplateModal()` | Modal para descargar plantillas vacías |

**Referencia correcta para `getLabelFn`:**
- Vista de detección → `detectedKey.root`
- Vista transpuesta → `targetKey.replace(/m$/, '')`

### js/api.js

Cliente HTTP con detección auto de entorno (`localhost` vs producción):

```js
API.obtenerTodas()           → GET  /api/canciones
API.buscar(termino, filtros) → GET  /api/canciones/search?q=...
API.obtenerStats()           → GET  /api/canciones/stats
API.crear(datos)             → POST /api/canciones
API.actualizar(id, datos)    → PUT  /api/canciones/:id
API.eliminar(id)             → DELETE /api/canciones/:id
```

### js/library.js

Estado interno: `cancionesActuales`, `cancionEnEdicion`, `cancionAEliminar`.

Funciones principales: `cargarBiblioteca()`, `renderizarLista()`, `actualizarStats()`, `aplicarFiltros()`.

Expone `window._libEditar(id)` y `window._libEliminar(id)` para los botones generados dinámicamente.

Exporta `cargarBiblioteca` para que `main.js` pueda recargar tras guardar.

### js/template.js

| Función | Descripción |
|---|---|
| `detectFormat(filename)` | Detecta si un archivo es plantilla (.txt/.csv/.json) |
| `downloadTemplate(format)` | Genera y descarga plantilla vacía |
| `parseTemplate(text, format, extractChordsFn)` | Parsea plantilla rellenada → `songData` |

---

## Modales

Todos usan el patrón `.modal-overlay` + clase `.open`:

| ID | Propósito |
|---|---|
| `#templateModal` | Descargar plantilla vacía en TXT/CSV/JSON |
| `#alertModal` | Validación (sin partitura / sin tono) |
| `#modalEditar` | Editar canción de la biblioteca |
| `#modalConfirmar` | Confirmar eliminación de canción |

---

## Backend (Node.js + Express + SQLite)

**Puerto:** 3000  
**Base de datos:** `backend/canciones.db` (better-sqlite3 v9)

### Endpoints

```
GET    /api/canciones              ← Todas las canciones
GET    /api/canciones/search?q=... ← Búsqueda (texto, bpmMin, bpmMax, tono)
GET    /api/canciones/stats        ← { totalCanciones, totalCantautores, bpmPromedio }
POST   /api/canciones              ← Crear canción
PUT    /api/canciones/:id          ← Editar canción
DELETE /api/canciones/:id          ← Eliminar canción
GET    /api/health                 ← Verificar servidor
```

### Campos de la tabla `canciones`

```
id, cantautor, nombre, tono_original, bpm, etiquetas (JSON), notas, created_at, updated_at
```

### Seguridad implementada

- CORS limitado a `localhost:5000`
- Rate limiting: 100 req / 15 min
- Validación de input (`middleware/validation.js`)
- Manejo de errores centralizado (`middleware/errorHandler.js`)

---

## Iniciar en Local

```bash
# Terminal 1 — Backend
cd backend
npm start
# → Servidor en http://localhost:3000

# Terminal 2 — Frontend
# Desde la raíz del proyecto
python -m http.server 5000
# → http://localhost:5000/index.html
```

---

## Patrones y Convenciones

- **No se modifica `songData` ni `lastTransposedData` para visualización** — solo `labelFn` transforma la vista.
- **Los modales se abren/cierran con `.classList.add/remove('open')`**, nunca con `display`.
- **CSS variables para todo** — cualquier color hardcoded es bug o legacy.
- **Posición FAB** persistida en localStorage como `{ bottom: "Xpx", right: "Ypx" }`, con clamp al viewport en cada carga y en `resize`.
- **Escape** cierra todos los modales abiertos.
- **`window._libEditar` y `window._libEliminar`** son globales necesarios porque los botones se generan con `innerHTML`.

---

## Roadmap

```
✅ Backend CRUD (Node.js + SQLite)
✅ Frontend modular (ES modules)
✅ OCR + plantillas
✅ Transposición inteligente + slash chords
✅ Detección de tonalidad (Krumhansl-Schmuckler)
✅ Modo grados / clásica
✅ Biblioteca completa (listar, buscar, editar, eliminar)
✅ FAB drag & drop + temas + paletas + accesibilidad
⏳ Deploy a producción (Vercel + Railway)
⏳ Autenticación de usuarios
⏳ Features avanzados (letras, exportar PDF, etc.)
```
