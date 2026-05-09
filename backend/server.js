const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { initDB } = require('./database');
const cancionesRouter  = require('./routes/canciones');
const setlistsRouter   = require('./routes/setlists');
const favoritosRouter  = require('./routes/favoritos');
const lacuerdaRouter   = require('./routes/lacuerda');
const cifraclubRouter  = require('./routes/cifraclub');
const errorHandler     = require('./middleware/errorHandler');

const app  = express();
const PORT = process.env.PORT || 3000;

/*app.use(cors({
    origin: (origin, callback) => {
        // Permitir localhost en cualquier puerto y el FRONTEND_URL
        const isLocalhost = !origin ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        origin === process.env.FRONTEND_URL;

        if (isLocalhost) {
            return callback(null, true);
        }
        callback(new Error('CORS: origen no permitido'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));
*/
app.use(cors({
    origin: function(origin, callback) {
        // Permitir:
        // 1. Sin origin (peticiones desde el mismo servidor)
        // 2. localhost en cualquier puerto
        // 3. ngrok
        // 4. FRONTEND_URL del .env
        const allowedOrigins = [
            'http://localhost:3000',
            'http://127.0.0.1:3000',
            'http://localhost:5500',
            'http://127.0.0.1:5500',
            process.env.FRONTEND_URL
        ];

        // Permitir cualquier origen que contenga 'ngrok'
        if (!origin || allowedOrigins.includes(origin) || (origin && origin.includes('ngrok'))) {
            callback(null, true);
        } else {
            console.warn(`⚠️ CORS bloqueado: ${origin}`);
            callback(null, true); // Permitir temporalmente para testing
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
}));


app.use(express.json({ limit: '10mb' }));

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, '../')));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use('/api/', limiter);

try {
    initDB();
} catch (error) {
    console.error('❌ Error al inicializar BD:', error);
    process.exit(1);
}

app.use('/api/canciones', cancionesRouter);
app.use('/api/setlists',  setlistsRouter);
app.use('/api/favoritos', favoritosRouter);
app.use('/api/lacuerda',  lacuerdaRouter);
app.use('/api/cifraclub', cifraclubRouter);

app.get('/api/health', (req, res) => res.json({ status: 'OK', timestamp: new Date().toISOString() }));

// Ruta fallback para SPA
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

app.use(errorHandler);
app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

app.listen(PORT, () => {
    console.log(`🚀 Servidor en puerto ${PORT}`);
    console.log(`📡 http://localhost:${PORT}/api/canciones`);
    console.log(`📡 http://localhost:${PORT}/api/setlists`);
    console.log(`📡 http://localhost:${PORT}/api/favoritos`);
});
