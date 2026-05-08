/**
 * Cliente HTTP para el servicio de pagos externo (MercadoPago)
 * Usa fetch nativo de Node.js 18+
 */

const config    = require('../config');
const crypto    = require('crypto');

const BASE_URL           = config.pagosServiceUrl;
const WEBHOOK_SECRET     = config.pagosWebhookSecret;

/**
 * Realiza una petición al servicio externo de pagos
 * @param {string} endpoint - Endpoint a llamar
 * @param {object} options - Opciones de fetch
 * @returns {Promise<object>} Respuesta del servicio
 */
async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;

  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const finalOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers
    }
  };

  try {
    const response = await fetch(url, finalOptions);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || `Error del servicio: ${response.status}`);
    }

    return data;
  } catch (error) {
    if (error.message.includes('Error del servicio') || error.message.includes('fetch')) {
      throw new Error('El servicio de pagos no está disponible');
    }
    throw error;
  }
}

/**
 * Crea una preferencia de checkout en MercadoPago
 * @param {object} datos - Datos del checkout
 * @param {object} datos.usuario - Datos del usuario {id, email}
 * @param {Array} datos.items - Items [{producto_id, nombre, cantidad, precio_unitario}]
 * @param {number} datos.total - Total de la compra
 * @param {string} [datos.moneda] - Moneda (default: COP)
 * @param {string} datos.url_redirect_ok - URL de retorno en éxito
 * @param {string} datos.url_redirect_error - URL de retorno en error
 * @returns {Promise<object>} Preferencia creada con init_point
 */
async function crearCheckout(datos) {
  const { usuario, items, total, moneda = 'COP', url_redirect_ok, url_redirect_error } = datos;

  if (!usuario || !usuario.id || !usuario.email) {
    throw new Error('Datos de usuario inválidos: se requiere id y email');
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new Error('Items inválidos: se requiere al menos un item');
  }

  if (!total || total <= 0) {
    throw new Error('Total inválido: debe ser mayor a 0');
  }

  if (!url_redirect_ok || !url_redirect_error) {
    throw new Error('URLs de redirect inválidas');
  }

  const payload = {
    usuario,
    items,
    total,
    moneda,
    url_redirect_ok,
    url_redirect_error
  };

  const respuesta = await request('/checkout', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  return respuesta;
}

/**
 * Verifica la firma HMAC de un webhook de MercadoPago
 * @param {string} payload - String del payload recibido
 * @param {string} signature - Signature del header x-signature
 * @returns {boolean} true si la firma es válida
 */
function verificarSignature(payload, signature) {
  if (!payload || typeof payload !== 'string') {
    throw new Error('Payload inválido');
  }

  if (!signature || typeof signature !== 'string') {
    throw new Error('Signature inválida');
  }

  if (!WEBHOOK_SECRET) {
    throw new Error('Secret de webhook no configurado');
  }

  const esperado = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payload, 'utf8')
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(esperado)
  );
}

module.exports = {
  crearCheckout,
  verificarSignature
};