// ============================================
// CONFIGURACIÓN - SERVICIOS EXTERNOS
// Completar cuando tengas las URLs y credenciales
// ============================================

// --- Servicio de Auth (Login/Register) ---
// TODO: Pedir al equipo de auth service la URL de su backend
// const AUTH_SERVICE_URL = 'http://192.168.1.XX:3001';  // TODO: completar con IP real

// --- Servicio de Productos ---
// TODO: Pedir al equipo de productos service la URL de su backend
// const PRODUCTOS_SERVICE_URL = 'http://192.168.1.XX:3002'; // TODO: completar con IP real

// --- Servicio de Pagos ---
// TODO: Pedir al equipo de pagos service la URL de su backend
// const PAGOS_SERVICE_URL = 'http://192.168.1.XX:3003';  // TODO: completar con IP real
// const PAGOS_WEBHOOK_SECRET = 'secret-para-validar'; // TODO: completar

module.exports = {
  // --- Servicio de Auth ---
  // TODO: Ajustar IP cuando la obtengas del equipo de auth
  authServiceUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:4000',//localhost:4000', //localhost:3010
  authApiKey: process.env.AUTH_API_KEY || '', // TODO: completar si es necesario

  // --- Servicio de Productos ---
  // TODO: Ajustar IP cuando la obtengas del equipo de productos
  productosServiceUrl: process.env.PRODUCTOS_SERVICE_URL || 'http://localhost:4001',//localhost:4001', //localhost:3002

  // --- Servicio de Pagos ---
  // TODO: Ajustar IP cuando la obtengas del equipo de pagos
  pagosServiceUrl: process.env.PAGOS_SERVICE_URL || 'http://localhost:4002',//localhost:4002', //localhost:3003
  // TODO: Obtener secret para validar webhooks del equipo de pagos
  pagosWebhookSecret: process.env.PAGOS_WEBHOOK_SECRET || '',

  // --- Tu base de datos (PostgreSQL del otro equipo) ---
  // TODO: Verificar que estos valores coincidan con la DB del equipo de DB
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'sistema_compras',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
  },

  // --- Tu URL local (para webhooks) ---
  // Tu IP local para que los servicios externos te encuentren
  tuLocalUrl: process.env.TU_LOCAL_URL || 'http://localhost:3000'//localhost:3000'//localhost:3000'
};