/**
 * Rutas de panel de vendedor
 * Lista pedidos que contienen productos del vendor autenticado
 * y permite cambiar el estado de los pedidos
 */

const express = require('express');
const verificarRol = require('./vendedorMiddleware');
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
     * GET /api/vendedor/pedidos
     * Lista pedidos que contienen productos del vendedor autenticado
     */
    router.get('/pedidos', verificarToken, verificarRol('vendedor'), async (req, res) => {
        const vendorId = req.usuario.vendor_id;

        if (!vendorId) {
            return res.status(400).json({ error: 'Vendedor sin vendor_id configurado.' });
        }

        try {
            const resultado = await pool.query(
                `SELECT id, usuario_id, estado, items, monto_total,
                        transaccion_id, created_at, updated_at
                 FROM   pedidos
                 WHERE  items::jsonb @> $1::jsonb
                 ORDER  BY created_at DESC`,
                [JSON.stringify([{ vendor_id: String(vendorId) }])]
            );

            const pedidosFiltrados = resultado.rows.filter(pedido => {
                const items = typeof pedido.items === 'string'
                    ? JSON.parse(pedido.items)
                    : (pedido.items || []);
                return items.some(item =>
                    String(item.vendor_id || item.vendorId || '') === String(vendorId)
                );
            });

            return res.json({
                total: pedidosFiltrados.length,
                pedidos: pedidosFiltrados
            });

        } catch (err) {
            console.error('[GET /api/vendedor/pedidos]', err);
            return res.status(500).json({ error: 'Error interno al obtener los pedidos del vendedor.' });
        }
    });

    /**
     * PATCH /api/vendedor/pedidos/:id/estado
     * Cambia el estado de un pedido (solo vendedor puede hacerlo)
     * Máquina de estados:
     *   PENDIENTE → PROCESANDO
     *   PROCESANDO → ENVIADO
     *   ENVIADO → ENTREGADO
     *   PENDIENTE/PROCESANDO → CANCELADO (no desde ENVIADO/ENTREGADO)
     */
    router.patch('/pedidos/:id/estado', verificarToken, verificarRol('vendedor'), async (req, res) => {
        const { id } = req.params;
        const vendorId = req.usuario.vendor_id;

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
                `SELECT id, estado, items, usuario_id FROM pedidos WHERE id = $1`,
                [id]
            );

            if (existe.rows.length === 0) {
                return res.status(404).json({ error: 'Pedido no encontrado.' });
            }

            const pedido = existe.rows[0];
            const items = typeof pedido.items === 'string'
                ? JSON.parse(pedido.items)
                : (pedido.items || []);

            const perteneceAlVendor = items.some(item =>
                String(item.vendor_id || item.vendorId || '') === String(vendorId)
            );

            if (!perteneceAlVendor) {
                return res.status(403).json({ error: 'No tienes permiso para cambiar este pedido.' });
            }

            const estadoActual = pedido.estado;
            const transicionesPermitidas = TRANSICIONES_VALIDAS[estadoActual] || [];

            if (!transicionesPermitidas.includes(estado)) {
                return res.status(400).json({
                    error: `Transición inválida. De "${estadoActual}" solo puedes pasar a: ${transicionesPermitidas.join(', ') || 'ninguno'}.`,
                    transiciones_permitidas: transicionesPermitidas
                });
            }

            const resultado = await pool.query(
                `UPDATE pedidos
                 SET    estado = $1, updated_at = NOW()
                 WHERE  id = $2
                 RETURNING id, usuario_id, estado, items, monto_total,
                           transaccion_id, created_at, updated_at`,
                [estado, id]
            );

            await pool.query(
                `INSERT INTO log_estados (pedido_id, estado_anterior, estado_nuevo, cambiado_por, cambiado_por_tipo)
                 VALUES ($1, $2, $3, $4, 'vendedor')`,
                [id, estadoActual, estado, req.usuario.id]
            );

            const pedidoActualizado = resultado.rows[0];

            if (io) {
                io.of('/pedidos').to(`usuario_${pedidoActualizado.usuario_id}`).emit('pedido:estado-cambiado', {
                    pedidoId: pedidoActualizado.id,
                    nuevoEstado: estado,
                    cambiadoPor: 'vendedor'
                });
                io.of('/pedidos').to(`vendedor_${vendorId}`).emit('pedido:estado-cambiado', {
                    pedidoId: pedidoActualizado.id,
                    nuevoEstado: estado,
                    cambiadoPor: 'vendedor'
                });
            }

            // BUG-03: Notificar cambio de estado (fire-and-forget)
            try {
                await notificacionesClient.notificarCambioEstado(id, estado, {
                    estado_anterior: estadoActual,
                    cambiado_por: req.usuario.id,
                    cambiado_por_tipo: 'vendedor'
                });
            } catch (notifErr) {
                console.error('[PATCH /vendedor/pedidos/:id/estado] Error notificando cambio:', notifErr.message);
            }

            return res.json({
                mensaje: 'Estado actualizado correctamente.',
                pedido: pedidoActualizado
            });

        } catch (err) {
            console.error('[PATCH /api/vendedor/pedidos/:id/estado]', err);
            return res.status(500).json({ error: 'Error interno al actualizar el estado del pedido.' });
        }
    });

    return router;
};
