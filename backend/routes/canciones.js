const express = require('express');
const router = express.Router();
const { getDB } = require('../database');
const { validarCancion } = require('../middleware/validation');

router.get('/', (req, res, next) => {
    try {
        const db = getDB();
        const canciones = db.prepare('SELECT * FROM canciones ORDER BY created_at DESC').all();

        const cancionesFormateadas = canciones.map(c => ({
            ...c,
            etiquetas: JSON.parse(c.etiquetas || '[]')
        }));

        res.json({
            success: true,
            data: cancionesFormateadas,
            total: cancionesFormateadas.length
        });
    } catch (error) {
        next(error);
    }
});

router.get('/search', (req, res, next) => {
    try {
        const { q = '', bpmMin, bpmMax, tono } = req.query;
        const db = getDB();

        let query = 'SELECT * FROM canciones WHERE 1=1';
        const params = [];

        if (q && q.trim()) {
            query += ` AND (cantautor LIKE ? OR nombre LIKE ? OR etiquetas LIKE ?)`;
            const searchTerm = `%${q.trim()}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        if (bpmMin) {
            query += ' AND bpm >= ?';
            params.push(parseInt(bpmMin));
        }

        if (bpmMax) {
            query += ' AND bpm <= ?';
            params.push(parseInt(bpmMax));
        }

        if (tono && tono !== 'null') {
            query += ' AND tono_original = ?';
            params.push(tono);
        }

        query += ' ORDER BY created_at DESC';

        const resultados = db.prepare(query).all(...params);

        const cancionesFormateadas = resultados.map(c => ({
            ...c,
            etiquetas: JSON.parse(c.etiquetas || '[]')
        }));

        res.json({
            success: true,
            data: cancionesFormateadas,
            total: cancionesFormateadas.length
        });
    } catch (error) {
        next(error);
    }
});

router.get('/stats', (req, res, next) => {
    try {
        const db = getDB();

        const totalCanciones = db.prepare('SELECT COUNT(*) as count FROM canciones').get();
        const totalCantautores = db.prepare('SELECT COUNT(DISTINCT cantautor) as count FROM canciones').get();
        const bpmPromedio = db.prepare('SELECT AVG(bpm) as promedio FROM canciones WHERE bpm > 0').get();

        res.json({
            success: true,
            data: {
                totalCanciones: totalCanciones.count,
                totalCantautores: totalCantautores.count,
                bpmPromedio: Math.round(bpmPromedio.promedio || 0)
            }
        });
    } catch (error) {
        next(error);
    }
});

router.post('/', validarCancion, (req, res, next) => {
    try {
        const { cantautor, nombre, tono_original, bpm, etiquetas, notas } = req.body;
        const db = getDB();

        const stmt = db.prepare(`
            INSERT INTO canciones (cantautor, nombre, tono_original, bpm, etiquetas, notas)
            VALUES (?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            cantautor.trim(),
            nombre.trim(),
            tono_original || null,
            bpm || null,
            JSON.stringify(etiquetas || []),
            notas?.trim() || null
        );

        res.status(201).json({
            success: true,
            message: 'Canción creada exitosamente',
            data: {
                id: result.lastInsertRowid,
                cantautor,
                nombre,
                tono_original,
                bpm,
                etiquetas,
                notas
            }
        });
    } catch (error) {
        next(error);
    }
});

router.put('/:id', validarCancion, (req, res, next) => {
    try {
        const { id } = req.params;
        const { cantautor, nombre, tono_original, bpm, etiquetas, notas } = req.body;
        const db = getDB();

        const existe = db.prepare('SELECT id FROM canciones WHERE id = ?').get(id);
        if (!existe) {
            return res.status(404).json({ success: false, error: 'Canción no encontrada' });
        }

        const stmt = db.prepare(`
            UPDATE canciones
            SET cantautor = ?, nombre = ?, tono_original = ?, bpm = ?,
                etiquetas = ?, notas = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);

        stmt.run(
            cantautor.trim(),
            nombre.trim(),
            tono_original || null,
            bpm || null,
            JSON.stringify(etiquetas || []),
            notas?.trim() || null,
            id
        );

        res.json({
            success: true,
            message: 'Canción actualizada exitosamente',
            data: { id, cantautor, nombre, tono_original, bpm, etiquetas, notas }
        });
    } catch (error) {
        next(error);
    }
});

router.delete('/:id', (req, res, next) => {
    try {
        const { id } = req.params;
        const db = getDB();

        const existe = db.prepare('SELECT id FROM canciones WHERE id = ?').get(id);
        if (!existe) {
            return res.status(404).json({ success: false, error: 'Canción no encontrada' });
        }

        db.prepare('DELETE FROM canciones WHERE id = ?').run(id);

        res.json({
            success: true,
            message: 'Canción eliminada exitosamente'
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
