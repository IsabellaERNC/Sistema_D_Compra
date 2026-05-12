/**
 * Rutas para gestión de eventos pendientes (cola de reintentos)
 * Permite reintentar eventos fallidos de forma manual o por cron
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
     * Requiere autenticación.
     */
    router.post('/reintentar', verificarToken, async (req, res) => {
        let procesados = 0;
        let exitosos = 0;
        let fallidos = 0;

        try {
            const { rows: eventos } = await pool.query(
                `SELECT id, tipo, payload, intentos, max_intentos
                 FROM   eventos_pendientes
                 WHERE  estado = 'pendiente'
                   AND  intentos < max_intentos
                 ORDER  BY created_at ASC`
            );

            for (const evento of eventos) {
                procesados++;

                await pool.query(
                    `UPDATE eventos_pendientes
                     SET    estado = 'procesando',
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

                    await pool.query(
                        `UPDATE eventos_pendientes
                         SET    estado = 'completado',
                                updated_at = NOW()
                         WHERE  id = $1`,
                        [evento.id]
                    );
                    exitosos++;

                } catch (err) {
                    const nuevoIntentos = evento.intentos + 1;
                    const nuevoEstado = nuevoIntentos >= evento.max_intentos
                        ? 'fallido'
                        : 'pendiente';

                    await pool.query(
                        `UPDATE eventos_pendientes
                         SET    estado = $1,
                                updated_at = NOW()
                         WHERE  id = $2`,
                        [nuevoEstado, evento.id]
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
                `SELECT id, tipo, payload, intentos, max_intentos, estado, created_at, updated_at
                 FROM   eventos_pendientes
                 WHERE  estado IN ('pendiente', 'procesando', 'fallido')
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
