const express = require('express');
const router = express.Router();
const { getDB } = require('../database');

function formatCancion(c) {
    return { ...c, etiquetas: JSON.parse(c.etiquetas || '[]') };
}

// GET / — all setlists with song count
router.get('/', (req, res, next) => {
    try {
        const db = getDB();
        const rows = db.prepare(`
            SELECT s.*, COUNT(sc.cancion_id) AS total_canciones
            FROM setlists s
            LEFT JOIN setlist_canciones sc ON sc.setlist_id = s.id
            GROUP BY s.id
            ORDER BY s.created_at DESC
        `).all();
        res.json({ success: true, data: rows });
    } catch (err) { next(err); }
});

// POST / — create setlist
router.post('/', (req, res, next) => {
    try {
        const db = getDB();
        const { nombre, descripcion = '', color = '#667eea' } = req.body;
        if (!nombre?.trim()) return res.status(400).json({ success: false, error: 'El nombre es requerido' });
        const r = db.prepare(
            'INSERT INTO setlists (nombre, descripcion, color) VALUES (?, ?, ?)'
        ).run(nombre.trim(), descripcion, color);
        res.status(201).json({ success: true, data: { id: r.lastInsertRowid, nombre, descripcion, color } });
    } catch (err) { next(err); }
});

// GET /:id — setlist with its songs
router.get('/:id', (req, res, next) => {
    try {
        const db = getDB();
        const sl = db.prepare('SELECT * FROM setlists WHERE id = ?').get(req.params.id);
        if (!sl) return res.status(404).json({ success: false, error: 'Setlist no encontrado' });
        const canciones = db.prepare(`
            SELECT c.*, sc.posicion FROM canciones c
            INNER JOIN setlist_canciones sc ON sc.cancion_id = c.id
            WHERE sc.setlist_id = ?
            ORDER BY sc.posicion ASC
        `).all(req.params.id);
        res.json({ success: true, data: { ...sl, canciones: canciones.map(formatCancion) } });
    } catch (err) { next(err); }
});

// PUT /:id — update setlist
router.put('/:id', (req, res, next) => {
    try {
        const db = getDB();
        const { nombre, descripcion = '', color = '#667eea' } = req.body;
        if (!nombre?.trim()) return res.status(400).json({ success: false, error: 'El nombre es requerido' });
        const exists = db.prepare('SELECT id FROM setlists WHERE id = ?').get(req.params.id);
        if (!exists) return res.status(404).json({ success: false, error: 'Setlist no encontrado' });
        db.prepare(
            'UPDATE setlists SET nombre = ?, descripcion = ?, color = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        ).run(nombre.trim(), descripcion, color, req.params.id);
        res.json({ success: true });
    } catch (err) { next(err); }
});

// DELETE /:id — delete setlist (cascade removes setlist_canciones)
router.delete('/:id', (req, res, next) => {
    try {
        const db = getDB();
        const exists = db.prepare('SELECT id FROM setlists WHERE id = ?').get(req.params.id);
        if (!exists) return res.status(404).json({ success: false, error: 'Setlist no encontrado' });
        db.prepare('DELETE FROM setlists WHERE id = ?').run(req.params.id);
        res.json({ success: true });
    } catch (err) { next(err); }
});

// POST /:id/canciones — add song to setlist
router.post('/:id/canciones', (req, res, next) => {
    try {
        const db = getDB();
        const { cancion_id } = req.body;
        if (!cancion_id) return res.status(400).json({ success: false, error: 'cancion_id requerido' });
        const maxRow = db.prepare('SELECT MAX(posicion) AS m FROM setlist_canciones WHERE setlist_id = ?').get(req.params.id);
        const posicion = (maxRow?.m ?? -1) + 1;
        db.prepare(
            'INSERT OR IGNORE INTO setlist_canciones (setlist_id, cancion_id, posicion) VALUES (?, ?, ?)'
        ).run(req.params.id, cancion_id, posicion);
        res.json({ success: true });
    } catch (err) { next(err); }
});

// DELETE /:id/canciones/:cancionId — remove song from setlist
router.delete('/:id/canciones/:cancionId', (req, res, next) => {
    try {
        const db = getDB();
        db.prepare('DELETE FROM setlist_canciones WHERE setlist_id = ? AND cancion_id = ?')
          .run(req.params.id, req.params.cancionId);
        res.json({ success: true });
    } catch (err) { next(err); }
});

module.exports = router;
