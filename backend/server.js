const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { initDB } = require('./database');
const cancionesRouter  = require('./routes/canciones');
const setlistsRouter   = require('./routes/setlists');
const favoritosRouter  = require('./routes/favoritos');
const errorHandler     = require('./middleware/errorHandler');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
            return callback(null, true);
        }
        if (origin === process.env.FRONTEND_URL) return callback(null, true);
        callback(new Error('CORS: origen no permitido'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));

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

app.get('/api/health', (req, res) => res.json({ status: 'OK', timestamp: new Date().toISOString() }));

app.use(errorHandler);
app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

app.listen(PORT, () => {
    console.log(`🚀 Servidor en puerto ${PORT}`);
    console.log(`📡 http://localhost:${PORT}/api/canciones`);
    console.log(`📡 http://localhost:${PORT}/api/setlists`);
    console.log(`📡 http://localhost:${PORT}/api/favoritos`);
});
