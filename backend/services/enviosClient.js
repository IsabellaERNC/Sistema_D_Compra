/**
 * Cliente HTTP para el servicio de envíos externo
 * Usa createServiceClient de adapters.js
 */

const config = require('../config');
const { createServiceClient } = require('../lib/adapters');

const client = createServiceClient(config.enviosServiceUrl, {
  headers: { 'Content-Type': 'application/json' }
});

/**
 * Crea un envío/guía para un pedido
 * @param {object} datos - Datos del envío
 * @param {string} datos.pedido_id - ID del pedido
 * @param {string} datos.direccion_envio_id - ID de la dirección de envío
 * @param {Array}  datos.items - Items del pedido
 * @param {number} datos.monto_total - Monto total del pedido
 * @returns {Promise<object>} Envío creado
 */
async function crearEnvio(datos) {
  if (!datos || !datos.pedido_id) {
    throw new Error('Datos de envío inválidos: se requiere pedido_id');
  }

  return client.requestWithRetry('/api/envios/crear', {
    method: 'POST',
    body: JSON.stringify(datos)
  });
}

/**
 * Consulta el estado de un envío
 * @param {string} envioId - ID del envío
 * @returns {Promise<object>} Estado del envío
 */
async function getEstadoEnvio(envioId) {
  if (!envioId) {
    throw new Error('ID de envío requerido');
  }

  return client.requestWithRetry(`/api/envios/${envioId}/estado`, { method: 'GET' });
}

module.exports = {
  crearEnvio,
  getEstadoEnvio
};
