/**
 * Rutas de panel de vendedor
 * Lista pedidos que contienen productos del vendor autenticado
 * y permite cambiar el estado de los pedidos
 */

const express = require('express');
const verificarRol = require('./vendedorMiddleware');

module.exports = (pool, verificarToken, io) => {

    const router = express.Router();

    /**
     * GET /api/vendedor/pedidos
     * Lista pedidos que contienen productos del vendedor autenticado
     * Filtra por vendor_id en los items del pedido (JSONB)
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

            // Filtrar solo los pedidos donde al menos un item pertenece al vendor
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
     *   Pendiente → Procesando
     *   Procesando → Enviado
     *   Enviado → Entregado
     *   Pendiente/Procesando → Cancelado (no desde Enviado/Entregado)
     */
    router.patch('/pedidos/:id/estado', verificarToken, verificarRol('vendedor'), async (req, res) => {
        const { id } = req.params;
        const { estado } = req.body;
        const vendorId = req.usuario.vendor_id;

        const ESTADOS_VALIDOS = ['Pendiente', 'Procesando', 'Enviado', 'Entregado', 'Cancelado'];

        if (!estado || !ESTADOS_VALIDOS.includes(estado)) {
            return res.status(400).json({
                error: `Estado inválido. Los estados permitidos son: ${ESTADOS_VALIDOS.join(', ')}.`
            });
        }

        const TRANSICIONES_VALIDAS = {
            'Pendiente':    ['Procesando', 'Cancelado'],
            'Procesando':    ['Enviado', 'Cancelado'],
            'Enviado':       ['Entregado'],
            'Entregado':     [],
            'Cancelado':     []
        };

        try {
            // Verificar que el pedido existe y pertenece a este vendor
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

            // Verificar que al menos un item pertenece al vendor
            const perteneceAlVendor = items.some(item =>
                String(item.vendor_id || item.vendorId || '') === String(vendorId)
            );

            if (!perteneceAlVendor) {
                return res.status(403).json({ error: 'No tienes permiso para cambiar este pedido.' });
            }

            // Validar transición de estado
            const estadoActual = pedido.estado;
            const transicionesPermitidas = TRANSICIONES_VALIDAS[estadoActual] || [];

            if (!transicionesPermitidas.includes(estado)) {
                return res.status(400).json({
                    error: `Transición inválida. De "${estadoActual}" solo puedes pasar a: ${transicionesPermitidas.join(', ') || 'ninguno'}.`,
                    transiciones_permitidas: transicionesPermitidas
                });
            }

            // Actualizar estado
            const resultado = await pool.query(
                `UPDATE pedidos
                 SET    estado = $1, updated_at = NOW()
                 WHERE  id = $2
                 RETURNING id, usuario_id, estado, items, monto_total,
                           transaccion_id, created_at, updated_at`,
                [estado, id]
            );

            // Registrar en log de auditoría
            await pool.query(
                `INSERT INTO log_estados (pedido_id, estado_anterior, estado_nuevo, cambiado_por, cambiado_por_tipo)
                 VALUES ($1, $2, $3, $4, 'vendedor')`,
                [id, estadoActual, estado, req.usuario.id]
            );

            const pedidoActualizado = resultado.rows[0];

            /* ── Emitir WebSocket a vendedor y usuario ── */
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
