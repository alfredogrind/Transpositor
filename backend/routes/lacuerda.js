const express = require('express');
const router  = express.Router();

// Proxy server-side para obtener HTML de acordes.lacuerda.net
// (evita el bloqueo CORS del navegador)
router.get('/', async (req, res, next) => {
    try {
        const { url } = req.query;
        if (!url) return res.status(400).json({ error: 'Parámetro "url" requerido.' });

        let parsed;
        try { parsed = new URL(url); }
        catch { return res.status(400).json({ error: 'URL inválida.' }); }

        if (parsed.hostname !== 'acordes.lacuerda.net') {
            return res.status(400).json({ error: 'Solo se permiten URLs de acordes.lacuerda.net.' });
        }
        if (!parsed.pathname.endsWith('.shtml')) {
            return res.status(400).json({ error: 'La URL debe apuntar a una página .shtml de LaCuerda.' });
        }

        const response = await fetch(parsed.href, {
            headers: {
                'User-Agent':      'Mozilla/5.0 (compatible; TranspositorPro/1.0)',
                'Accept':          'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'es-ES,es;q=0.9,en;q=0.7',
            },
            redirect: 'follow',
        });

        if (!response.ok) {
            return res.status(502).json({ error: `LaCuerda respondió con error ${response.status}.` });
        }

        // Detectar charset (LaCuerda puede servir ISO-8859-1 o UTF-8)
        const contentType  = response.headers.get('content-type') ?? '';
        const charsetMatch = contentType.match(/charset=([^\s;]+)/i);
        const charset      = charsetMatch ? charsetMatch[1] : 'utf-8';

        const buffer = await response.arrayBuffer();
        const html   = new TextDecoder(charset).decode(buffer);

        res.json({ data: html });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
