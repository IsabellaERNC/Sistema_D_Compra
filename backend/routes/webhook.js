/**
 * Webhook para recibir notificaciones de pago del servicio externo
 * NO requiere verificarToken - es un endpoint público que recibe notificaciones del servicio de pagos
 */

const express = require('express');
const router  = express.Router();
const pagosClient = require('../services/pagosClient');

module.exports = (pool) => {

    /**
     * POST /pago-confirmado
     * Recibe notificaciones de pago del servicio externo
     * Headers: X-Webhook-Signature o x-signature
     * Body esperado: { evento, transaccion_id, referencia_externa, estado, monto, fecha_pago }
     */
    router.post('/pago-confirmado', async (req, res) => {
        const rawBody = JSON.stringify(req.body);
        
        // Leer signature de headers (soporta ambos formatos)
        const signature = req.headers['x-webhook-signature'] || req.headers['x-signature'];

        if (!signature) {
            console.error('[POST /pago-confirmado] Falta signature en headers');
            return res.status(401).json({ error: 'Signature requerida' });
        }

        // Validar signature
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

        // Extraer datos del payload
        const { evento, transaccion_id, referencia_externa, estado, monto, fecha_pago } = req.body;

        // Validar datos mínimos requeridos
        if (!transaccion_id || !estado) {
            console.error('[POST /pago-confirmado] Payload incompleto:', req.body);
            return res.status(400).json({ error: 'Payload incompleto: se requiere transaccion_id y estado' });
        }

        // Solo procesamos eventos de pago confirmado
        if (evento !== 'pago.confirmado' && evento !== 'payment.updated') {
            console.log(`[POST /pago-confirmado] Evento no procesado: ${evento}`);
            return res.json({ mensaje: 'Evento ignorado' });
        }

        // Mapear estado del servicio externo al estado de la DB
        const ESTADO_MAP = {
            'approved': 'pagado',
            'completed': 'pagado',
            'pending': 'pendiente',
            'rejected': 'fallido',
            'cancelled': 'cancelado',
            'refunded': 'cancelado'
        };

        const estadoDB = ESTADO_MAP[estado] || estado;

        try {
            // Actualizar transacción en la DB
            const resultado = await pool.query(
                `UPDATE transacciones
                 SET    estado = $1,
                        referencia_pago_externa = COALESCE($2, referencia_pago_externa),
                        updated_at = NOW()
                 WHERE  id = $3
                 RETURNING id, usuario_id, usuario_email, items, total, moneda, estado, referencia_pago_externa, created_at, updated_at`,
                [estadoDB, referencia_externa || null, transaccion_id]
            );

            if (resultado.rows.length === 0) {
                console.error(`[POST /pago-confirmado] Transacción no encontrada: ${transaccion_id}`);
                return res.status(404).json({ error: 'Transacción no encontrada' });
            }

            const transaccion = resultado.rows[0];
            console.log(`[POST /pago-confirmado] Transacción ${transaccion.id} actualizada a estado: ${transaccion.estado}`);

            if (estadoDB === 'pagado') {
                await pool.query('DELETE FROM carrito WHERE usuario_id = $1', [transaccion.usuario_id]);
                console.log(`[POST /pago-confirmado] Carrito limpiado para usuario ${transaccion.usuario_id}`);
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