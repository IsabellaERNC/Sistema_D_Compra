/**
 * Rutas de checkout para el proceso de compra
 * Factory: module.exports = (pool, verificarToken) => router
 */

const express = require('express');
const config          = require('../config');
const pagosClient     = require('../services/pagosClient');
const productosClient = require('../services/productosClient');

module.exports = (pool, verificarToken, io) => {
    const router = express.Router();

    /**
     * GET /carrito/datos-pago
     * Obtiene los datos del carrito para mostrar en la página de pago
     * Requiere token de autenticación
     */
    router.get('/carrito/datos-pago', verificarToken, async (req, res) => {
        const usuarioId = req.usuario.id;

        try {
            const resultado = await pool.query(
                `SELECT * FROM carrito WHERE usuario_id = $1 ORDER BY created_at`,
                [usuarioId]
            );

            const rows = resultado.rows;

            const total = rows.reduce((sum, item) => {
                return sum + (parseFloat(item.precio_unitario) * parseInt(item.cantidad));
            }, 0);

            return res.json({
                items: rows,
                total: parseFloat(total.toFixed(2))
            });

        } catch (err) {
            console.error('[GET /carrito/datos-pago]', err);
            return res.status(500).json({ error: 'Error interno al obtener los datos del carrito.' });
        }
    });

    /**
     * POST /checkout/iniciar
     * Inicia el proceso de pago
     * - Crea registro de transacción en DB (estado: PENDIENTE)
     * - Llama a pagosClient.crearCheckout() para obtener URL de pago
     * Requiere token de autenticación
     */
router.post('/iniciar', verificarToken, async (req, res) => {
        const usuario = req.usuario;
        const { items, moneda, direccion_envio_id } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'El carrito está vacío. Agrega productos antes de continuar.' });
        }

        if (!direccion_envio_id) {
            return res.status(400).json({ error: 'Debes seleccionar una dirección de envío.' });
        }

        /* ── 0.5. Validar que la dirección pertenezca al usuario ── */
        const dirResult = await pool.query(
            `SELECT id FROM direcciones WHERE id = $1 AND usuario_id = $2`,
            [direccion_envio_id, usuario.id]
        );
        if (dirResult.rows.length === 0) {
            return res.status(400).json({ error: 'La dirección de envío no es válida.' });
        }

        try {
            /* ── 1. Validar stock de cada ítem ── */
            const sinStock = [];
            for (const item of items) {
                const info = await productosClient.verificarStock(item.producto_id);
                const stockDisponible = info.stock ?? info.disponible ?? 0;
                if (stockDisponible < item.cantidad) {
                    sinStock.push({
                        producto_id: item.producto_id,
                        nombre: item.nombre,
                        cantidad_solicitada: item.cantidad,
                        stock_disponible: stockDisponible
                    });
                }
            }

            if (sinStock.length > 0) {
                return res.status(409).json({
                    error: 'Algunos productos no tienen stock suficiente.',
                    items_sin_stock: sinStock
                });
            }

            /* ── 2. Calcular totales ── */
            const subtotal = items.reduce((sum, item) => {
                const precio = parseFloat(item.precio_unitario) || 0;
                const cantidad = parseInt(item.cantidad) || 0;
                return sum + (precio * cantidad);
            }, 0);

            const envio = subtotal < 500 ? 50 : 0;
            const totalCalculado = subtotal + envio;

if (totalCalculado <= 0) {
                return res.status(400).json({ error: 'El total de la compra debe ser mayor a 0.' });
            }

            /* ── 3. Validar dirección de envío ── */
            if (direccion_envio_id) {
                const dirResult = await pool.query(
                    `SELECT id FROM direcciones WHERE id = $1 AND usuario_id = $2`,
                    [direccion_envio_id, usuario.id]
                );
                if (dirResult.rows.length === 0) {
                    return res.status(400).json({ error: 'La dirección de envío no existe o no te pertenece.' });
                }
            }

            /* ── 4. Revisar intentos de pago recientes (max 3 en 10 min) ── */
            const ahora = new Date();
            const hace10min = new Date(ahora.getTime() - 10 * 60 * 1000);

            const intentosRecientes = await pool.query(
                `SELECT COUNT(*)::int AS total FROM transacciones
                 WHERE  usuario_id  = $1
                   AND  estado      = 'PENDIENTE'
                   AND  created_at  > $2`,
                [usuario.id, hace10min.toISOString()]
            );

            if (intentosRecientes.rows[0].total >= 3) {
                return res.status(429).json({
                    error: 'Demasiados intentos de pago. Espera 10 minutos antes de intentarlo de nuevo.',
                    retry_after: '10 minutos'
                });
            }

            /* ── 4. Guardar transacción (PENDIENTE) ── */
            const transaccionResult = await pool.query(
                `INSERT INTO transacciones (usuario_id, usuario_email, items, total, moneda, estado, ip_address, user_agent, ultimo_intento_pago, direccion_envio_id)
                 VALUES ($1, $2, $3, $4, $5, 'PENDIENTE', $6, $7, NOW(), $8)
                 RETURNING id, usuario_id, usuario_email, items, total, moneda, estado, ip_address, user_agent, created_at`,
                [
                    usuario.id,
                    usuario.email,
                    JSON.stringify(items),
                    Number(totalCalculado.toFixed(2)),
                    moneda || 'COP',
                    req.ip || req.connection?.remoteAddress || null,
                    req.headers['user-agent'] || null,
                    direccion_envio_id
                ]
            );

            const transaccion = transaccionResult.rows[0];

            /* ── 5. Preparar datos para pasarela ── */
            const urlRedirectOk    = config.urlPagoOk;
            const urlRedirectError = config.urlPagoError;

            const datosCheckout = {
                usuario: {
                    id: usuario.id,
                    email: usuario.email
                },
                items: items.map(item => ({
                    producto_id: item.producto_id,
                    nombre: item.nombre,
                    cantidad: parseInt(item.cantidad),
                    precio_unitario: parseFloat(item.precio_unitario)
                })),
                subtotal: Number(subtotal.toFixed(2)),
                envio: envio,
                total: Number(totalCalculado.toFixed(2)),
                moneda: moneda || 'MXN',
                url_redirect_ok: urlRedirectOk,
                url_redirect_error: urlRedirectError
            };

            /* ── 6. Llamar servicio de pagos ── */
            const respuestaPago = await pagosClient.crearCheckout(datosCheckout);

            if (respuestaPago.error) {
                await pool.query(
                    `UPDATE transacciones SET estado = 'RECHAZADA' WHERE id = $1`,
                    [transaccion.id]
                );
                return res.status(503).json({ error: 'El servicio de pagos no está disponible: ' + respuestaPago.error });
            }

            /* ── 7. Actualizar referencia externa e intentar anterior ── */
            await pool.query(
                `UPDATE transacciones
                 SET    referencia_pago_externa = $1
                 WHERE  id = $2`,
                [respuestaPago.id || 'N/A', transaccion.id]
            );

            /* ── 8. Emitir evento WebSocket ── */
            io.of('/pedidos').to(`usuario_${usuario.id}`).emit('transaccion:creada', {
                transaccion_id: transaccion.id,
                total: transaccion.total,
                estado: transaccion.estado
            });

            /* ── 9. Responder con checkout_url ── */
            return res.json({
                mensaje: 'Checkout iniciado correctamente.',
                checkout_url: `${respuestaPago.init_point || respuestaPago.checkout_url}?tid=${transaccion.id}`,
                transaction_id: transaccion.id
            });

        } catch (err) {
            console.error('[POST /api/checkout/iniciar]', err);
            return res.status(500).json({ error: 'Error interno al iniciar el checkout.' });
        }
    });

    return router;
};