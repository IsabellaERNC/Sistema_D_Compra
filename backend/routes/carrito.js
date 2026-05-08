const express = require('express');
const router  = express.Router();

module.exports = (pool, verificarToken) => {

    router.get('/', verificarToken, async (req, res) => {
        const usuarioId = req.usuario.id;

        try {
            const resultado = await pool.query(
                `SELECT id, producto_id, producto_nombre, precio_unitario, cantidad, created_at
                 FROM   carrito
                 WHERE  usuario_id = $1
                 ORDER  BY created_at`,
                [usuarioId]
            );

            const items = resultado.rows;

            if (items.length === 0) {
                return res.json({ items: [], total: 0 });
            }

            const suma = await pool.query(
                `SELECT COALESCE(SUM(precio_unitario * cantidad), 0)::numeric(10,2) AS total
                 FROM   carrito
                 WHERE  usuario_id = $1`,
                [usuarioId]
            );

            return res.json({
                items,
                total: parseFloat(suma.rows[0].total)
            });

        } catch (err) {
            console.error('[GET /api/carrito]', err);
            return res.status(500).json({ error: 'Error interno al obtener el carrito.' });
        }
    });

    router.post('/', verificarToken, async (req, res) => {
        const usuarioId = req.usuario.id;
        const { producto_id, nombre, precio_unitario, cantidad } = req.body;

        // --- Validaciones ---
        if (!producto_id || !nombre) {
            return res.status(400).json({ error: 'producto_id y nombre son obligatorios.' });
        }

        const precio = parseFloat(precio_unitario);
        const cant   = parseInt(cantidad, 10);

        if (isNaN(precio) || precio <= 0) {
            return res.status(400).json({ error: 'precio_unitario debe ser un número mayor a 0.' });
        }
        if (isNaN(cant) || cant <= 0) {
            return res.status(400).json({ error: 'cantidad debe ser un número entero mayor a 0.' });
        }

        try {
            // Upsert: INSERT ... ON CONFLICT — si ya existe, suma la cantidad
            const resultado = await pool.query(
                `INSERT INTO carrito (usuario_id, producto_id, producto_nombre, precio_unitario, cantidad)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (usuario_id, producto_id)
                 DO UPDATE SET cantidad    = carrito.cantidad + EXCLUDED.cantidad,
                               updated_at  = NOW()
                 RETURNING *`,
                [usuarioId, producto_id, nombre, precio, cant]
            );

            // Devolver el carrito completo despues del upsert
            const carrito = await pool.query(
                `SELECT id, producto_id, producto_nombre, precio_unitario, cantidad, created_at
                 FROM   carrito
                 WHERE  usuario_id = $1
                 ORDER  BY created_at`,
                [usuarioId]
            );

            return res.status(201).json({
                mensaje: 'Producto agregado al carrito.',
                item:    resultado.rows[0],
                carrito: carrito.rows
            });

        } catch (err) {
            console.error('[POST /api/carrito]', err);
            return res.status(500).json({ error: 'Error interno al agregar al carrito.' });
        }
    });

    router.patch('/:producto_id', verificarToken, async (req, res) => {
        const usuarioId  = req.usuario.id;
        const productoId = req.params.producto_id;
        const { cantidad } = req.body;

        if (cantidad === undefined || cantidad === null) {
            return res.status(400).json({ error: 'cantidad es obligatorio.' });
        }

        const cant = parseInt(cantidad, 10);

        if (isNaN(cant) || cant <= 0) {
            return res.status(400).json({ error: 'cantidad debe ser un número entero mayor a 0.' });
        }

        try {
            const resultado = await pool.query(
                `UPDATE carrito
                 SET    cantidad   = $1,
                        updated_at = NOW()
                 WHERE  usuario_id  = $2
                   AND  producto_id = $3
                 RETURNING *`,
                [cant, usuarioId, productoId]
            );

            if (resultado.rows.length === 0) {
                return res.status(404).json({ error: 'Producto no encontrado en el carrito.' });
            }

            const carrito = await pool.query(
                `SELECT id, producto_id, producto_nombre, precio_unitario, cantidad, created_at
                 FROM   carrito
                 WHERE  usuario_id = $1
                 ORDER  BY created_at`,
                [usuarioId]
            );

            return res.json({
                mensaje: 'Cantidad actualizada.',
                item:    resultado.rows[0],
                carrito: carrito.rows
            });

        } catch (err) {
            console.error('[PATCH /api/carrito/:producto_id]', err);
            return res.status(500).json({ error: 'Error interno al actualizar el carrito.' });
        }
    });

    router.delete('/:producto_id', verificarToken, async (req, res) => {
        const usuarioId  = req.usuario.id;
        const productoId = req.params.producto_id;

        try {
            const resultado = await pool.query(
                `DELETE FROM carrito
                 WHERE  usuario_id  = $1
                   AND  producto_id = $2
                 RETURNING *`,
                [usuarioId, productoId]
            );

            if (resultado.rows.length === 0) {
                return res.status(404).json({ error: 'Producto no encontrado en el carrito.' });
            }

            const carrito = await pool.query(
                `SELECT id, producto_id, producto_nombre, precio_unitario, cantidad, created_at
                 FROM   carrito
                 WHERE  usuario_id = $1
                 ORDER  BY created_at`,
                [usuarioId]
            );

            return res.json({
                mensaje: 'Producto eliminado del carrito.',
                item:    resultado.rows[0],
                carrito: carrito.rows
            });

        } catch (err) {
            console.error('[DELETE /api/carrito/:producto_id]', err);
            return res.status(500).json({ error: 'Error interno al eliminar del carrito.' });
        }
    });

    router.delete('/', verificarToken, async (req, res) => {
        const usuarioId = req.usuario.id;

        try {
            await pool.query(
                `DELETE FROM carrito
                 WHERE  usuario_id = $1`,
                [usuarioId]
            );

            return res.json({ mensaje: 'Carrito vaciado exitosamente.' });

        } catch (err) {
            console.error('[DELETE /api/carrito]', err);
            return res.status(500).json({ error: 'Error interno al vaciar el carrito.' });
        }
    });

    router.post('/fusionar', verificarToken, async (req, res) => {
        const usuarioId = req.usuario.id;
        const { items } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            try {
                const carrito = await pool.query(
                    `SELECT id, producto_id, producto_nombre, precio_unitario, cantidad, created_at
                     FROM   carrito
                     WHERE  usuario_id = $1
                     ORDER  BY created_at`,
                    [usuarioId]
                );
                return res.json({ mensaje: 'Sin items para fusionar', carrito: carrito.rows });
            } catch (err) {
                console.error('[POST /api/carrito/fusionar]', err);
                return res.status(500).json({ error: 'Error interno al fusionar el carrito.' });
            }
        }

        try {
            for (const item of items) {
                const { producto_id, nombre, precio_unitario, cantidad } = item;
                const precio = parseFloat(precio_unitario);
                const cant   = parseInt(cantidad, 10);

                if (!producto_id || !nombre || isNaN(precio) || precio <= 0 || isNaN(cant) || cant <= 0) {
                    continue;
                }

                await pool.query(
                    `INSERT INTO carrito (usuario_id, producto_id, producto_nombre, precio_unitario, cantidad)
                     VALUES ($1, $2, $3, $4, $5)
                     ON CONFLICT (usuario_id, producto_id) DO NOTHING
                     RETURNING *`,
                    [usuarioId, producto_id, nombre, precio, cant]
                );
            }

            const carrito = await pool.query(
                `SELECT id, producto_id, producto_nombre, precio_unitario, cantidad, created_at
                 FROM   carrito
                 WHERE  usuario_id = $1
                 ORDER  BY created_at`,
                [usuarioId]
            );

            return res.json({ mensaje: 'Carrito fusionado', carrito: carrito.rows });

        } catch (err) {
            console.error('[POST /api/carrito/fusionar]', err);
            return res.status(500).json({ error: 'Error interno al fusionar el carrito.' });
        }
    });

    router.get('/datos-pago', verificarToken, async (req, res) => {
        const usuarioId = req.usuario.id;

        try {
            const resultado = await pool.query(
                `SELECT producto_id, producto_nombre, precio_unitario, cantidad
                 FROM   carrito
                 WHERE  usuario_id = $1
                 ORDER  BY created_at`,
                [usuarioId]
            );

            const rows = resultado.rows;

            if (rows.length === 0) {
                return res.status(400).json({ error: 'El carrito está vacío' });
            }

            const items = rows.map(r => ({
                producto_id:     r.producto_id,
                nombre:          r.producto_nombre,
                precio_unitario: parseFloat(r.precio_unitario),
                cantidad:        r.cantidad,
                subtotal:        parseFloat((r.precio_unitario * r.cantidad).toFixed(2))
            }));

            const total = parseFloat(
                items.reduce((acc, i) => acc + i.subtotal, 0).toFixed(2)
            );

            return res.json({
                usuario_id: usuarioId,
                items,
                total,
                moneda: 'MXN'
            });

        } catch (err) {
            console.error('[GET /api/carrito/datos-pago]', err);
            return res.status(500).json({ error: 'Error interno al obtener los datos de pago.' });
        }
    });

    return router;
};
