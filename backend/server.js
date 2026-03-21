const express = require('express');
const { Pool } = require('pg');

const app = express();
const PORT = 3000;

app.use(express.json());

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'sistema_compras',
    password: 'Rocko306',
    port: 5432,
});

pool.connect((err, client, release) => {
    if (err) {
        console.error('Error conectando a la base de datos:', err);
    } else {
        console.log(' Conectado a PostgreSQL correctamente');
        release();
    }
});

app.get('/', (req, res) => {
    res.json({ mensaje: '¡Servidor funcionando correctamente!' });
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});