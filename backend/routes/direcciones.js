const express = require('express');

module.exports = (pool, verificarToken, io) => {
    const router = express.Router();

    router.get('/', verificarToken, async (req, res) => {
        const usuarioId = req.usuario.id;

        try {
            const resultado = await pool.query(
                `SELECT id, alias, calle, ciudad, departamento, codigo_postal, predeterminada, created_at
                 FROM   direcciones
                 WHERE  usuario_id = $1
                 ORDER  BY predeterminada DESC, created_at`,
                [usuarioId]
            );

            return res.json({ direcciones: resultado.rows });

        } catch (err) {
            console.error('[GET /api/direcciones]', err);
            return res.status(500).json({ error: 'Error interno al obtener las direcciones.' });
        }
    });

    router.post('/', verificarToken, async (req, res) => {
        const usuarioId = req.usuario.id;
        const { alias, calle, ciudad, departamento, codigo_postal, predeterminada } = req.body;

        if (!alias || !calle || !ciudad || !departamento) {
            return res.status(400).json({ error: 'alias, calle, ciudad y departamento son obligatorios.' });
        }

        try {
            const cuenta = await pool.query(
                `SELECT COUNT(*)::int AS total FROM direcciones WHERE usuario_id = $1`,
                [usuarioId]
            );

            if (cuenta.rows[0].total >= 5) {
                return res.status(400).json({ error: 'Máximo 5 direcciones por usuario.' });
            }

            const esPredeterminada = predeterminada === true || predeterminada === 'true';

            if (esPredeterminada) {
                await pool.query(
                    `UPDATE direcciones SET predeterminada = FALSE WHERE usuario_id = $1`,
                    [usuarioId]
                );
            }

            const resultado = await pool.query(
                `INSERT INTO direcciones (usuario_id, alias, calle, ciudad, departamento, codigo_postal, predeterminada)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING *`,
                [usuarioId, alias, calle, ciudad, departamento, codigo_postal || '', esPredeterminada]
            );

            io.of('/pedidos').to(`usuario_${usuarioId}`).emit('direcciones:actualizadas', {
                accion: 'creada',
                direccion: resultado.rows[0]
            });

            return res.status(201).json({
                mensaje: 'Dirección creada exitosamente.',
                direccion: resultado.rows[0]
            });

        } catch (err) {
            console.error('[POST /api/direcciones]', err);
            return res.status(500).json({ error: 'Error interno al crear la dirección.' });
        }
    });

    router.patch('/:id', verificarToken, async (req, res) => {
        const usuarioId = req.usuario.id;
        const direccionId = req.params.id;
        const { alias, calle, ciudad, departamento, codigo_postal, predeterminada } = req.body;

        try {
            const actual = await pool.query(
                `SELECT * FROM direcciones WHERE id = $1 AND usuario_id = $2`,
                [direccionId, usuarioId]
            );

            if (actual.rows.length === 0) {
                return res.status(404).json({ error: 'Dirección no encontrada.' });
            }

            const esPredeterminada = predeterminada === true || predeterminada === 'true';

            if (esPredeterminada && !actual.rows[0].predeterminada) {
                await pool.query(
                    `UPDATE direcciones SET predeterminada = FALSE WHERE usuario_id = $1`,
                    [usuarioId]
                );
            }

            const resultado = await pool.query(
                `UPDATE direcciones
                 SET    alias          = COALESCE($1, alias),
                        calle          = COALESCE($2, calle),
                        ciudad         = COALESCE($3, ciudad),
                        departamento   = COALESCE($4, departamento),
                        codigo_postal  = COALESCE($5, codigo_postal),
                        predeterminada = COALESCE($6, predeterminada),
                        updated_at     = NOW()
                 WHERE  id = $7 AND usuario_id = $8
                 RETURNING *`,
                [
                    alias !== undefined ? alias : null,
                    calle !== undefined ? calle : null,
                    ciudad !== undefined ? ciudad : null,
                    departamento !== undefined ? departamento : null,
                    codigo_postal !== undefined ? codigo_postal : null,
                    predeterminada !== undefined ? esPredeterminada : null,
                    direccionId,
                    usuarioId
                ]
            );

            io.of('/pedidos').to(`usuario_${usuarioId}`).emit('direcciones:actualizadas', {
                accion: 'actualizada',
                direccion: resultado.rows[0]
            });

            return res.json({
                mensaje: 'Dirección actualizada.',
                direccion: resultado.rows[0]
            });

        } catch (err) {
            console.error('[PATCH /api/direcciones/:id]', err);
            return res.status(500).json({ error: 'Error interno al actualizar la dirección.' });
        }
    });

    router.delete('/:id', verificarToken, async (req, res) => {
        const usuarioId = req.usuario.id;
        const direccionId = req.params.id;

        try {
            const actual = await pool.query(
                `SELECT * FROM direcciones WHERE id = $1 AND usuario_id = $2`,
                [direccionId, usuarioId]
            );

            if (actual.rows.length === 0) {
                return res.status(404).json({ error: 'Dirección no encontrada.' });
            }

            const direccion = actual.rows[0];
            const totalDirecciones = await pool.query(
                `SELECT COUNT(*)::int AS total FROM direcciones WHERE usuario_id = $1`,
                [usuarioId]
            );

            if (totalDirecciones.rows[0].total === 1 && direccion.predeterminada) {
                return res.status(400).json({ error: 'No puedes eliminar tu única dirección predeterminada.' });
            }

            await pool.query(
                `DELETE FROM direcciones WHERE id = $1 AND usuario_id = $2`,
                [direccionId, usuarioId]
            );

            io.of('/pedidos').to(`usuario_${usuarioId}`).emit('direcciones:actualizadas', {
                accion: 'eliminada',
                direccion_id: direccionId
            });

            return res.json({ mensaje: 'Dirección eliminada exitosamente.' });

        } catch (err) {
            console.error('[DELETE /api/direcciones/:id]', err);
            return res.status(500).json({ error: 'Error interno al eliminar la dirección.' });
        }
    });

    router.patch('/:id/predeterminada', verificarToken, async (req, res) => {
        const usuarioId = req.usuario.id;
        const direccionId = req.params.id;

        try {
            const actual = await pool.query(
                `SELECT * FROM direcciones WHERE id = $1 AND usuario_id = $2`,
                [direccionId, usuarioId]
            );

            if (actual.rows.length === 0) {
                return res.status(404).json({ error: 'Dirección no encontrada.' });
            }

            await pool.query(
                `UPDATE direcciones SET predeterminada = FALSE WHERE usuario_id = $1`,
                [usuarioId]
            );

            const resultado = await pool.query(
                `UPDATE direcciones
                 SET    predeterminada = TRUE,
                        updated_at     = NOW()
                 WHERE  id = $1 AND usuario_id = $2
                 RETURNING *`,
                [direccionId, usuarioId]
            );

            io.of('/pedidos').to(`usuario_${usuarioId}`).emit('direcciones:actualizadas', {
                accion: 'predeterminada',
                direccion: resultado.rows[0]
            });

            return res.json({
                mensaje: 'Dirección establecida como predeterminada.',
                direccion: resultado.rows[0]
            });

        } catch (err) {
            console.error('[PATCH /api/direcciones/:id/predeterminada]', err);
            return res.status(500).json({ error: 'Error interno al establecer la dirección predeterminada.' });
        }
    });

    return router;
};
