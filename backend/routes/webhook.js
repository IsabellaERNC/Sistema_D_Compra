/**
 * Webhook para recibir notificaciones de pago del servicio externo
 * NO requiere verificarToken - es un endpoint público que recibe notificaciones del servicio de pagos
 */

const express = require('express');
const router  = express.Router();
const pagosClient = require('../services/pagosClient');
const productosClient = require('../services/productosClient');
const notificacionesPedidosClient = require('../services/notificacionesPedidosClient');

module.exports = (pool, io) => {

    /**
     * POST /pago-confirmado
     * Recibe notificaciones de pago del servicio externo
     * Headers: X-Webhook-Signature o x-signature
     * Body esperado: { evento, transaccion_id, referencia_externa, estado, monto, fecha_pago }
     */
    router.post('/pago-confirmado', async (req, res) => {
        const rawBody = JSON.stringify(req.body);
        

        const signature = req.headers['x-webhook-signature'] || req.headers['x-signature'];

        if (!signature) {
            console.error('[POST /pago-confirmado] Falta signature en headers');
            return res.status(401).json({ error: 'Signature requerida' });
        }


        try {
            const esValida = pagosClient.verificarSignature(rawBody, signature);
            
            if (!esValida) {
                console.error('[POST /pago-confirmado] Signature inválida');
                return res.status(401).json({ error: 'Signature inválida' });
            }
        } catch (err) {
            console.error('[POST /pago-confirmado] Error al verificar signature:', err.message);
            return res.status(401).json({ error: 'Error al verificar signature' });
        }


        const { evento, transaccion_id, referencia_externa, estado, monto, fecha_pago } = req.body;


        if (!transaccion_id || !estado) {
            console.error('[POST /pago-confirmado] Payload incompleto:', req.body);
            return res.status(400).json({ error: 'Payload incompleto: se requiere transaccion_id y estado' });
        }


        if (evento !== 'pago.confirmado' && evento !== 'payment.updated') {
            return res.json({ mensaje: 'Evento ignorado' });
        }


        const ESTADO_MAP = {
            'approved': 'APROBADA',
            'completed': 'APROBADA',
            'pending': 'PENDIENTE',
            'rejected': 'RECHAZADA',
            'cancelled': 'RECHAZADA',
            'refunded': 'RECHAZADA'
        };

        const estadoDB = ESTADO_MAP[estado] || estado;

        try {

            const resultado = await pool.query(
                `UPDATE transacciones
                 SET    estado = $1,
                        referencia_pago_externa = COALESCE($2, referencia_pago_externa),
                        updated_at = NOW()
                 WHERE  id = $3
                 RETURNING id, usuario_id, usuario_email, items, total, moneda, estado, referencia_pago_externa, direccion_envio_id, created_at, updated_at`,
                [estadoDB, referencia_externa || null, transaccion_id]
            );

            if (resultado.rows.length === 0) {
                console.error(`[POST /pago-confirmado] Transacción no encontrada: ${transaccion_id}`);
                return res.status(404).json({ error: 'Transacción no encontrada' });
            }

            const transaccion = resultado.rows[0];

            if (estadoDB === 'APROBADA') {
                await pool.query('DELETE FROM carrito WHERE usuario_id = $1', [transaccion.usuario_id]);

        let items = transaccion.items;
        if (typeof items === 'string') {
            try { items = JSON.parse(items); } catch (e) { items = []; }
        }

        const pedidoResult = await pool.query(
            `INSERT INTO pedidos (usuario_id, estado, items, monto_total, transaccion_id, direccion_envio_id)
             VALUES ($1, 'Pendiente', $2, $3, $4, $5)
             RETURNING id`,
            [transaccion.usuario_id, JSON.stringify(items), transaccion.total, transaccion.id, transaccion.direccion_envio_id]
        );
        const pedidoId = pedidoResult.rows[0].id;

                if (Array.isArray(items)) {
                    for (const item of items) {
                        try {
                            await productosClient.deducirStock(item.producto_id, item.cantidad);
                        } catch (stockErr) {
                            console.error(`[POST /pago-confirmado] Error deduciendo stock para producto_id=${item.producto_id}:`, stockErr.message);
                            await pool.query(
                                `INSERT INTO eventos_pendientes (tipo, payload, intentos, estado)
                                 VALUES ($1, $2, 0, 'pendiente')`,
                                ['deducir_stock', JSON.stringify({ producto_id: item.producto_id, cantidad: item.cantidad, pedido_id: pedidoId })]
                            );
                        }
                    }
                }

                try {
                    await notificacionesPedidosClient.notificarPedidoCreado({
                        pedido_id: pedidoId,
                        usuario_id: transaccion.usuario_id,
                        usuario_email: transaccion.usuario_email,
                        items: items,
                        monto_total: transaccion.total,
                        moneda: transaccion.moneda,
                        transaccion_id: transaccion.id
                    });
                } catch (notifErr) {
                    console.error(`[POST /pago-confirmado] Error notificando pedido creado:`, notifErr.message);
                    await pool.query(
                        `INSERT INTO eventos_pendientes (tipo, payload, intentos, estado)
                         VALUES ($1, $2, 0, 'pendiente')`,
                        ['notificar_pedido', JSON.stringify({
                            pedido_id: pedidoId,
                            usuario_id: transaccion.usuario_id,
                            usuario_email: transaccion.usuario_email,
                            items: items,
                            monto_total: transaccion.total,
                            moneda: transaccion.moneda,
                            transaccion_id: transaccion.id
                        })]
                    );
                }
            }

            const usuarioRoom = `usuario_${transaccion.usuario_id}`;
            io.of('/pedidos').to(usuarioRoom).emit('transaccion:actualizada', {
                transaccion: { id: transaccion.id, estado: transaccion.estado, total: transaccion.total }
            });

            if (estadoDB === 'APROBADA') {
                io.of('/pedidos').to(usuarioRoom).emit('carrito:limpiado', { mensaje: 'Carrito limpiado después de pago exitoso' });
            }

            return res.json({
                mensaje: 'Notificación procesada correctamente',
                transaccion: {
                    id: transaccion.id,
                    estado: transaccion.estado,
                    referencia_externa: transaccion.referencia_pago_externa
                }
            });

        } catch (err) {
            console.error('[POST /pago-confirmado] Error al actualizar transacción:', err);
            return res.status(500).json({ error: 'Error interno al procesar la notificación' });
        }
    });

    return router;
};
