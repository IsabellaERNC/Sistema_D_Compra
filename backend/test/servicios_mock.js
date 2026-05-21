/**
 * MOCK de servicios externos para Sistema D Compra
 * Coincide exactamente con lo que llaman los clientes HTTP del backend
 *
 * Ejecutar: node servicios_mock.js
 */

const express = require('express');
const app = express();
app.use(express.json());

// ─────────────────────────────────────────────
// PUERTO 4001 — Servicio de Productos
// Llamado por: services/productosClient.js
// ─────────────────────────────────────────────

let stock = { '1': 50, '2': 20, '3': 100 };

// GET /productos  ← getProductos()
app.get('/productos', (req, res) => {
  res.json([
    { id: '1', nombre: 'Laptop Pro', precio: 2500000, stock: stock['1'] },
    { id: '2', nombre: 'Mouse Inalámbrico', precio: 85000, stock: stock['2'] },
    { id: '3', nombre: 'Teclado Mecánico', precio: 120000, stock: stock['3'] },
  ]);
});

// GET /productos/recomendaciones?userId=X&limit=Y  ← getRecommendations()
app.get('/productos/recomendaciones', (req, res) => {
  res.json([
    { id: '1', nombre: 'Laptop Pro', precio: 2500000, stock: stock['1'] },
    { id: '2', nombre: 'Mouse Inalámbrico', precio: 85000, stock: stock['2'] },
  ]);
});

// GET /productos/:id  ← getProducto()
app.get('/productos/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const productos = {
    1: { id: '1', nombre: 'Laptop Pro', precio: 2500000, stock: stock['1'] },
    2: { id: '2', nombre: 'Mouse Inalámbrico', precio: 85000, stock: stock['2'] },
    3: { id: '3', nombre: 'Teclado Mecánico', precio: 120000, stock: stock['3'] },
  };
  const p = productos[id];
  if (!p) return res.status(404).json({ error: 'Producto no encontrado' });
  res.json(p);
});

// GET /productos/:id/stock  ← verificarStock()
// IMPORTANTE: debe retornar { stock } o { disponible }
app.get('/productos/:id/stock', (req, res) => {
  const id = req.params.id;
  res.json({ stock: stock[id] ?? 50 });
});

// POST /productos/:id/descontar-stock  ← deducirStock()
// NOTA: el cliente llama /descontar-stock, NO /deducir-stock
app.post('/productos/:id/descontar-stock', (req, res) => {
  const { cantidad } = req.body;
  const id = req.params.id;
  if (stock[id] !== undefined) {
    stock[id] -= cantidad;
  }
  res.json({ success: true, nuevo_stock: stock[id] ?? 0 });
});

// ─────────────────────────────────────────────
// PUERTO 4002 — Servicio de Pagos
// Llamado por: services/pagosClient.js
// ─────────────────────────────────────────────

// POST /checkout  ← crearCheckout()
// IMPORTANTE: debe retornar { init_point, id }
app.post('/checkout', (req, res) => {
  const id = 'PAY-' + Date.now();
  res.json({
    id: id,
    init_point: `http://localhost:4002/pagar/${id}`,
    checkout_url: `http://localhost:4002/pagar/${id}`,
  });
});

// POST /reembolso  ← solicitarReembolso()
app.post('/reembolso', (req, res) => {
  res.json({ success: true, mensaje: 'Reembolso procesado (mock)' });
});

// ─────────────────────────────────────────────
// PUERTO 4003 — Servicio de Notificaciones
// Llamado por: services/notificacionesPedidosClient.js
// ─────────────────────────────────────────────

// POST /notificaciones/pedido-creado  ← notificarPedidoCreado()
app.post('/notificaciones/pedido-creado', (req, res) => {
  console.log('[NOTIF] Pedido creado:', JSON.stringify(req.body, null, 2));
  res.json({ success: true });
});

// POST /notificaciones/cambio-estado  ← notificarCambioEstado()
app.post('/notificaciones/cambio-estado', (req, res) => {
  console.log('[NOTIF] Cambio de estado:', JSON.stringify(req.body, null, 2));
  res.json({ success: true });
});

// POST /notificaciones/cancelacion  ← notificarCancelacion()
app.post('/notificaciones/cancelacion', (req, res) => {
  console.log('[NOTIF] Cancelación:', JSON.stringify(req.body, null, 2));
  res.json({ success: true });
});

