const express  = require('express');
const { Pool } = require('pg');
const cors     = require('cors');
const authClient = require('./services/authClient');
const productosClient = require('./services/productosClient');

const app = express();
const PORT = 3000;

// 1. CONFIGURACIÓN DE MIDDLEWARES
app.use(cors());
app.use(express.json());

// 2. INICIALIZACIÓN DE LA BASE DE DATOS (Primero creamos el pool)
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'sistema_compras',
    password: '1234',
    port: 5432,
});

pool.connect((err, client, release) => {
    if (err) {
        console.error('Error conectando a la base de datos:', err);
    } else {
        console.log('Conectado a PostgreSQL correctamente');
        release();
    }
});

// 3. DEFINICIÓN DE FUNCIONES (Primero definimos verificarToken)
function verificarToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token requerido. Debes iniciar sesión.' });
    }

    authClient.validateToken(token)
        .then(data => {
            if (data.error) {
                return res.status(403).json({ error: data.error });
            }
            req.usuario = data.usuario;
            next();
        })
        .catch(err => {
            return res.status(403).json({ error: 'Token inválido o expirado.' });
        });
}

// 4. IMPORTACIÓN Y REGISTRO DE RUTAS (Ahora que pool y verificarToken existen, los usamos)
const transaccionesRouter = require('./routes/transacciones');
app.use('/api/transacciones', transaccionesRouter(pool, verificarToken));

const carritoRouter = require('./routes/carrito');
app.use('/api/carrito', carritoRouter(pool, verificarToken));

// 5. RUTAS DE AUTENTICACIÓN
app.get('/', (req, res) => {
    res.json({ mensaje: '¡Servidor funcionando correctamente!' });
});

/*
app.post('/api/auth/register', async (req, res) => {
    const { nombre, email, password } = req.body;
    if (!nombre || !email || !password) {
        return res.status(400).json({ error: 'Nombre, email y contraseña son obligatorios.' });
    }
    try {
        const resultado = await authClient.register(email, password, nombre);
        if (resultado.error) {
            return res.status(409).json({ error: resultado.error });
        }
        res.status(201).json({ mensaje: 'Usuario registrado exitosamente.', token: resultado.token, usuario: resultado.usuario });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno.' });
    }
});
*/

/*
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña son obligatorios.' });
    }
    try {
        const resultado = await authClient.login(email, password);
        if (resultado.error) {
            return res.status(401).json({ error: resultado.error });
        }
        res.json({ mensaje: `Bienvenido, ${resultado.usuario.nombre}!`, token: resultado.token, usuario: resultado.usuario });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno.' });
    }
});
*/

/*
app.get('/api/auth/me', verificarToken, async (req, res) => {
    res.json({ usuario: req.usuario });
});
*/

// Endpoint para que el frontend obtenga productos
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

// Montar checkout y webhook routers
const checkoutRouter = require('./routes/checkout');
const webhookRouter = require('./routes/webhook');
app.use('/api/checkout', checkoutRouter(pool, verificarToken));
app.use('/api/webhook', webhookRouter(pool));


app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📋 Endpoints disponibles:`);
    console.log(`   GET    /`);
    console.log(`   POST   /api/auth/register (comentado)`);
    console.log(`   POST   /api/auth/login (comentado)`);
    console.log(`   GET    /api/auth/me (comentado)`);
    console.log(`   GET    /api/productos`);
    console.log(`   GET    /api/transacciones`);
    console.log(`   GET    /api/transacciones/:id`);
    console.log(`   PATCH  /api/transacciones/:id/estado`);
    console.log(`   POST   /api/checkout/iniciar`);
    console.log(`   GET    /api/checkout/datos-pago`);
    console.log(`   GET    /api/carrito`);
    console.log(`   POST   /api/carrito`);
    console.log(`   PATCH  /api/carrito/:producto_id`);
    console.log(`   DELETE /api/carrito/:producto_id`);
    console.log(`   POST   /api/carrito/fusionar`);
    console.log(`   GET    /api/carrito/datos-pago`);
    console.log(`   POST   /api/webhook/pago-confirmado`);
});