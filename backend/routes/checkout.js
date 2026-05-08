/**
 * Rutas de checkout para el proceso de compra
 * Factory: module.exports = (pool, verificarToken) => router
 */

const express = require('express');
const router  = express.Router();
const pagosClient = require('../services/pagosClient');

module.exports = (pool, verificarToken) => {

    /**
     * GET /carrito/datos-pago
     * Obtiene los datos del carrito para mostrar en la página de pago
     * Requiere token de autenticación
     */
    router.get('/carrito/datos-pago', verificarToken, async (req, res) => {
        // El carrito viene del frontend via el token/headers
        // Aquí solo devolvemos la info del usuario desde el token
        const usuario = req.usuario;
        
        return res.json({
            mensaje: 'Datos del usuario obtenidos correctamente.',
            data: {
                usuario: {
                    id: usuario.id,
                    nombre: usuario.nombre,
                    email: usuario.email
                },
                items: [],
                total: 0
            }
        });
    });

    /**
     * POST /checkout/iniciar
     * Inicia el proceso de pago
     * - Crea registro de transacción en DB (estado: pendiente)
     * - Llama a pagosClient.crearCheckout() para obtener URL de pago
     * Requiere token de autenticación
     */
    router.post('/iniciar', verificarToken, async (req, res) => {
        const usuario = req.usuario;
        const { items, total, moneda } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'El carrito está vacío. Agrega productos antes de continuar.' });
        }

        try {
            // Calcular total si no se proporciona
            const totalCalculado = total || items.reduce((sum, item) => {
                const precio = parseFloat(item.precio_unitario) || 0;
                const cantidad = parseInt(item.cantidad) || 0;
                return sum + (precio * cantidad);
            }, 0);

            if (totalCalculado <= 0) {
                return res.status(400).json({ error: 'El total de la compra debe ser mayor a 0.' });
            }

            // Crear transacción en estado pendiente
            const transaccionResult = await pool.query(
                `INSERT INTO transacciones (usuario_id, usuario_email, items, total, moneda, estado)
                 VALUES ($1, $2, $3, $4, $5, 'pendiente')
                 RETURNING id, usuario_id, usuario_email, items, total, moneda, estado, created_at`,
                [usuario.id, usuario.email, JSON.stringify(items), totalCalculado, moneda || 'MXN']
            );

            const transaccion = transaccionResult.rows[0];

            // URLs de redirección después del pago
            const urlRedirectOk = process.env.URL_PAGO_OK || 'http://localhost:5173/pages/pago.html?status=approved';
            const urlRedirectError = process.env.URL_PAGO_ERROR || 'http://localhost:5173/pages/pago.html?status=rejected';

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
                total: Number(totalCalculado.toFixed(2)),
                moneda: moneda || 'MXN',
                url_redirect_ok: urlRedirectOk,
                url_redirect_error: urlRedirectError
            };

            // Llamar al servicio de pagos
            const respuestaPago = await pagosClient.crearCheckout(datosCheckout);

            if (respuestaPago.error) {
                // Si el servicio de pagos falla, marcar transacción como fallida
                await pool.query(
                    `UPDATE transacciones SET estado = 'fallido' WHERE id = $1`,
                    [transaccion.id]
                );
                return res.status(503).json({ error: 'El servicio de pagos no está disponible: ' + respuestaPago.error });
            }

            // Actualizar transacción con la referencia externa
            await pool.query(
                `UPDATE transacciones
                 SET    referencia_pago_externa = $1
                 WHERE  id = $2`,
                [respuestaPago.id || 'N/A', transaccion.id]
            );

            // Devolver la URL de pago (init_point) para que el frontend redirija
            return res.json({
                mensaje: 'Checkout iniciado correctamente.',
                init_point: respuestaPago.init_point,
                transaction_id: transaccion.id
            });

        } catch (err) {
            console.error('[POST /api/checkout/iniciar]', err);
            return res.status(500).json({ error: 'Error interno al iniciar el checkout.' });
        }
    });

    return router;
};