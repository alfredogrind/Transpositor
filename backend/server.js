const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { initDB } = require('./database');
const cancionesRouter = require('./routes/canciones');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
    origin: (origin, callback) => {
        // En desarrollo: permite cualquier localhost sin importar el puerto
        if (!origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
            return callback(null, true);
        }
        // En producción: solo el dominio configurado
        if (origin === process.env.FRONTEND_URL) {
            return callback(null, true);
        }
        callback(new Error('CORS: origen no permitido'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Demasiadas solicitudes, intenta más tarde'
});
app.use('/api/', limiter);

try {
    initDB();
} catch (error) {
    console.error('❌ Error al inicializar BD:', error);
    process.exit(1);
}

app.use('/api/canciones', cancionesRouter);

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor en puerto ${PORT}`);
    console.log(`🔒 CORS habilitado para: ${process.env.FRONTEND_URL}`);
    console.log(`📡 GET  http://localhost:${PORT}/api/health`);
    console.log(`📡 GET  http://localhost:${PORT}/api/canciones`);
});
