const express = require('express');

module.exports = (pool, verificarToken, productosClient) => {
    const router = express.Router();

    router.get('/recomendaciones', verificarToken, async (req, res) => {
        const usuarioId = req.usuario.id;
        const limit = parseInt(req.query.limit) || 5;

        try {
            const data = await productosClient.getRecommendations(usuarioId, limit);
            return res.json(data);
        } catch (err) {
            console.error('[GET /api/productos/recomendaciones]', err);
            return res.status(500).json({ productos: [] });
        }
    });

    router.get('/lista', verificarToken, async (req, res) => {
        try {
            const data = await productosClient.getProductos();
            return res.json(data);
        } catch (err) {
            console.error('[GET /api/productos/lista]', err);
            return res.status(502).json({ error: 'Servicio de catálogo no disponible.' });
        }
    });

    return router;
};