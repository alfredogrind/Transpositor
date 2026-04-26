# 🛠️ FASE 4️⃣: DESARROLLO LOCAL SIN HOSTING

**Duración:** 20 min
**Objetivo:** Cambiar API para usar localhost en lugar de URLs de producción
**Riesgo:** BAJO - Solo cambio de configuración

---

## ¿QUÉ HAREMOS?

Actualmente tu código está configurado para:
- Frontend: Vercel
- Backend: Railway

Vamos a cambiar a:
- Frontend: localhost:5000
- Backend: localhost:3000

**AMBOS LOCALES** - Sin hosting, sin dominio, sin contratar nada.

---

## PASO 1: CONFIGURAR BACKEND PARA DESARROLLO LOCAL

### 1.1 - Modificar `backend/.env`

Cambia el archivo `.env` que está en la carpeta backend/:

```env
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5000
```

**Explicación:**
- `PORT=3000` → Backend escucha en puerto 3000
- `NODE_ENV=development` → Modo desarrollo (errores más detallados)
- `FRONTEND_URL=http://localhost:5000` → Frontend estará en puerto 5000

### 1.2 - Verificar `backend/server.js`

Busca esta línea:

```javascript
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));
```

**Debe estar así** (ya debería estarlo):

```javascript
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));
```

---

## PASO 2: CONFIGURAR FRONTEND PARA DESARROLLO LOCAL

### 2.1 - Crear `frontend/.env.development`

En la carpeta frontend/, crea un archivo llamado `.env.development`:

```
VITE_API_URL=http://localhost:3000/api
```

O si no usas VITE, crea directamente `.env`:

```
REACT_APP_API_URL=http://localhost:3000/api
```

### 2.2 - Modificar `frontend/js/api.js`

**BUSCA esta parte:**

```javascript
const API_URL = process.env.NODE_ENV === 'production'
    ? 'https://transposicion-backend-production.up.railway.app/api'
    : 'http://localhost:3000/api';
```

**REEMPLÁZALA CON:**

```javascript
// ============================================
// CONFIGURACIÓN DE ENTORNO
// ============================================

// Para desarrollo local
const API_URL = (() => {
    // Si está en localhost o 127.0.0.1, usar backend local
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3000/api';
    }
    
    // En producción, usar Railway
    return 'https://transposicion-backend-production.up.railway.app/api';
})();

console.log(`🔗 API URL: ${API_URL}`);
```

**Así:**
- ✅ En localhost → usa `http://localhost:3000/api`
- ✅ En producción → usa URL de Railway
- ✅ Se cambia automáticamente sin tocar código

---

## PASO 3: SERVIR FRONTEND EN PUERTO 5000

### Opción A: Con Python (más fácil)

En la carpeta `frontend/`, ejecuta:

```bash
python -m http.server 5000
```

O si tienes Python 2:

```bash
python -m SimpleHTTPServer 5000
```

**Output:**
```
Serving HTTP on 0.0.0.0 port 5000 (http://0.0.0.0:5000/) ...
```

### Opción B: Con Node.js

Instala servidor HTTP simple:

```bash
npm install -g http-server
```

En la carpeta `frontend/`, ejecuta:

```bash
http-server -p 5000
```

### Opción C: Con Live Server (VS Code)

1. Abre `frontend/index.html` en VS Code
2. Click derecho → "Open with Live Server"
3. Se abre en `http://127.0.0.1:5500`
4. En tu código cambia puerto a 5500 si es necesario

**Recomendación:** Usa **Opción A (Python)** que es la más simple.

---

## PASO 4: INICIAR TODO EN ORDEN

### Terminal 1 - Backend

```bash
cd backend
npm start
```

**Espera a ver:**
```
🚀 Servidor en puerto 3000
🌐 CORS habilitado para: http://localhost:5000
```

### Terminal 2 - Frontend

```bash
cd frontend
python -m http.server 5000
```

**Espera a ver:**
```
Serving HTTP on 0.0.0.0 port 5000
```

### Terminal 3 - Tu editor/browser

Abre en navegador:

```
http://localhost:5000/index.html
```

---

## PASO 5: VERIFICAR QUE FUNCIONA

### Test 1: API Health Check

En consola del navegador (F12), ejecuta:

```javascript
fetch('http://localhost:3000/api/health')
    .then(r => r.json())
    .then(d => console.log('✅ Backend OK:', d));
```

**Debe devolver:**
```json
{
  "status": "OK",
  "timestamp": "2024-..."
}
```

### Test 2: Obtener canciones

```javascript
fetch('http://localhost:3000/api/canciones')
    .then(r => r.json())
    .then(d => console.log('✅ Canciones:', d));
```

### Test 3: Crear canción

```javascript
API.crear({
    cantautor: 'Test Local',
    nombre: 'Canción de Prueba',
    tonoOriginal: 'C',
    bpm: 120,
    etiquetas: ['test'],
    notas: 'Prueba en localhost'
}).then(res => console.log('✅ Guardada:', res));
```

---

## ESTRUCTURA LOCAL FINAL

```
┌─ TERMINAL 1 ────────────────────┐
│ Backend Node.js                  │
│ http://localhost:3000            │
│ npm start en carpeta backend/    │
└──────────────────────────────────┘
                ↑
            (fetch)
                ↓
┌─ TERMINAL 2 ────────────────────┐
│ Frontend (estático)              │
│ http://localhost:5000            │
│ python -m http.server 5000       │
│ en carpeta frontend/             │
└──────────────────────────────────┘
                ↑
           (abre en)
                ↓
┌─ NAVEGADOR ──────────────────────┐
│ http://localhost:5000/index.html │
│ Interactúas con la app           │
└──────────────────────────────────┘
```

