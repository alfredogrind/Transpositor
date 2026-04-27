const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const dbPath = process.env.DATABASE_URL || path.join(__dirname, 'canciones.db');
let db;

const initDB = () => {
    db = new DatabaseSync(dbPath);
    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA foreign_keys = ON');

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

    // Migrations — ALTER TABLE has no IF NOT EXISTS; wrap each in try/catch
    [
        `ALTER TABLE canciones ADD COLUMN tono_destino TEXT`,
        `ALTER TABLE canciones ADD COLUMN cejilla INTEGER`,
        `ALTER TABLE canciones ADD COLUMN tipo_notacion TEXT DEFAULT 'latin'`,
        `ALTER TABLE canciones ADD COLUMN letra_acordes TEXT`,
        `ALTER TABLE canciones ADD COLUMN user_id TEXT`,
    ].forEach(sql => { try { db.exec(sql); } catch (_) {} });

    db.exec(`
        CREATE TABLE IF NOT EXISTS setlists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            descripcion TEXT DEFAULT '',
            color TEXT DEFAULT '#667eea',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.exec(`
        CREATE TABLE IF NOT EXISTS setlist_canciones (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            setlist_id INTEGER NOT NULL,
            cancion_id INTEGER NOT NULL,
            posicion INTEGER DEFAULT 0,
            UNIQUE(setlist_id, cancion_id),
            FOREIGN KEY (setlist_id) REFERENCES setlists(id) ON DELETE CASCADE,
            FOREIGN KEY (cancion_id) REFERENCES canciones(id) ON DELETE CASCADE
        )
    `);

    db.exec(`
        CREATE TABLE IF NOT EXISTS favoritos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cancion_id INTEGER NOT NULL UNIQUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (cancion_id) REFERENCES canciones(id) ON DELETE CASCADE
        )
    `);

    // Indexes
    db.exec('CREATE INDEX IF NOT EXISTS idx_cantautor  ON canciones(cantautor)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_nombre     ON canciones(nombre)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_tono       ON canciones(tono_original)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_bpm        ON canciones(bpm)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_created_at ON canciones(created_at)');

    console.log('✅ Base de datos inicializada');
    return db;
};

const getDB = () => {
    if (!db) throw new Error('Base de datos no inicializada');
    return db;
};

module.exports = { initDB, getDB };
