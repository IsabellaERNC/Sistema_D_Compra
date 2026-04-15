

const express = require('express');
const router  = express.Router();
module.exports = (pool, verificarToken) => {

    router.post('/', verificarToken, async (req, res) => {
        const { monto, descripcion } = req.body;
        const usuarioId = req.usuario.id;  // viene del token decodificado

        // Validación de entrada (nunca confíes en lo que llega del cliente)
        if (!monto || isNaN(monto) || Number(monto) <= 0) {
            return res.status(400).json({
                error: 'El monto es obligatorio y debe ser un número mayor a 0.'
            });
        }

        try {
            const resultado = await pool.query(
                `INSERT INTO transacciones (usuario_id, monto, descripcion)
                 VALUES ($1, $2, $3)
                 RETURNING id, usuario_id, monto, estado, descripcion, created_at`,
                [usuarioId, Number(monto).toFixed(2), descripcion || null]
            );

            const transaccion = resultado.rows[0];

            // HTTP 201 = "Created" — código correcto para creación de recursos
            return res.status(201).json({
                mensaje: 'Transacción registrada exitosamente.',
                transaccion
            });

        } catch (err) {
            console.error('[POST /api/transacciones]', err);
            return res.status(500).json({ error: 'Error interno al registrar la transacción.' });
        }
    });

    // ────────────────────────────────────────────────
    // GET /api/transacciones
    // Devuelve todas las transacciones del usuario autenticado
    // Ordenadas de más reciente a más antigua (DESC)
    // ────────────────────────────────────────────────
    router.get('/', verificarToken, async (req, res) => {
        const usuarioId = req.usuario.id;

        try {
            const resultado = await pool.query(
                `SELECT id, monto, estado, descripcion, created_at, updated_at
                 FROM   transacciones
                 WHERE  usuario_id = $1
                 ORDER  BY created_at DESC`,
                [usuarioId]
            );

            return res.json({
                total: resultado.rows.length,
                transacciones: resultado.rows
            });

        } catch (err) {
            console.error('[GET /api/transacciones]', err);
            return res.status(500).json({ error: 'Error interno al obtener las transacciones.' });
        }
    });

    // ────────────────────────────────────────────────
    // GET /api/transacciones/:id
    // Devuelve una transacción específica por su UUID
    // Solo la puede ver el usuario dueño de esa transacción
    // ────────────────────────────────────────────────
    router.get('/:id', verificarToken, async (req, res) => {
        const { id } = req.params;
        const usuarioId = req.usuario.id;

        try {
            const resultado = await pool.query(
                `SELECT id, monto, estado, descripcion, created_at, updated_at
                 FROM   transacciones
                 WHERE  id = $1 AND usuario_id = $2`,
                [id, usuarioId]
            );

            if (resultado.rows.length === 0) {
                // HTTP 404 = "Not Found"
                // No revelamos si existe pero es de otro usuario (seguridad)
                return res.status(404).json({ error: 'Transacción no encontrada.' });
            }

            return res.json({ transaccion: resultado.rows[0] });

        } catch (err) {
            console.error('[GET /api/transacciones/:id]', err);
            return res.status(500).json({ error: 'Error interno al obtener la transacción.' });
        }
    });
    router.patch('/:id/estado', verificarToken, async (req, res) => {
        const { id } = req.params;
        const { estado } = req.body;
        const usuarioId = req.usuario.id;

        // Máquina de estados: solo estos valores son aceptados
        const ESTADOS_VALIDOS = ['pendiente', 'completada', 'fallida', 'cancelada'];

        if (!estado || !ESTADOS_VALIDOS.includes(estado)) {
            return res.status(400).json({
                error: `Estado inválido. Los estados permitidos son: ${ESTADOS_VALIDOS.join(', ')}.`
            });
        }

        try {
            // Primero verificamos que la transacción exista y pertenezca al usuario
            const existe = await pool.query(
                'SELECT id, estado FROM transacciones WHERE id = $1 AND usuario_id = $2',
                [id, usuarioId]
            );

            if (existe.rows.length === 0) {
                return res.status(404).json({ error: 'Transacción no encontrada.' });
            }

            // updated_at se actualiza automáticamente por el trigger en la BD
            const resultado = await pool.query(
                `UPDATE transacciones
                 SET    estado = $1
                 WHERE  id = $2
                 RETURNING id, monto, estado, descripcion, created_at, updated_at`,
                [estado, id]
            );

            return res.json({
                mensaje: 'Estado actualizado correctamente.',
                transaccion: resultado.rows[0]
            });

        } catch (err) {
            console.error('[PATCH /api/transacciones/:id/estado]', err);
            return res.status(500).json({ error: 'Error interno al actualizar el estado.' });
        }
    });

    return router;
};