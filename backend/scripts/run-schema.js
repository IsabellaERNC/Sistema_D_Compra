const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '1234',
  database: 'sistema_d_compra'
});

async function main() {
  try {
    await client.connect();
    console.log('Conectado a sistema_d_compra');
    
    const schemaPath = path.join(__dirname, '..', '..', 'database', 'schema_completo.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    
    await client.query(schema);
    console.log('✅ Schema ejecutado exitosamente');
    console.log('📊 Tablas creadas: carrito, transacciones, pedidos, eventos_pendientes, etc.');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