---

## ✅ FASE 4 - CHECKLIST

```
[ ] Backend .env configurado (PORT=3000, FRONTEND_URL=http://localhost:5000)
[ ] frontend/js/api.js apunta a localhost:3000
[ ] Terminal 1: npm start en backend/ ✅
[ ] Terminal 2: python -m http.server 5000 en frontend/ ✅
[ ] Abro http://localhost:5000/index.html en navegador
[ ] Consola: fetch health check devuelve OK
[ ] Crear canción → se guarda en BD local
[ ] Recargar página → canción sigue ahí
[ ] Buscar canción → funciona
[ ] Editar canción → se actualiza en BD
[ ] Eliminar canción → se borra de BD
```

---

## 🧪 COMANDOS RÁPIDOS (Copiar/Pegar)

**Terminal 1 (Backend):**
```bash
cd backend && npm start
```

**Terminal 2 (Frontend):**
```bash
cd frontend && python -m http.server 5000
```

**Navegador:**
```
http://localhost:5000/index.html
```

---

## 📝 ARCHIVOS MODIFICADOS EN FASE 4

### Cambio 1: `backend/.env`
```env
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5000
```

### Cambio 2: `frontend/js/api.js`
En la línea donde defines `API_URL`:

```javascript
const API_URL = (() => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3000/api';
    }
    return 'https://transposicion-backend-production.up.railway.app/api';
})();
```

---

## ⚠️ IMPORTANTE

**NO SUBAS A GITHUB ESTOS CAMBIOS:**

```bash
git restore backend/.env
git restore frontend/js/api.js
```

O agrega a `.gitignore`:

```
.env
.env.local
.env.*.local
```

El `.env.example` ya debe estar commitido con valores de ejemplo.

---

## 🔄 FLUJO DE DESARROLLO

```
1. Modificas algo en frontend/
   ↓
2. Recargas navegador (Ctrl+R)
   ↓
3. Pruebas en tiempo real
   ↓
4. Si funciona, continúas
   ↓
5. Backend sigue corriendo, BD persiste

NO NECESITAS REINICIAR NADA
```

---

## 🚀 DESPUÉS DE FASE 4

Ya puedes:
- ✅ Agregar nuevas funcionalidades
- ✅ Probarlas en localhost
- ✅ Ver datos persistir en BD
- ✅ No depender de hosting

Cuando quieras ir a producción:
1. Cambias `api.js` para usar Railway
2. Subes a GitHub
3. Vercel y Railway despliegan automáticamente

**Sin tocar el resto del código.**

---

## 🆘 TROUBLESHOOTING

### "Cannot reach backend"
**Solución:** Verifica que Terminal 1 tiene `npm start` corriendo

### "CORS Error"
**Solución:** Verifica que `.env` tiene `FRONTEND_URL=http://localhost:5000`

### "Puerto 5000 en uso"
**Solución:** Usa otro puerto
```bash
python -m http.server 8000  # Usa puerto 8000 en lugar de 5000
```

### "API devuelve 404"
**Solución:** Verifica que URL en `api.js` es `http://localhost:3000/api`

### "BD está vacía"
**Solución:** Es normal. Backend crea BD vacía. Crea la primera canción para probar.

---

## 💡 TIPS DE DESARROLLO

### Tip 1: Reload automático
Usa Live Server en VS Code (extensión gratis) para reload automático.

### Tip 2: DevTools
Abre DevTools (F12) → Network tab para ver todas las llamadas a API.

### Tip 3: Console logs
En `backend/routes/canciones.js` puedes agregar `console.log()` para debug:

```javascript
router.post('/', validarCancion, (req, res, next) => {
    console.log('📝 Creando canción:', req.body);  // ← AGREGAR ESTO
    // ... resto del código
});
```

### Tip 4: Reset BD
Si quieres empezar con BD vacía:
```bash
rm backend/canciones.db
npm start  # Crea BD nueva
```

---

## 🎯 PRÓXIMA FASE (Opcional)

Cuando tengas todas las funcionalidades listas en localhost, puedes ir a **FASE 5: DEPLOY A PRODUCCIÓN** que incluye:
- Cambiar URLs a hosting real
- Subir a GitHub
- Deploy automático en Railway + Vercel

---

## 📊 COMPARATIVA: Local vs Producción

| Aspecto | Local (Ahora) | Producción (Después) |
|--------|----------|------|
| Backend | `localhost:3000` | Railway |
| Frontend | `localhost:5000` | Vercel |
| BD | Tu máquina | Railway |
| Acceso | Solo en tu PC | Desde internet |
| Costo | $0 | $0 |
| Setup | 5 min | 30 min |

---

## 📝 INSTRUCCIONES PARA CLAUDE CODE - FASE 4

Si necesitas que Claude Code te ayude:

```
"Necesito configurar mi app para desarrollo local sin hosting:

1. Crear/modificar backend/.env con:
   PORT=3000
   NODE_ENV=development
   FRONTEND_URL=http://localhost:5000

2. Modificar frontend/js/api.js para:
   - Detectar si está en localhost
   - Si sí, usar http://localhost:3000/api
   - Si no, usar URL de Railway

3. Crear frontend/.env con:
   API_URL=http://localhost:3000/api
"
```

---

¡Listo! Ahora desarrolla en localhost sin preocuparte por hosting. 🚀
