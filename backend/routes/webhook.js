/**
 * Webhook para recibir notificaciones de pago del servicio externo
 * NO requiere verificarToken - es un endpoint pÃºblico que recibe notificaciones del servicio de pagos
 */

const express = require('express');
const router  = express.Router();
const pagosClient = require('../services/pagosClient');
const productosClient = require('../services/productosClient');
const notificacionesPedidosClient = require('../services/notificacionesPedidosClient');
const enviosClient = require('../services/enviosClient');

module.exports = (pool, io) => {

    /**
     * POST /pago-confirmado
     * Recibe notificaciones de pago del servicio externo
     * Headers: X-Webhook-Signature o x-signature
     * Body esperado: { evento, transaccion_id, referencia_externa, estado, monto, fecha_pago }
     */
    router.post('/pago-confirmado', async (req, res) => {
        const rawBody = req.rawBody;

        if (!rawBody) {
            return res.status(400).json({ error: 'Body requerido' });
        }

        const signature = req.headers['x-webhook-signature'] || req.headers['x-signature'];

        if (!signature) {
            console.error('[POST /pago-confirmado] Falta signature en headers');
            return res.status(401).json({ error: 'Signature requerida' });
        }


        try {
            const esValida = pagosClient.verificarSignature(rawBody, signature);
            
            if (!esValida) {
                console.error('[POST /pago-confirmado] Signature invÃ¡lida');
                return res.status(401).json({ error: 'Signature invÃ¡lida' });
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


        const estadoNormalizado = String(estado || '').trim().toLowerCase();
        const ESTADO_MAP = {
            'approved': 'APROBADA',
            'aprobada': 'APROBADA',
            'aceptada': 'APROBADA',
            'completed': 'APROBADA',

            'pending': 'PENDIENTE',
            'pendiente': 'PENDIENTE',
            'processing': 'PENDIENTE',
            'in_process': 'PENDIENTE',

            'rejected': 'RECHAZADA',
            'rechazada': 'RECHAZADA',
            'denegada': 'RECHAZADA',
            'denied': 'RECHAZADA',
            'declined': 'RECHAZADA',
            'failed': 'RECHAZADA',
            // BUG-08: cancelled/canceled son cancelaciones, no rechazos del banco
            'cancelled': 'CANCELADA',
            'canceled':  'CANCELADA',
            // BUG-08: refunded es reembolso, semánticamente distinto a RECHAZADA
            'refunded':  'CANCELADA'
        };

        const estadoDB = ESTADO_MAP[estadoNormalizado] || String(estado || '').trim().toUpperCase();
        const ESTADOS_VALIDOS_DB = new Set(['PENDIENTE', 'APROBADA', 'RECHAZADA', 'CANCELADA']);

        if (!ESTADOS_VALIDOS_DB.has(estadoDB)) {
            console.error('[POST /pago-confirmado] Estado no soportado:', estado);
            return res.status(400).json({ error: 'Estado no soportado' });
        }

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const resultado = await client.query(
                `UPDATE transacciones
                 SET    estado = $1,
                        referencia_pago_externa = COALESCE($2, referencia_pago_externa),
                        updated_at = NOW()
                 WHERE  id = $3
                 RETURNING id, usuario_id, usuario_email, items, total, moneda, estado, referencia_pago_externa, direccion_envio_id, created_at, updated_at`,
                [estadoDB, referencia_externa || null, transaccion_id]
            );

            if (resultado.rows.length === 0) {
                await client.query('ROLLBACK');
                console.error(`[POST /pago-confirmado] TransacciÃ³n no encontrada: ${transaccion_id}`);
                return res.status(404).json({ error: 'TransacciÃ³n no encontrada' });
            }

            const transaccion = resultado.rows[0];

            if (estadoDB === 'APROBADA') {
                await client.query('DELETE FROM carrito WHERE usuario_id = $1', [transaccion.usuario_id]);

                let items = transaccion.items;
                if (typeof items === 'string') {
                    try { items = JSON.parse(items); } catch (e) { items = []; }
                }

                const pedidoResult = await client.query(
                    `INSERT INTO pedidos (usuario_id, estado, items, monto_total, transaccion_id, direccion_envio_id)
                     VALUES ($1, 'PENDIENTE', $2, $3, $4, $5)
                     ON CONFLICT (transaccion_id) DO NOTHING
                     RETURNING id`,
                    [transaccion.usuario_id, JSON.stringify(items), transaccion.total, transaccion.id, transaccion.direccion_envio_id]
                );
                if (pedidoResult.rows.length === 0) {
                    console.log(`[POST /pago-confirmado] Pedido duplicado ignorado (transaccion_id=${transaccion.id})`);
                    await client.query('COMMIT');
                    return res.status(200).json({ recibido: true, duplicado: true });
                }
                const pedidoId = pedidoResult.rows[0].id;

                if (Array.isArray(items)) {
                    for (const item of items) {
                        try {
                            await productosClient.deducirStock(item.producto_id, item.cantidad);
                        } catch (stockErr) {
                            console.error(`[POST /pago-confirmado] Error deduciendo stock para producto_id=${item.producto_id}:`, stockErr.message);
                            await client.query(
                                `INSERT INTO eventos_pendientes (tipo, payload, intentos, estado)
                                 VALUES ($1, $2, 0, 'PENDIENTE')`,
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
                    await client.query(
                        `INSERT INTO eventos_pendientes (tipo, payload, intentos, estado)
                         VALUES ($1, $2, 0, 'PENDIENTE')`,
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

                /* ── Crear envío (fire & forget con fallback) ── */
                try {
                    await enviosClient.crearEnvio({
                        pedido_id: pedidoId,
                        direccion_envio_id: transaccion.direccion_envio_id,
                        items: items,
                        monto_total: transaccion.total
                    });
                } catch (envioErr) {
                    console.error(`[POST /pago-confirmado] Error creando envío:`, envioErr.message);
                    await client.query(
                        `INSERT INTO eventos_pendientes (tipo, payload, intentos, estado)
                         VALUES ($1, $2, 0, 'PENDIENTE')`,
                        ['crear_envio', JSON.stringify({
                            pedido_id: pedidoId,
                            direccion_envio_id: transaccion.direccion_envio_id,
                            items: items,
                            monto_total: transaccion.total
                        })]
                    );
                }
            }

            await client.query('COMMIT');
            client.release();

            const usuarioRoom = `usuario_${transaccion.usuario_id}`;
            io.of('/pedidos').to(usuarioRoom).emit('transaccion:actualizada', {
                transaccion: { id: transaccion.id, estado: transaccion.estado, total: transaccion.total }
            });

            if (estadoDB === 'APROBADA') {
                io.of('/pedidos').to(usuarioRoom).emit('carrito:limpiado', { mensaje: 'Carrito limpiado despuÃ©s de pago exitoso' });
            }

            return res.json({
                mensaje: 'NotificaciÃ³n procesada correctamente',
                transaccion: {
                    id: transaccion.id,
                    estado: transaccion.estado,
                    referencia_externa: transaccion.referencia_pago_externa
                }
            });

        } catch (err) {
            await client.query('ROLLBACK').catch(() => {});
            client.release();
            console.error('[POST /pago-confirmado] Error al actualizar transacciÃ³n:', err);
            return res.status(500).json({ error: 'Error interno al procesar la notificaciÃ³n' });
        }
    });

    return router;
};



