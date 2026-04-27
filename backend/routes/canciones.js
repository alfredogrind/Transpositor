const express = require('express');
const router = express.Router();
const { getDB } = require('../database');
const { validarCancion } = require('../middleware/validation');

function formatCancion(c) {
    return { ...c, etiquetas: JSON.parse(c.etiquetas || '[]') };
}

// GET / — unified list with filters, sort, pagination
router.get('/', (req, res, next) => {
    try {
        const db = getDB();
        const {
            q = '', key = '', tag = '', sort = 'recent',
            page = '1', limit = '100', favoritos = ''
        } = req.query;

        const pageNum  = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(200, Math.max(1, parseInt(limit) || 100));
        const offset   = (pageNum - 1) * limitNum;

        let base = 'FROM canciones c';
        if (favoritos === '1') base += ' INNER JOIN favoritos f ON f.cancion_id = c.id';

        const conditions = [];
        const params = [];

        if (q.trim()) {
            conditions.push('(c.cantautor LIKE ? OR c.nombre LIKE ? OR c.etiquetas LIKE ?)');
            const t = `%${q.trim()}%`;
            params.push(t, t, t);
        }
        if (key.trim()) {
            conditions.push('c.tono_original = ?');
            params.push(key.trim());
        }
        if (tag.trim()) {
            conditions.push('c.etiquetas LIKE ?');
            params.push(`%"${tag.trim()}"%`);
        }

        const where = conditions.length ? ' WHERE ' + conditions.join(' AND ') : '';
        const order = sort === 'alpha' ? ' ORDER BY c.nombre ASC' : ' ORDER BY c.created_at DESC';

        const total = db.prepare(`SELECT COUNT(*) as n ${base}${where}`).get(...params).n;
        const rows  = db.prepare(`SELECT c.* ${base}${where}${order} LIMIT ? OFFSET ?`)
                        .all(...params, limitNum, offset);

        res.json({ success: true, data: rows.map(formatCancion), total, page: pageNum, limit: limitNum });
    } catch (err) { next(err); }
});

// GET /stats — extended stats
router.get('/stats', (req, res, next) => {
    try {
        const db = getDB();

        const totalCanciones   = db.prepare('SELECT COUNT(*) as n FROM canciones').get().n;
        const totalCantautores = db.prepare('SELECT COUNT(DISTINCT cantautor) as n FROM canciones').get().n;
        const bpmRow           = db.prepare('SELECT AVG(bpm) as p FROM canciones WHERE bpm > 0').get();
        const tonoRow          = db.prepare(
            'SELECT tono_original, COUNT(*) as n FROM canciones WHERE tono_original IS NOT NULL GROUP BY tono_original ORDER BY n DESC LIMIT 1'
        ).get();
        const deltaEsteMes     = db.prepare(
            "SELECT COUNT(*) as n FROM canciones WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')"
        ).get().n;

        let totalSetlists = 0;
        try { totalSetlists = db.prepare('SELECT COUNT(*) as n FROM setlists').get().n; } catch (_) {}

        res.json({
            success: true,
            data: {
                totalCanciones,
                totalCantautores,
                bpmPromedio: Math.round(bpmRow?.p || 0),
                tonoMasFrecuente: tonoRow?.tono_original || null,
                tonoMasFrecuenteCount: tonoRow?.n || 0,
                deltaEsteMes,
                totalSetlists,
            }
        });
    } catch (err) { next(err); }
});

// POST / — create
router.post('/', validarCancion, (req, res, next) => {
    try {
        const { cantautor, nombre, tono_original, bpm, etiquetas, notas,
                tono_destino, cejilla, tipo_notacion, letra_acordes } = req.body;
        const db = getDB();

        const r = db.prepare(`
            INSERT INTO canciones
                (cantautor, nombre, tono_original, bpm, etiquetas, notas,
                 tono_destino, cejilla, tipo_notacion, letra_acordes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            cantautor.trim(), nombre.trim(),
            tono_original || null, bpm || null,
            JSON.stringify(Array.isArray(etiquetas) ? etiquetas : []),
            notas?.trim() || null,
            tono_destino || null, cejilla || null,
            tipo_notacion || 'latin', letra_acordes || null
        );

        res.status(201).json({ success: true, data: { id: r.lastInsertRowid } });
    } catch (err) { next(err); }
});

// PUT /:id — update
router.put('/:id', validarCancion, (req, res, next) => {
    try {
        const { cantautor, nombre, tono_original, bpm, etiquetas, notas,
                tono_destino, cejilla, tipo_notacion, letra_acordes } = req.body;
        const db = getDB();

        const existe = db.prepare('SELECT id FROM canciones WHERE id = ?').get(req.params.id);
        if (!existe) return res.status(404).json({ success: false, error: 'Canción no encontrada' });

        db.prepare(`
            UPDATE canciones
            SET cantautor = ?, nombre = ?, tono_original = ?, bpm = ?,
                etiquetas = ?, notas = ?, tono_destino = ?, cejilla = ?,
                tipo_notacion = ?, letra_acordes = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(
            cantautor.trim(), nombre.trim(),
            tono_original || null, bpm || null,
            JSON.stringify(Array.isArray(etiquetas) ? etiquetas : []),
            notas?.trim() || null,
            tono_destino || null, cejilla || null,
            tipo_notacion || 'latin', letra_acordes || null,
            req.params.id
        );

        res.json({ success: true });
    } catch (err) { next(err); }
});

// DELETE /:id
router.delete('/:id', (req, res, next) => {
    try {
        const db = getDB();
        const existe = db.prepare('SELECT id FROM canciones WHERE id = ?').get(req.params.id);
        if (!existe) return res.status(404).json({ success: false, error: 'Canción no encontrada' });
        db.prepare('DELETE FROM canciones WHERE id = ?').run(req.params.id);
        res.json({ success: true });
    } catch (err) { next(err); }
});

module.exports = router;
