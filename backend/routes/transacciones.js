const express = require('express');
const router  = express.Router();

module.exports = (pool, verificarToken, io) => {

    // DEV ONLY: endpoint para que el mock de pagos pueda consultar el estado
    // y simular redirecciones automáticas cuando se cambia el estado en Postman.
    router.get('/public/:id/estado', async (req, res) => {
        // Disponible solo en entornos no-productivos (para mocks/pruebas locales)
        if (process.env.NODE_ENV === 'production') {
            return res.status(404).json({ error: 'Not found' });
        }

        const { id } = req.params;
        try {
            const resultado = await pool.query(
                'SELECT id, estado, updated_at FROM transacciones WHERE id = $1',
                [id]
            );

            if (resultado.rows.length === 0) {
                return res.status(404).json({ error: 'Transacción no encontrada.' });
            }

            // Evitar caching/304 en navegador (el mock depende de ver el cambio inmediatamente)
            res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.set('Pragma', 'no-cache');
            res.set('Expires', '0');
            // Fuerza respuesta 200 (cambia cada vez) aunque el cliente mande If-None-Match
            res.set('ETag', `W/\"${Date.now()}\"`);
            return res.json({ transaccion: resultado.rows[0] });
        } catch (err) {
            console.error('[GET /api/transacciones/public/:id/estado]', err);
            return res.status(500).json({ error: 'Error interno al obtener el estado.' });
        }
    });

    // GET / - Obtener todas las transacciones del usuario
    router.get('/', verificarToken, async (req, res) => {
        const usuarioId = req.usuario.id;

        try {
            const resultado = await pool.query(
                `SELECT id, usuario_id, usuario_email, items, total, moneda, estado, 
                        referencia_pago_externa, created_at, updated_at
                 FROM   transacciones
                 WHERE  usuario_id = $1
                 ORDER  BY created_at DESC`,
                [usuarioId]
            );

            return res.json({
                total: resultado.rows.length,
                transacciones: resultado.rows
            });

        } catch (err) {
            console.error('[GET /api/transacciones]', err);
            return res.status(500).json({ error: 'Error interno al obtener las transacciones.' });
        }
    });

    // GET /:id - Obtener una transacción específica
    router.get('/:id', verificarToken, async (req, res) => {
        const { id } = req.params;
        const usuarioId = req.usuario.id;

        try {
            const resultado = await pool.query(
                `SELECT id, usuario_id, usuario_email, items, total, moneda, estado,
                        referencia_pago_externa, created_at, updated_at
                 FROM   transacciones
                 WHERE  id = $1 AND usuario_id = $2`,
                [id, usuarioId]
            );

            if (resultado.rows.length === 0) {
                return res.status(404).json({ error: 'Transacción no encontrada.' });
            }

            return res.json({ transaccion: resultado.rows[0] });

        } catch (err) {
            console.error('[GET /api/transacciones/:id]', err);
            return res.status(500).json({ error: 'Error interno al obtener la transacción.' });
        }
    });

    // PATCH /:id/estado - Actualizar estado de transacción
    router.patch('/:id/estado', verificarToken, async (req, res) => {
        const { id } = req.params;
        const { estado } = req.body;
        const usuarioId = req.usuario.id;

        const ESTADOS_VALIDOS = ['PENDIENTE', 'APROBADA', 'RECHAZADA'];

        if (!estado || !ESTADOS_VALIDOS.includes(estado)) {
            return res.status(400).json({
                error: `Estado inválido. Los estados permitidos son: ${ESTADOS_VALIDOS.join(', ')}.`
            });
        }

        try {
            const existe = await pool.query(
                'SELECT id, estado FROM transacciones WHERE id = $1 AND usuario_id = $2',
                [id, usuarioId]
            );

            if (existe.rows.length === 0) {
                return res.status(404).json({ error: 'Transacción no encontrada.' });
            }

            const resultado = await pool.query(
                `UPDATE transacciones
                 SET    estado = $1,
                        updated_at = NOW()
                 WHERE  id = $2
                 RETURNING id, usuario_id, usuario_email, items, total, moneda, estado,
                           referencia_pago_externa, created_at, updated_at`,
                [estado, id]
            );

            const transaccionActualizada = resultado.rows[0];
            io.of('/pedidos').to(`usuario_${usuarioId}`).emit('transaccion:actualizada', {
                transaccion: transaccionActualizada
            });

            return res.json({
                mensaje: 'Estado actualizado correctamente.',
                transaccion: transaccionActualizada
            });

        } catch (err) {
            console.error('[PATCH /api/transacciones/:id/estado]', err);
            return res.status(500).json({ error: 'Error interno al actualizar el estado.' });
        }
    });

    return router;
};
