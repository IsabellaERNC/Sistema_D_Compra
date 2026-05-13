const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '1234',
  database: 'postgres'
});

async function main() {
  try {
    await client.connect();
    console.log('Conectado a postgres (database por defecto)');
    
    await client.query('CREATE DATABASE sistema_d_compra');
    console.log('✅ Base de datos sistema_d_compra creada exitosamente');
  } catch (err) {
    if (err.code === '42P04') {
      console.log('ℹ️ La base de datos sistema_d_compra ya existe');
    } else {
      console.error('❌ Error:', err.message);
      process.exit(1);
    }
  } finally {
    await client.end();
  }
}

main();
