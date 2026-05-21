require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors     = require('cors');
const http     = require('http');
const { Server } = require('socket.io');
const config = require('./config');
const authClient = require('./services/authClient');
const productosClient = require('./services/productosClient');
const rateLimit = require('express-rate-limit');

// â”€â”€ Rate limiters â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const limiterGeneral = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiadas peticiones. Intenta en un momento.' }
});

const limiterCheckout = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiados intentos de pago. Espera 10 minutos.' }
});

const limiterAuth = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiados intentos de autenticaciÃ³n.' }
});

const app = express();
const PORT = config.port;

// â”€â”€ Trust proxy (Google Cloud Load Balancer, Nginx, etc.) â”€â”€
// Google Cloud Load Balancer es exactamente 1 salto delante del servicio
app.set('trust proxy', 1);

// â”€â”€ CORS multi-origen â”€â”€
const allowedOrigins = config.corsOrigins || [];
app.use(cors({
    origin: function (origin, cb) {
        // Permitir peticiones sin origin (apps server-to-server, health checks)
        if (!origin) return cb(null, true);
        if (allowedOrigins.includes(origin)) return cb(null, true);
        cb(null, false);
    },
    credentials: true
}));
// â”€â”€ Raw body para verificaciÃ³n HMAC del webhook â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// DEBE ir antes de express.json() para capturar los bytes originales
app.use('/api/webhook', (req, res, next) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
        req.rawBody = data;
        try { req.body = JSON.parse(data); } catch { req.body = {}; }
        next();
    });
});

// â”€â”€ Parser global (excluye /api/webhook que ya fue procesado) â”€â”€
app.use((req, res, next) => {
    if (req.path.startsWith('/api/webhook')) return next();
    express.json({ limit: '1mb' })(req, res, next);
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// MODO ACTIVO DE AUTENTICACIÃ“N
// Se ajusta automÃ¡ticamente segÃºn quÃ© BD se logre conectar:
//   â€¢ BD local disponible  â†’ respeta DEV_MODE del .env
//   â€¢ BD local NO disponible â†’ fuerza false (requiere auth service)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// HELPER: intenta conectar un pool, lo devuelve o lanza error
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function tryPool(dbConfig) {
    const pool = new Pool(dbConfig);
    const client = await pool.connect(); // lanza si no puede conectar
    client.release();
    return pool;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// MIDDLEWARE: verificar token JWT
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function verificarToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token requerido. Debes iniciar sesiÃ³n.' });
    }

    try {
        const data = await authClient.validateToken(token);
        if (!data || data.error) {
            return res.status(403).json({ error: data?.error || 'Token inválido o expirado.' });
        }
        req.usuario = data.usuario;
        next();
    } catch {
        return res.status(403).json({ error: 'Token invÃ¡lido o expirado.' });
    }
}

async function startServer() {
    config.validateEnv();
    let pool;

    // â”€â”€ ConexiÃ³n Ãºnica a PostgreSQL (Cloud SQL / local) â”€â”€
    try {
        pool = await tryPool(config.db);
        console.log(`âœ… [DB] Conectado a PostgreSQL (${config.db.host}:${config.db.port})`);
        console.log(`   SSL: ${config.db.ssl ? 'activado' : 'desactivado'}`);
        console.log('ðŸ”‘ [Auth] ValidaciÃ³n delegada a auth service');
    } catch (dbErr) {
        console.error(`âŒ [DB] No se pudo conectar a PostgreSQL (${config.db.host}:${config.db.port}): ${dbErr.message}`);
        console.error('   â†’ Verifica DB_HOST, DB_USER, DB_PASSWORD, DB_NAME en backend/.env');
        console.error('   â†’ Para Cloud SQL, usa la IP pÃºblica o el Unix socket de Cloud SQL');
        process.exit(1);
    }

    // â”€â”€â”€ Socket.IO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const server = http.createServer(app);

    const io = new Server(server, {
        cors: {
            origin: allowedOrigins,
            credentials: true
        }
    });

    /* ── Socket.IO Redis adapter (multi-instance support) ── */
    if (config.redisHost) {
        const redis = require('redis');
        const { createAdapter } = require('@socket.io/redis-adapter');
        const pubClient = redis.createClient({ url: `redis://${config.redisHost}:${config.redisPort}` });
        const subClient = pubClient.duplicate();
        Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
            io.adapter(createAdapter(pubClient, subClient));
            console.log('[Socket.IO] Redis adapter conectado');
        }).catch(err => {
            console.error('[Socket.IO] Error conectando Redis:', err.message);
        });
    }

    const pedidosNamespace = io.of('/pedidos');

    pedidosNamespace.use(async (socket, next) => {
        const token = socket.handshake.auth?.token || socket.handshake.query?.token;
        if (!token) {
            return next(new Error('Token requerido'));
        }

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

    // â”€â”€â”€ Rutas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const transaccionesRouter = require('./routes/transacciones');
    app.use('/api/transacciones', transaccionesRouter(pool, verificarToken, io));

    const carritoRouter = require('./routes/carrito');
    app.use('/api/carrito', carritoRouter(pool, verificarToken, productosClient, io));

    const direccionesRouter = require('./routes/direcciones');
    app.use('/api/direcciones', direccionesRouter(pool, verificarToken, io));

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

    app.get('/health', (req, res) => {
        res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() });
    });

    const webhookRouter  = require('./routes/webhook');
    app.use('/api/webhook',  webhookRouter(pool, io));

    /* ── Rate limiters: must be mounted BEFORE the routes they protect ── */
    app.use('/api/checkout/iniciar', limiterCheckout);   // before checkoutRouter
    const checkoutRouter = require('./routes/checkout');
    app.use('/api/checkout', checkoutRouter(pool, verificarToken, io));

    app.use('/api/', limiterGeneral);
    /* NOTA: limiterAuth (20 req / 15 min) definido arriba pero sin ruta local ──
       El auth es microservicio externo. Aplicar limiterAuth en el nginx del auth service. */

    /* ── Internal routes (Cloud Scheduler) ──
       Workers migrados de setInterval a HTTP endpoints.
       Configurar en Cloud Scheduler:
         POST /internal/ttl-carritos   cada 24h  (X-Internal-Key requerido)
         POST /internal/retry-eventos  cada 2min (X-Internal-Key requerido)
    */
    const internalRouter = require('./routes/internal');
    app.use('/internal', internalRouter(pool, config));

    // â”€â”€â”€ Iniciar servidor â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    server.listen(PORT, () => {
        console.log(`ðŸš€ Servidor corriendo en http://localhost:${PORT}`);
    });

    function gracefulShutdown(signal) {
        console.log(`\n[Server] ${signal} recibido. Iniciando shutdown graceful...`);
        server.close(() => {
            console.log('[Server] Servidor HTTP cerrado.');
            pool.end().then(() => {
                console.log('[Server] Pool de BD cerrado.');
                process.exit(0);
            }).catch(err => {
                console.error('[Server] Error cerrando pool:', err);
                process.exit(1);
            });
        });
        setTimeout(() => {
            console.error('[Server] Shutdown forzado por timeout.');
            process.exit(1);
        }, 10000);
    }

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

startServer().catch(err => {
    console.error('âŒ Error fatal al iniciar el servidor:', err);
    process.exit(1);
});
