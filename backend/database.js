const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const dbPath = process.env.DATABASE_URL || path.join(__dirname, 'canciones.db');
let db;

const initDB = () => {
    db = new DatabaseSync(dbPath);
    db.exec('PRAGMA journal_mode = WAL');

    db.exec(`
        CREATE TABLE IF NOT EXISTS canciones (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cantautor TEXT NOT NULL,
            nombre TEXT NOT NULL UNIQUE,
            tono_original TEXT,
            bpm INTEGER,
            etiquetas TEXT NOT NULL DEFAULT '[]',
            notas TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.exec('CREATE INDEX IF NOT EXISTS idx_cantautor ON canciones(cantautor)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_nombre ON canciones(nombre)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_tono ON canciones(tono_original)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_bpm ON canciones(bpm)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_created_at ON canciones(created_at)');

    console.log('✅ Base de datos inicializada');
    return db;
};

const getDB = () => {
    if (!db) {
        throw new Error('Base de datos no inicializada');
    }
    return db;
};

module.exports = { initDB, getDB };
