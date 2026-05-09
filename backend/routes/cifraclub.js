const express = require('express');
const router  = express.Router();

const ALLOWED_HOSTNAMES = new Set([
    'www.cifraclub.com',
    'cifraclub.com',
    'www.cifraclub.com.br',
    'cifraclub.com.br',
]);

// Proxy server-side para obtener HTML de cifraclub.com / cifraclub.com.br
// (evita el bloqueo CORS del navegador)
router.get('/', async (req, res, next) => {
    try {
        const { url } = req.query;
        if (!url) return res.status(400).json({ error: 'Parámetro "url" requerido.' });

        let parsed;
        try { parsed = new URL(url); }
        catch { return res.status(400).json({ error: 'URL inválida.' }); }

        if (!ALLOWED_HOSTNAMES.has(parsed.hostname)) {
            return res.status(400).json({ error: 'Solo se permiten URLs de cifraclub.com o cifraclub.com.br.' });
        }

        const response = await fetch(parsed.href, {
            headers: {
                'User-Agent':      'Mozilla/5.0 (compatible; TranspositorPro/1.0)',
                'Accept':          'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'es-ES,es;q=0.9,pt-BR;q=0.8,pt;q=0.7,en;q=0.6',
            },
            redirect: 'follow',
        });

        if (!response.ok) {
            return res.status(502).json({ error: `CifraClub respondió con error ${response.status}.` });
        }

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
