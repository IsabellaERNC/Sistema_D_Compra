module.exports = {
  authServiceUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:4000',
  authApiKey: process.env.AUTH_API_KEY || '',

  productosServiceUrl: process.env.PRODUCTOS_SERVICE_URL || 'http://localhost:4001',

  notificacionesServiceUrl: process.env.NOTIFICACIONES_SERVICE_URL || 'http://localhost:4003',

  pagosServiceUrl: process.env.PAGOS_SERVICE_URL || 'http://localhost:4002',

  pagosWebhookSecret: process.env.PAGOS_WEBHOOK_SECRET || '',

  jwtSecret: process.env.JWT_SECRET || '',
  devMode: process.env.DEV_MODE === 'true',

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'sistema_d_compra',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '1234'
  },

  tuLocalUrl: process.env.TU_LOCAL_URL || 'http://localhost:5173',

  urlPagoOk: process.env.URL_PAGO_OK || 'http://localhost:5173/pages/confirmacion.html',
  urlPagoError: process.env.URL_PAGO_ERROR || 'http://localhost:5173/pages/pago.html?error=1'
};
