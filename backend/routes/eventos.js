/**
 * Rutas para gestión de eventos pendientes (cola de reintentos)
 * Permite reintentar eventos fallidos de forma manual o por cron
 * 
 * CORRECCIONES APLICADAS:
 *   - FOR UPDATE SKIP LOCKED para evitar doble procesamiento
 *   - next_retry_at para backoff exponencial
 *   - Estados unificados a UPPERCASE
 */

const express = require('express');
const productosClient = require('../services/productosClient');
const notificacionesPedidosClient = require('../services/notificacionesPedidosClient');

module.exports = (pool, verificarToken) => {

    const router = express.Router();

    /**
     * POST /api/eventos/reintentar
     * Reintenta procesar todos los eventos pendientes que no hayan
     * superado el máximo de intentos permitidos.
     * Usa FOR UPDATE SKIP LOCKED para evitar doble procesamiento.
     * Requiere autenticación.
     */
    router.post('/reintentar', verificarToken, async (req, res) => {
        let procesados = 0;
        let exitosos = 0;
        let fallidos = 0;

        try {
            // FOR UPDATE SKIP LOCKED para evitar doble procesamiento
            const { rows: eventos } = await pool.query(
                `SELECT id, tipo, payload, intentos, max_intentos
                 FROM   eventos_pendientes
                 WHERE  estado = 'PENDIENTE'
                   AND  intentos < max_intentos
                   AND  (next_retry_at IS NULL OR next_retry_at <= NOW())
                 ORDER  BY created_at ASC
                 FOR UPDATE SKIP LOCKED`
            );

            for (const evento of eventos) {
                procesados++;

                await pool.query(
                    `UPDATE eventos_pendientes
                     SET    estado = 'PROCESANDO',
                            intentos = intentos + 1,
                            updated_at = NOW()
                     WHERE  id = $1`,
                    [evento.id]
                );

                try {
                    if (evento.tipo === 'deducir_stock') {
                        const payload = typeof evento.payload === 'string'
                            ? JSON.parse(evento.payload)
                            : evento.payload;
                        await productosClient.deducirStock(payload.producto_id, payload.cantidad);
                    } else if (evento.tipo === 'notificar_pedido') {
                        const payload = typeof evento.payload === 'string'
                            ? JSON.parse(evento.payload)
                            : evento.payload;
                        await notificacionesPedidosClient.notificarPedidoCreado(payload);
                    }

                    // Calcular next_retry_at con backoff exponencial
                    const nuevoIntentos = evento.intentos + 1;
                    const delaySeconds = Math.pow(2, nuevoIntentos);
                    const nextRetry = new Date(Date.now() + delaySeconds * 1000);

                    await pool.query(
                        `UPDATE eventos_pendientes
                         SET    estado = 'COMPLETADO',
                                next_retry_at = $1,
                                updated_at = NOW()
                         WHERE  id = $2`,
                        [nextRetry, evento.id]
                    );
                    exitosos++;

                } catch (err) {
                    // Calcular siguiente retry con backoff exponencial
                    const nuevoIntentos = evento.intentos + 1;
                    const delaySeconds = Math.pow(2, nuevoIntentos);
                    const nextRetry = new Date(Date.now() + delaySeconds * 1000);
                    
                    const nuevoEstado = nuevoIntentos >= evento.max_intentos
                        ? 'FALLIDO'
                        : 'PENDIENTE';

                    await pool.query(
                        `UPDATE eventos_pendientes
                         SET    estado = $1,
                                next_retry_at = $2,
                                updated_at = NOW()
                         WHERE  id = $3`,
                        [nuevoEstado, nextRetry, evento.id]
                    );
                    fallidos++;
                }
            }

            return res.json({
                mensaje: 'Reintento de eventos completado',
                total_procesados: procesados,
                exitosos,
                fallidos
            });

        } catch (err) {
            return res.status(500).json({
                error: 'Error interno al reintentar eventos',
                detalle: err.message
            });
        }
    });

    /**
     * GET /api/eventos/pendientes
     * Lista eventos pendientes para monitoreo.
     * Requiere autenticación.
     */
    router.get('/pendientes', verificarToken, async (req, res) => {
        try {
            const { rows } = await pool.query(
                `SELECT id, tipo, payload, intentos, max_intentos, estado, 
                        next_retry_at, correlation_id, event_id, created_at, updated_at
                 FROM   eventos_pendientes
                 WHERE  estado IN ('PENDIENTE', 'PROCESANDO', 'FALLIDO')
                 ORDER  BY created_at DESC`
            );

            return res.json({
                total: rows.length,
                eventos: rows
            });
        } catch (err) {
            return res.status(500).json({
                error: 'Error interno al obtener eventos pendientes',
                detalle: err.message
            });
        }
    });

    return router;
};
