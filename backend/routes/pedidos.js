const express = require('express');
const PDFDocument = require('pdfkit');
const pagosClient = require('../services/pagosClient');

module.exports = (pool, verificarToken, io) => {
    const router = express.Router();

    // Mapa de transiciones de estado válidas
    const TRANSICIONES_VALIDAS = {
        'Pendiente':   ['Procesando', 'Cancelado'],
        'Procesando':  ['Enviado', 'Cancelado'],
        'Enviado':     ['Entregado'],
        'Entregado':   [],
        'Cancelado':   []
    };

    /**
     * GET /api/pedidos
     * Lista los pedidos del usuario autenticado
     */
    router.get('/', verificarToken, async (req, res) => {
        const usuarioId = req.usuario.id;

        try {
            const resultado = await pool.query(
                `SELECT id, usuario_id, estado, items, monto_total,
                        direccion_envio_id, transaccion_id, created_at, updated_at
                 FROM   pedidos
                 WHERE  usuario_id = $1
                 ORDER  BY created_at DESC`,
                [usuarioId]
            );

            return res.json({
                total: resultado.rows.length,
                pedidos: resultado.rows
            });
        } catch (err) {
            console.error('[GET /api/pedidos]', err);
            return res.status(500).json({ error: 'Error interno al obtener los pedidos.' });
        }
    });

    /**
     * GET /api/pedidos/:id
     * Detalle de un pedido específico del usuario autenticado
     */
    router.get('/:id', verificarToken, async (req, res) => {
        const { id } = req.params;
        const usuarioId = req.usuario.id;

        try {
            const resultado = await pool.query(
                `SELECT id, usuario_id, estado, items, monto_total,
                        direccion_envio_id, transaccion_id, created_at, updated_at
                 FROM   pedidos
                 WHERE  id = $1 AND usuario_id = $2`,
                [id, usuarioId]
            );

            if (resultado.rows.length === 0) {
                return res.status(404).json({ error: 'Pedido no encontrado.' });
            }

            return res.json({ pedido: resultado.rows[0] });
        } catch (err) {
            console.error('[GET /api/pedidos/:id]', err);
            return res.status(500).json({ error: 'Error interno al obtener el pedido.' });
        }
    });

    /**
     * GET /api/pedidos/:id/factura
     * Genera factura PDF en formato colombiano (IVA 19%) para pedidos Enviado/Entregado
     */
    router.get('/:id/factura', verificarToken, async (req, res) => {
        const { id } = req.params;
        const usuarioId = req.usuario.id;

        try {
            const resultado = await pool.query(
                `SELECT id, usuario_id, estado, items, monto_total, created_at
                 FROM   pedidos
                 WHERE  id = $1 AND usuario_id = $2`,
                [id, usuarioId]
            );

            if (resultado.rows.length === 0) {
                return res.status(404).json({ error: 'Pedido no encontrado.' });
            }

            const pedido = resultado.rows[0];

            if (!['Enviado', 'Entregado'].includes(pedido.estado)) {
                return res.status(400).json({
                    error: 'La factura solo está disponible para pedidos Enviados o Entregados.',
                    estado_actual: pedido.estado
                });
            }

            const items = typeof pedido.items === 'string'
                ? JSON.parse(pedido.items)
                : pedido.items;

            const subtotal = items.reduce((sum, item) => {
                return sum + (parseFloat(item.precio_unitario) * parseInt(item.cantidad));
            }, 0);
            const iva = subtotal * 0.19;
            const total = subtotal + iva;

            // ── Generar PDF ──
            const doc = new PDFDocument({ size: 'A4', margin: 50 });
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="factura-${id.slice(0,8)}.pdf"`);
            doc.pipe(res);

            const fecha = new Date(pedido.created_at).toLocaleDateString('es-CO', {
                day: '2-digit', month: '2-digit', year: 'numeric'
            });

            // Encabezado
            doc.fontSize(20).font('Helvetica-Bold').text('FACTURA DE VENTA', { align: 'center' });
            doc.moveDown(0.5);
            doc.fontSize(10).font('Helvetica').text(`N° Factura: ${pedido.id.slice(0,8).toUpperCase()}`, { align: 'center' });
            doc.text(`Fecha: ${fecha}`, { align: 'center' });
            doc.moveDown(1);

            // Datos del vendedor
            doc.fontSize(11).font('Helvetica-Bold').text('EMISOR:', { underline: true });
            doc.fontSize(10).font('Helvetica')
                .text('Sistema_D_Compra S.A.S.')
                .text('NIT: 900.123.456-7')
                .text('Régimen Común — Responsable de IVA')
                .text('Bogotá D.C., Colombia');
            doc.moveDown(0.8);

            // Datos del cliente
            doc.fontSize(11).font('Helvetica-Bold').text('CLIENTE:', { underline: true });
            doc.fontSize(10).font('Helvetica')
                .text(`Nombre: ${req.usuario.nombre}`)
                .text(`Email: ${req.usuario.email}`)
                .text(`ID Usuario: ${usuarioId}`);
            doc.moveDown(1);

            // Tabla de items
            const tableTop = doc.y;
            const colX = { desc: 50, cant: 310, precio: 370, totalCol: 460 };

            doc.fontSize(11).font('Helvetica-Bold');
            doc.text('Descripción', colX.desc, tableTop);
            doc.text('Cant.', colX.cant, tableTop);
            doc.text('P. Unit.', colX.precio, tableTop);
            doc.text('Total', colX.totalCol, tableTop);

            doc.moveTo(50, doc.y + 5)
               .lineTo(545, doc.y + 5)
               .stroke();

            doc.moveDown(0.8);
            let y = doc.y;

            items.forEach((item, i) => {
                const precio = parseFloat(item.precio_unitario).toFixed(2);
                const itemTotal = (parseFloat(item.precio_unitario) * parseInt(item.cantidad)).toFixed(2);

                doc.font('Helvetica').fontSize(10);
                doc.text(item.nombre || `Producto #${item.producto_id}`, colX.desc, y, { width: 250 });
                doc.text(String(item.cantidad), colX.cant, y);
                doc.text(`$${precio}`, colX.precio, y);
                doc.text(`$${itemTotal}`, colX.totalCol, y);

                y += 18;

                if (i < items.length - 1) {
                    doc.moveTo(50, y - 6).lineTo(545, y - 6).stroke('#cccccc');
                }
            });

            // Totales
            const totalsY = y + 15;
            doc.moveTo(50, totalsY).lineTo(545, totalsY).stroke();

            const labelX = 360;
            doc.fontSize(11).font('Helvetica-Bold');
            doc.text('Subtotal:', labelX, totalsY + 10);
            doc.text('IVA (19%):', labelX, totalsY + 30);
            doc.text('TOTAL:', labelX, totalsY + 55);

            doc.font('Helvetica');
            const valX = 470;
            doc.text(`$ ${subtotal.toFixed(2)}`, valX, totalsY + 10);
            doc.text(`$ ${iva.toFixed(2)}`, valX, totalsY + 30);
            doc.fontSize(13).font('Helvetica-Bold').text(`$ ${total.toFixed(2)}`, valX, totalsY + 55);

            // Footer legal
            doc.moveDown(4);
            doc.fontSize(8).font('Helvetica').fillColor('#666666');
            doc.text('Este documento es una representación válida de factura electrónica según normativa DIAN.', { align: 'center' });
            doc.text('Resolución DIAN N° 000042 — 2024. Documento generado electrónicamente.', { align: 'center' });

            doc.end();

        } catch (err) {
            console.error('[GET /api/pedidos/:id/factura]', err);
            return res.status(500).json({ error: 'Error interno al generar la factura.' });
        }
    });

    /**
     * PATCH /api/pedidos/:id/estado
     * Cambia el estado de un pedido validando las transiciones permitidas
     */
    router.patch('/:id/estado', verificarToken, async (req, res) => {
        const { id } = req.params;
        const { estado } = req.body;
        const usuarioId = req.usuario.id;

        const ESTADOS_VALIDOS = ['Pendiente', 'Procesando', 'Enviado', 'Entregado', 'Cancelado'];

        if (!estado || !ESTADOS_VALIDOS.includes(estado)) {
            return res.status(400).json({
                error: `Estado inválido. Los estados permitidos son: ${ESTADOS_VALIDOS.join(', ')}.`
            });
        }

        try {
            const existe = await pool.query(
                'SELECT id, estado FROM pedidos WHERE id = $1 AND usuario_id = $2',
                [id, usuarioId]
            );

            if (existe.rows.length === 0) {
                return res.status(404).json({ error: 'Pedido no encontrado.' });
            }

            const estadoActual = existe.rows[0].estado;
            const estadosPermitidos = TRANSICIONES_VALIDAS[estadoActual] || [];

            if (!estadosPermitidos.includes(estado)) {
                return res.status(400).json({
                    error: `Transición de estado inválida. No se puede cambiar de "${estadoActual}" a "${estado}".`
                });
            }

            const resultado = await pool.query(
                `UPDATE pedidos
                 SET    estado = $1,
                        updated_at = NOW()
                 WHERE  id = $2
                 RETURNING id, usuario_id, estado, items, monto_total,
                           direccion_envio_id, transaccion_id, created_at, updated_at`,
                [estado, id]
            );

            /* ── Emitir WebSocket si io disponible ── */
            if (io) {
                const pedido = resultado.rows[0];
                io.of('/pedidos').to(`usuario_${usuarioId}`).emit('pedido:estado-cambiado', {
                    pedidoId: pedido.id,
                    nuevoEstado: estado,
                    pedido
                });
            }

            return res.json({
                mensaje: 'Estado actualizado correctamente.',
                pedido: resultado.rows[0]
            });
        } catch (err) {
            console.error('[PATCH /api/pedidos/:id/estado]', err);
            return res.status(500).json({ error: 'Error interno al actualizar el estado del pedido.' });
        }
    });

    router.post('/:id/cancelar', verificarToken, async (req, res) => {
        const { id } = req.params;
        const usuarioId = req.usuario.id;

        try {
            const existe = await pool.query(
                'SELECT id, estado, transaccion_id FROM pedidos WHERE id = $1 AND usuario_id = $2',
                [id, usuarioId]
            );

            if (existe.rows.length === 0) {
                return res.status(404).json({ error: 'Pedido no encontrado.' });
            }

            const estadoActual = existe.rows[0].estado;
            if (!['Pendiente', 'Procesando'].includes(estadoActual)) {
                return res.status(400).json({
                    error: 'Solo puedes cancelar pedidos en estado Pendiente o Procesando.'
                });
            }

            await pool.query(
                `UPDATE pedidos SET estado = 'Cancelado', updated_at = NOW() WHERE id = $1`,
                [id]
            );

            const transaccionId = existe.rows[0].transaccion_id;
            if (transaccionId) {
                const trans = await pool.query(
                    `SELECT id, estado FROM transacciones WHERE id = $1`,
                    [transaccionId]
                );
                if (trans.rows.length > 0 && trans.rows[0].estado === 'PENDIENTE') {
                    try {
                        await pagosClient.solicitarReembolso(transaccionId);
                    } catch (refundErr) {
                        console.error('[POST /api/pedidos/:id/cancelar] Error en reembolso:', refundErr.message);
                    }
                    await pool.query(
                        `UPDATE transacciones SET estado = 'CANCELADA' WHERE id = $1`,
                        [transaccionId]
                    );
                }
            }

            if (io) {
                io.of('/pedidos').to(`usuario_${usuarioId}`).emit('pedido:estado-cambiado', {
                    pedidoId: id,
                    nuevoEstado: 'Cancelado',
                    mensaje: 'Tu pedido ha sido cancelado.'
                });
            }

            return res.json({ mensaje: 'Pedido cancelado exitosamente.' });
        } catch (err) {
            console.error('[POST /api/pedidos/:id/cancelar]', err);
            return res.status(500).json({ error: 'Error interno al cancelar el pedido.' });
        }
    });

    return router;
};
