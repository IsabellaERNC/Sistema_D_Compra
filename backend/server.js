require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors     = require('cors');
const http     = require('http');
const { Server } = require('socket.io');
const jwt      = require('jsonwebtoken');
const config = require('./config');
const authClient = require('./services/authClient');
const productosClient = require('./services/productosClient');

const app = express();
const PORT = 3000;


app.use(cors());
app.use(express.json());


const pool = new Pool(config.db);

pool.connect((err, client, release) => {
    if (err) {
        console.error('Error conectando a la base de datos:', err);
    } else {
        console.log('Conectado a PostgreSQL correctamente');
        release();
    }
});


function verificarToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token requerido. Debes iniciar sesiÃ³n.' });
    }

    /* â”€â”€ DEV_MODE: verify JWT locally â”€â”€ */
    if (config.devMode) {
        try {
            const decoded = jwt.verify(token, config.jwtSecret);
            req.usuario = decoded;
            return next();
        } catch (err) {
            return res.status(403).json({ error: 'Token invÃ¡lido o expirado.' });
        }
    }

    /* â”€â”€ Production: delegate to auth service â”€â”€ */
    authClient.validateToken(token)
        .then(data => {
            if (data.error) {
                return res.status(403).json({ error: data.error });
            }
            req.usuario = data.usuario;
            next();
        })
        .catch(err => {
            return res.status(403).json({ error: 'Token invÃ¡lido o expirado.' });
});
const checkoutRouter = require('./routes/checkout');
}




const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*' }
});

const pedidosNamespace = io.of('/pedidos');


pedidosNamespace.use(async (socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) {
    return next(new Error('Token requerido'));
  }

  /* â”€â”€ DEV_MODE: verify JWT locally â”€â”€ */
  if (config.devMode) {
    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      socket.usuario = decoded;
      return next();
    } catch (err) {
      return next(new Error('Token invÃ¡lido o expirado'));
    }
  }

  /* â”€â”€ Production: delegate to auth service â”€â”€ */
  try {
    const data = await authClient.validateToken(token);
    if (data && data.error) {
      return next(new Error(data.error));
    }
    socket.usuario = data.usuario;
    next();
  } catch (err) {
    return next(new Error('Token invÃ¡lido o expirado'));
  }
});


pedidosNamespace.on('connection', (socket) => {
  const usuario = socket.usuario;
  socket.join(`usuario_${usuario.id}`);
  if (usuario.vendor_id) {
    socket.join(`vendedor_${usuario.vendor_id}`);
  }
  console.log(`[Socket.IO] Usuario ${usuario.id} conectado a /pedidos`);
  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Usuario ${usuario.id} desconectado de /pedidos`);
  });
});




const transaccionesRouter = require('./routes/transacciones');
app.use('/api/transacciones', transaccionesRouter(pool, verificarToken));

const carritoRouter = require('./routes/carrito');
app.use('/api/carrito', carritoRouter(pool, verificarToken, productosClient));

const direccionesRouter = require('./routes/direcciones');
app.use('/api/direcciones', direccionesRouter(pool, verificarToken));

const pedidosRouter = require('./routes/pedidos');
app.use('/api/pedidos', pedidosRouter(pool, verificarToken, io));

const vendedorRouter = require('./routes/vendedor');
app.use('/api/vendedor', vendedorRouter(pool, verificarToken, io));

const eventosRouter = require('./routes/eventos');
app.use('/api/eventos', eventosRouter(pool, verificarToken));

const productosRouter = require('./routes/productos');
app.use('/api/productos', productosRouter(pool, verificarToken, productosClient));




app.get('/', (req, res) => {
    res.json({ mensaje: 'Â¡Servidor funcionando correctamente!' });
});

app.get('/api/productos', async (req, res) => {
    try {
        const token = req.headers['authorization']?.split(' ')[1];
        const resultado = await productosClient.getProductos(token);
        if (resultado.error) {
            return res.status(503).json({ error: resultado.error });
        }
        res.json(resultado);
    } catch (err) {
        console.error('[GET /api/productos]', err);
        res.status(500).json({ error: 'Error al obtener productos.' });
    }
});
const checkoutRouter = require('./routes/checkout');
const webhookRouter = require('./routes/webhook');
app.use('/api/checkout', checkoutRouter(pool, verificarToken));
app.use('/api/webhook', webhookRouter(pool));


server.listen(PORT, () => {
    console.log(`ðŸš€ Servidor corriendo en http://localhost:${PORT}`);
    console.log(`ðŸ“‹ Endpoints disponibles:`);
    console.log(`   GET    /`);
    console.log(`   GET    /api/productos/lista`);
    console.log(`   GET    /api/productos/recomendaciones`);
    console.log(`   GET    /api/transacciones`);
    console.log(`   GET    /api/transacciones/:id`);
    console.log(`   PATCH  /api/transacciones/:id/estado`);
    console.log(`   GET    /api/carrito`);
    console.log(`   POST   /api/carrito`);
    console.log(`   PATCH  /api/carrito/:producto_id`);
    console.log(`   DELETE /api/carrito/:producto_id`);
    console.log(`   DELETE /api/carrito`);
    console.log(`   POST   /api/carrito/fusionar`);
    console.log(`   GET    /api/carrito/datos-pago`);
    console.log(`   GET    /api/direcciones`);
    console.log(`   POST   /api/direcciones`);
    console.log(`   PATCH  /api/direcciones/:id`);
    console.log(`   DELETE /api/direcciones/:id`);
    console.log(`   GET    /api/pedidos`);
    console.log(`   GET    /api/pedidos/:id`);
    console.log(`   PATCH  /api/pedidos/:id/estado`);
    console.log(`   POST   /api/pedidos/:id/cancelar`);
    console.log(`   GET    /api/vendedor/pedidos`);
    console.log(`   PATCH  /api/vendedor/pedidos/:id/estado`);
    console.log(`   POST   /api/checkout/iniciar`);
    console.log(`   GET    /api/checkout/carrito/datos-pago`);
    console.log(`   POST   /api/webhook/pago-confirmado`);
    if (config.devMode) {
        console.log(`   POST   /api/test/login`);
        console.log(`   GET    /api/test/productos`);
        console.log(`   POST   /api/test/checkout-mock`);
        console.log(`   POST   /api/test/webhook-mock`);
        console.log(`   GET    /api/test/seed`);
    }
});
