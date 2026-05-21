const express = require('express');
const crypto = require('crypto');

/**
 * Internal routes for Cloud Scheduler jobs.
 * Each endpoint is protected by an API key passed via X-Internal-Key header.
 *
 * Configure Cloud Scheduler:
 *   - POST /internal/ttl-carritos   cada 24h
 *   - POST /internal/retry-eventos  cada 2min
 */
module.exports = (pool, config) => {
    const router = express.Router();
    const internalKey = config.internalApiKey;

    function checkInternalKey(req, res, next) {
        if (!internalKey) {
            return res.status(500).json({ error: 'INTERNAL_API_KEY no configurada en el servidor.' });
        }
        const key = req.headers['x-internal-key'];
        if (!key || !crypto.timingSafeEqual(Buffer.from(key), Buffer.from(internalKey))) {
            return res.status(401).json({ error: 'No autorizado.' });
        }
        next();
    }

    /* ── POST /internal/ttl-carritos ──
       Elimina carritos sin actividad por más de 30 días.
       Cloud Scheduler: cada 24h */
    router.post('/ttl-carritos', checkInternalKey, async (req, res) => {
        try {
            const result = await pool.query(
                `DELETE FROM carrito WHERE ultima_actividad < NOW() - INTERVAL '30 days'`
            );
            console.log(`[TTL] ${result.rowCount} carrito(s) inactivo(s) eliminado(s)`);
            return res.status(200).json({ eliminados: result.rowCount });
        } catch (err) {
            console.error('[TTL] Error limpiando carritos inactivos:', err.message);
            return res.status(500).json({ error: err.message });
        }
    });

    /* ── POST /internal/retry-eventos ──
       Reintenta eventos pendientes/fallidos con backoff exponencial.
       Cloud Scheduler: cada 2min */
    router.post('/retry-eventos', checkInternalKey, async (req, res) => {
        let client;
        try {
            client = await pool.connect();

            const eventos = await client.query(
                `SELECT id, tipo, payload, intentos, max_intentos
                 FROM   eventos_pendientes
                 WHERE  estado IN ('PENDIENTE', 'FALLIDO')
                   AND  (next_retry_at IS NULL OR next_retry_at <= NOW())
                 ORDER  BY created_at
                 LIMIT  10
                 FOR UPDATE SKIP LOCKED`
            );

            const productosClient = require('../services/productosClient');
            const notificacionesClient = require('../services/notificacionesPedidosClient');
            const enviosClient = require('../services/enviosClient');

            for (const evento of eventos.rows) {
                const payload = typeof evento.payload === 'string'
                    ? JSON.parse(evento.payload)
                    : evento.payload;

                let exito = false;
                try {
                    if (evento.tipo === 'deducir_stock') {
                        await productosClient.deducirStock(payload.producto_id, payload.cantidad);
                        exito = true;
                    } else if (evento.tipo === 'notificar_pedido') {
                        await notificacionesClient.notificarPedidoCreado(payload);
                        exito = true;
                    } else if (evento.tipo === 'crear_envio') {
                        await enviosClient.crearEnvio(payload);
                        exito = true;
                    } else {
                        console.warn(`[Worker] Tipo de evento desconocido: ${evento.tipo}`);
                        exito = true;
                    }
                } catch (err) {
                    console.error(`[Worker] Reintento fallido para evento ${evento.id} (${evento.tipo}):`, err.message);
                }

                const nuevosIntentos = evento.intentos + 1;
                if (exito) {
                    await client.query(
                        `UPDATE eventos_pendientes SET estado = 'COMPLETADO', intentos = $1, updated_at = NOW() WHERE id = $2`,
                        [nuevosIntentos, evento.id]
                    );
                } else if (nuevosIntentos >= evento.max_intentos) {
                    await client.query(
                        `UPDATE eventos_pendientes SET estado = 'FALLIDO', intentos = $1, next_retry_at = NULL, updated_at = NOW() WHERE id = $2`,
                        [nuevosIntentos, evento.id]
                    );
                    console.error(`[Worker] Evento ${evento.id} (${evento.tipo}) marcado FALLIDO tras ${nuevosIntentos} intentos.`);
                } else {
                    const minutos = Math.pow(2, nuevosIntentos);
                    await client.query(
                        `UPDATE eventos_pendientes
                         SET estado = 'PENDIENTE', intentos = $1,
                             next_retry_at = NOW() + ($2 || ' minutes')::interval,
                             updated_at = NOW()
                         WHERE id = $3`,
                        [nuevosIntentos, minutos, evento.id]
                    );
                }
            }

            return res.status(200).json({ procesados: eventos.rows.length });
        } catch (err) {
            console.error('[Worker] Error general procesando eventos:', err.message);
            return res.status(500).json({ error: err.message });
        } finally {
            if (client) client.release();
        }
    });

    return router;
};
