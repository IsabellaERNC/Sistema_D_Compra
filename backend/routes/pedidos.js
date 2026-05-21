const express = require('express');
const pagosClient = require('../services/pagosClient');
const notificacionesClient = require('../services/notificacionesPedidosClient'); // BUG-03

module.exports = (pool, verificarToken, io) => {
    const router = express.Router();

    // BUG-01: Estados y transiciones en UPPERCASE (canónico del schema)
    const ESTADOS_VALIDOS = ['PENDIENTE', 'PROCESANDO', 'ENVIADO', 'ENTREGADO', 'CANCELADO'];

    const TRANSICIONES_VALIDAS = {
        'PENDIENTE':  ['PROCESANDO', 'CANCELADO'],
        'PROCESANDO': ['ENVIADO',    'CANCELADO'],
        'ENVIADO':    ['ENTREGADO'],
        'ENTREGADO':  [],
        'CANCELADO':  []
    };

    /**
     * GET /api/pedidos
     * Lista los pedidos del usuario autenticado
     */
    router.get('/', verificarToken, async (req, res) => {
        const usuarioId = req.usuario.id;

        try {
            const resultado = await pool.query(
                `SELECT id, usuario_id, estado, items, monto_total,
                        direccion_envio_id, transaccion_id, created_at, updated_at
                 FROM   pedidos
                 WHERE  usuario_id = $1
                 ORDER  BY created_at DESC`,
                [usuarioId]
            );

            return res.json({
                total: resultado.rows.length,
                pedidos: resultado.rows
            });
        } catch (err) {
            console.error('[GET /api/pedidos]', err);
            return res.status(500).json({ error: 'Error interno al obtener los pedidos.' });
        }
    });

    /**
     * GET /api/pedidos/:id
     * Detalle de un pedido específico del usuario autenticado
     */
    router.get('/:id', verificarToken, async (req, res) => {
        const { id } = req.params;
        const usuarioId = req.usuario.id;

        try {
            const resultado = await pool.query(
                `SELECT id, usuario_id, estado, items, monto_total,
                        direccion_envio_id, transaccion_id, created_at, updated_at
                 FROM   pedidos
                 WHERE  id = $1 AND usuario_id = $2`,
                [id, usuarioId]
            );

            if (resultado.rows.length === 0) {
                return res.status(404).json({ error: 'Pedido no encontrado.' });
            }

            return res.json({ pedido: resultado.rows[0] });
        } catch (err) {
            console.error('[GET /api/pedidos/:id]', err);
            return res.status(500).json({ error: 'Error interno al obtener el pedido.' });
        }
    });

    /**
     * PATCH /api/pedidos/:id/estado
     * Cambia el estado de un pedido validando las transiciones permitidas
     */
    router.patch('/:id/estado', verificarToken, async (req, res) => {
        const { id } = req.params;
        const usuarioId = req.usuario.id;

        // BUG-01: Normalizar entrada — acepta cualquier capitalización
        const estadoRaw = req.body.estado;
        const estado = typeof estadoRaw === 'string'
            ? estadoRaw.trim().toUpperCase()
            : estadoRaw;

        if (!estado || !ESTADOS_VALIDOS.includes(estado)) {
            return res.status(400).json({
                error: `Estado inválido. Los estados permitidos son: ${ESTADOS_VALIDOS.join(', ')}.`
            });
        }

        try {
            const existe = await pool.query(
                'SELECT id, estado FROM pedidos WHERE id = $1 AND usuario_id = $2',
                [id, usuarioId]
            );

            if (existe.rows.length === 0) {
                return res.status(404).json({ error: 'Pedido no encontrado.' });
            }

            const estadoActual = existe.rows[0].estado;
            const estadosPermitidos = TRANSICIONES_VALIDAS[estadoActual] || [];

            if (!estadosPermitidos.includes(estado)) {
                return res.status(400).json({
                    error: `Transición de estado inválida. No se puede cambiar de "${estadoActual}" a "${estado}".`
                });
            }

            const resultado = await pool.query(
                `UPDATE pedidos
                 SET    estado = $1,
                        updated_at = NOW()
                 WHERE  id = $2
                 RETURNING id, usuario_id, estado, items, monto_total,
                           direccion_envio_id, transaccion_id, created_at, updated_at`,
                [estado, id]
            );

            if (io) {
                const pedido = resultado.rows[0];
                io.of('/pedidos').to(`usuario_${usuarioId}`).emit('pedido:estado-cambiado', {
                    pedidoId: pedido.id,
                    nuevoEstado: estado,
                    pedido
                });
            }

            // BUG-03: Notificar cambio de estado (fire-and-forget)
            try {
                await notificacionesClient.notificarCambioEstado(id, estado, {
                    estado_anterior: estadoActual,
                    cambiado_por: req.usuario.id,
                    cambiado_por_tipo: 'usuario'
                });
            } catch (notifErr) {
                console.error('[PATCH /api/pedidos/:id/estado] Error notificando cambio:', notifErr.message);
            }

            return res.json({
                mensaje: 'Estado actualizado correctamente.',
                pedido: resultado.rows[0]
            });
        } catch (err) {
            console.error('[PATCH /api/pedidos/:id/estado]', err);
            return res.status(500).json({ error: 'Error interno al actualizar el estado del pedido.' });
        }
    });

    /**
     * POST /api/pedidos/:id/cancelar
     * Cancela un pedido en estado PENDIENTE o PROCESANDO y solicita reembolso si aplica
     */
    router.post('/:id/cancelar', verificarToken, async (req, res) => {
        const { id } = req.params;
        const usuarioId = req.usuario.id;

        try {
            const existe = await pool.query(
                'SELECT id, estado, transaccion_id FROM pedidos WHERE id = $1 AND usuario_id = $2',
                [id, usuarioId]
            );

            if (existe.rows.length === 0) {
                return res.status(404).json({ error: 'Pedido no encontrado.' });
            }

            const estadoActual = existe.rows[0].estado;

            // BUG-01: UPPERCASE para coincidir con valores del DB
            if (!['PENDIENTE', 'PROCESANDO'].includes(estadoActual)) {
                return res.status(400).json({
                    error: 'Solo puedes cancelar pedidos en estado PENDIENTE o PROCESANDO.'
                });
            }

            // BUG-01: UPPERCASE en el UPDATE
            await pool.query(
                `UPDATE pedidos SET estado = 'CANCELADO', updated_at = NOW() WHERE id = $1`,
                [id]
            );

            const transaccionId = existe.rows[0].transaccion_id;
            if (transaccionId) {
                const trans = await pool.query(
                    `SELECT id, estado FROM transacciones WHERE id = $1`,
                    [transaccionId]
                );

                // BUG-02: Condición corregida — reembolso procede si la transacción fue APROBADA
                if (trans.rows.length > 0 && trans.rows[0].estado === 'APROBADA') {
                    try {
                        await pagosClient.solicitarReembolso(transaccionId);
                        console.log(`[POST /api/pedidos/:id/cancelar] Reembolso solicitado para transaccion ${transaccionId}`);
                    } catch (refundErr) {
                        console.error('[POST /api/pedidos/:id/cancelar] Error en reembolso:', refundErr.message);
                        // Fire-and-forget: no bloquear respuesta por reembolso fallido
                    }
                    await pool.query(
                        `UPDATE transacciones SET estado = 'CANCELADA' WHERE id = $1`,
                        [transaccionId]
                    );
                }
            }

            if (io) {
                io.of('/pedidos').to(`usuario_${usuarioId}`).emit('pedido:estado-cambiado', {
                    pedidoId: id,
                    nuevoEstado: 'CANCELADO',
                    mensaje: 'Tu pedido ha sido cancelado.'
                });
            }

            // BUG-03: Notificar cancelación (fire-and-forget)
            try {
                await notificacionesClient.notificarCancelacion(id, 'Cancelado por el usuario');
            } catch (notifErr) {
                console.error('[POST /pedidos/:id/cancelar] Error notificando cancelación:', notifErr.message);
            }

            return res.json({ mensaje: 'Pedido cancelado exitosamente.' });
        } catch (err) {
            console.error('[POST /api/pedidos/:id/cancelar]', err);
            return res.status(500).json({ error: 'Error interno al cancelar el pedido.' });
        }
    });

    return router;
};
