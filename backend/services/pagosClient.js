/**
 * Cliente HTTP para el servicio de pagos externo (MercadoPago)
 * Usa createServiceClient de adapters.js
 */

const config = require('../config');
const crypto = require('crypto');
const { createServiceClient } = require('../lib/adapters');

const WEBHOOK_SECRET = config.pagosWebhookSecret;

/**
 * BUG-10: Incluye X-API-Key en headers cuando está configurada
 */
const client = createServiceClient(config.pagosServiceUrl, {
  headers: {
    ...(config.pagosApiKey ? { 'X-API-Key': config.pagosApiKey } : {})
  }
});

/**
 * Crea una preferencia de checkout en MercadoPago
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

  const payload = { usuario, items, total, moneda, url_redirect_ok, url_redirect_error };

  return client.requestWithRetry('/checkout', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

/**
 * Verifica la firma HMAC de un webhook de MercadoPago
 * BUG-05: Guarda de longitud antes de timingSafeEqual para evitar excepción
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

  const bufSignature = Buffer.from(signature);
  const bufEsperado  = Buffer.from(esperado);

  if (bufSignature.length !== bufEsperado.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufSignature, bufEsperado);
}

/**
 * Solicita reembolso de una transacción al servicio de pagos externo
 */
async function solicitarReembolso(transaccionId) {
  if (!transaccionId) {
    throw new Error('transaccionId es requerido');
  }

  return client.requestWithRetry('/reembolso', {
    method: 'POST',
    body: JSON.stringify({ transaccionId })
  });
}

module.exports = {
  crearCheckout,
  verificarSignature,
  solicitarReembolso
};
