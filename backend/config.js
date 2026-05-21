const config = {
  port: process.env.PORT || '3000',

  authServiceUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:4000',
  authApiKey: process.env.AUTH_API_KEY || '',

  productosServiceUrl: process.env.PRODUCTOS_SERVICE_URL || 'http://localhost:4001',

  notificacionesServiceUrl: process.env.NOTIFICACIONES_SERVICE_URL || 'http://localhost:4003',

  pagosServiceUrl: process.env.PAGOS_SERVICE_URL || 'http://localhost:4002',
  pagosWebhookSecret: process.env.PAGOS_WEBHOOK_SECRET || '',
  pagosApiKey: process.env.PAGOS_API_KEY || '',

  enviosServiceUrl: process.env.ENVIOS_SERVICE_URL || 'http://localhost:4004',

  jwtSecret: process.env.JWT_SECRET || '',

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'sistema_d_compra',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '1234',
    connectionTimeoutMillis: 3000,
  },

  corsOrigins: (process.env.CORS_ORIGINS || process.env.TU_LOCAL_URL || 'http://localhost:5173')
    .split(',')
    .map(s => s.trim()),

  urlPagoOk: process.env.URL_PAGO_OK || 'http://localhost:5173/confirmacion?status=ok',
  urlPagoError: process.env.URL_PAGO_ERROR || 'http://localhost:5173/confirmacion?status=error',
};

function validateEnv() {
  const required = [
    ['JWT_SECRET', config.jwtSecret],
    ['DB_HOST', config.db.host],
    ['DB_USER', config.db.user],
    ['DB_PASSWORD', config.db.password],
    ['DB_NAME', config.db.database],
    ['PAGOS_WEBHOOK_SECRET', config.pagosWebhookSecret],
    ['AUTH_API_KEY', config.authApiKey],
    ['PAGOS_API_KEY', config.pagosApiKey],
  ];

  const missing = required.filter(([, value]) => !value);
  if (missing.length > 0) {
    const vars = missing.map(([name]) => name).join(', ');
    console.warn(`[config] Variables de entorno faltantes: ${vars}`);
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Variables requeridas no configuradas: ${vars}`);
    }
  }
}

module.exports = config;
module.exports.validateEnv = validateEnv;