// POST /notificaciones/reembolso  ← notificarReembolso()
app.post('/notificaciones/reembolso', (req, res) => {
  console.log('[NOTIF] Reembolso:', JSON.stringify(req.body, null, 2));
  res.json({ success: true });
});

// GET /pagar/:id  ← pagina de pago simulada
app.get('/pagar/:id', (req, res) => {
  const crypto = require('crypto');
  const payId = req.params.id;
  const tid = req.query.tid || '';
  const secret = '1234';

  const bodyObj = {
    evento: 'pago.confirmado',
    transaccion_id: tid,
    referencia_externa: payId,
    estado: 'approved',
    monto: 2500000,
    fecha_pago: new Date().toISOString()
  };
  const bodyStr = JSON.stringify(bodyObj);
  const firma = crypto.createHmac('sha256', secret).update(bodyStr, 'utf8').digest('hex');

  res.send(`
    <html><body style="font-family:sans-serif;text-align:center;padding:50px">
      <h2>Pago simulado</h2>
      <p>Referencia: <b>${payId}</b></p>
      <button onclick="pagar()" style="padding:15px 30px;font-size:18px;background:green;color:white;border:none;cursor:pointer;border-radius:8px">
        Confirmar Pago
      </button>
      <p style="margin-top:20px;color:#666">Transacción: <b>${tid || 'N/A'}</b></p>
      <p style="margin-top:6px;color:#666">Estado detectado: <b id="estado">(esperando)</b></p>
      <p style="margin-top:6px;color:#999;font-size:12px">(poll cada 2s a /api/transacciones/public/:id/estado)</p>
      <script>
          const tid = ${JSON.stringify(tid)};
          const payId = ${JSON.stringify(payId)};
          const estadoEl = document.getElementById('estado');

         function redirectByEstado(estado) {
            const e = String(estado || '').toUpperCase();
            if (e === 'APROBADA' || e === 'APROBADO' || e === 'APPROVED') {
             window.location.href = 'http://localhost:5173/pago?status=approved&payment_id=' + encodeURIComponent(payId);
           }
            if (e === 'RECHAZADA' || e === 'RECHAZADO' || e === 'REJECTED') {
             window.location.href = 'http://localhost:5173/pago?status=rejected&payment_id=' + encodeURIComponent(payId);
           }
         }

          async function pollEstado() {
            if (!tid) return;
            try {
              const r = await fetch(
                'http://localhost:3000/api/transacciones/public/' + encodeURIComponent(tid) + '/estado?ts=' + Date.now(),
                {
                  cache: 'no-store',
                  headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                  }
                }
              );
              if (!r.ok) {
                try { estadoEl.textContent = 'HTTP ' + r.status } catch (e) {}
                return;
              }
              const data = await r.json();
              const estado = (data && data.transaccion && data.transaccion.estado) ? String(data.transaccion.estado).toUpperCase() : '';
              try { estadoEl.textContent = estado || '(sin estado)' } catch (e) {}
              redirectByEstado(estado);
            } catch (e) {}
          }

          if (tid) {
            pollEstado();
            setInterval(pollEstado, 2000);
          }

         async function pagar() {
          const res = await fetch('http://localhost:3000/api/webhook/pago-confirmado', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-webhook-signature': '${firma}'
            },
            body: '${bodyStr.replace(/'/g, "\\'")}'
          });
          const data = await res.json();
           if (res.ok) {
             window.location.href = 'http://localhost:5173/pago?status=approved&payment_id=' + encodeURIComponent(payId);
           } else {
             window.location.href = 'http://localhost:5173/pago?status=rejected&payment_id=' + encodeURIComponent(payId);
           }
         }
      </script>
    </body></html>
  `);
});



// ─────────────────────────────────────────────
// Levantar los 3 puertos necesarios
// (Auth en puerto 4000 NO se necesita — DEV_MODE=true verifica JWT localmente)
// ─────────────────────────────────────────────

app.listen(4001, () => console.log('✅ Mock Productos     → http://localhost:4001'));
app.listen(4002, () => console.log('✅ Mock Pagos         → http://localhost:4002'));
app.listen(4003, () => console.log('✅ Mock Notificaciones → http://localhost:4003'));
