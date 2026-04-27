const express = require('express');
const router = express.Router();
const { getDB } = require('../database');

// GET / — all favorited songs
router.get('/', (req, res, next) => {
    try {
        const db = getDB();
        const rows = db.prepare(`
            SELECT c.* FROM canciones c
            INNER JOIN favoritos f ON f.cancion_id = c.id
            ORDER BY f.created_at DESC
        `).all();
        res.json({
            success: true,
            data: rows.map(c => ({ ...c, etiquetas: JSON.parse(c.etiquetas || '[]') }))
        });
    } catch (err) { next(err); }
});

// POST /:id — toggle favorite (add if missing, remove if present)
router.post('/:id', (req, res, next) => {
    try {
        const db = getDB();
        const cancion_id = parseInt(req.params.id);
        const existing = db.prepare('SELECT id FROM favoritos WHERE cancion_id = ?').get(cancion_id);
        if (existing) {
            db.prepare('DELETE FROM favoritos WHERE cancion_id = ?').run(cancion_id);
            res.json({ success: true, favorito: false });
        } else {
            db.prepare('INSERT INTO favoritos (cancion_id) VALUES (?)').run(cancion_id);
            res.json({ success: true, favorito: true });
        }
    } catch (err) { next(err); }
});

module.exports = router;
