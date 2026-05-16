/**
 * Cliente HTTP para el servicio de envíos externo
 * Usa fetch nativo de Node.js 18+
 */

const config = require('../config');

const BASE_URL   = config.enviosServiceUrl;
const TIMEOUT_MS = 5000;

/**
 * Realiza una petición al servicio de envíos con timeout y reintento
 * @param {string} endpoint - Endpoint a llamar
 * @param {object}   options  - Opciones de fetch
 * @param {number}   retries  - Número de reintentos (default: 1)
 * @returns {Promise<object>} Respuesta del servicio
 */
async function request(endpoint, options = {}, retries = 1) {
  const url = `${BASE_URL}${endpoint}`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const finalOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      signal: controller.signal
    };

    try {
      const response = await fetch(url, finalOptions);
      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(`Error del servicio: ${data.error || data.message || response.status}`);
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);

      const isRetryable =
        error.name === 'AbortError' ||
        error.message.includes('fetch') ||
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('ENOTFOUND');

      if (attempt < retries && isRetryable) {
        continue;
      }

      if (error.name === 'AbortError') {
        throw new Error('El servicio de envíos no está disponible (timeout)');
      }

      if (error.message.includes('fetch') || error.message.includes('Error del servicio')) {
        throw new Error('El servicio de envíos no está disponible');
      }

      throw error;
    }
  }
}

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

  return request('/api/envios/crear', {
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

  return request(`/api/envios/${envioId}/estado`, { method: 'GET' });
}

module.exports = {
  crearEnvio,
  getEstadoEnvio
};
