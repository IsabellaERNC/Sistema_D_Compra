/**
 * ============================================
 * ADAPTADORES UNIFICADOS - Microservicio Carrito
 * ============================================
 * Punto único de importación para todos los clientes HTTP.
 * Cada servicio externo tiene su propio adapter en /services/.
 *
 * CUSTOMIZAR: los endpoints de cada adapter según lo que
 * los otros microservicios expongan.
 * ============================================
 */

const authClient                = require('../services/authClient');
const productosClient           = require('../services/productosClient');
const pagosClient               = require('../services/pagosClient');
const notificacionesClient      = require('../services/notificacionesPedidosClient');
const enviosClient              = require('../services/enviosClient');

/**
 * Crea un cliente HTTP genérico para un servicio externo.
 * @param {string} baseUrl - URL base del servicio
 * @param {object} defaultOptions - Opciones por defecto para todas las peticiones
 * @returns {{ request, requestWithRetry }}
 */
function createServiceClient(baseUrl, defaultOptions = {}) {
  const mergedDefaults = {
    headers: {
      'Content-Type': 'application/json',
      ...defaultOptions.headers
    },
    ...defaultOptions
  };

  /**
   * Realiza una petición HTTP sin reintentos
   */
  async function request(endpoint, options = {}) {
    const url = `${baseUrl}${endpoint}`;
    const finalOptions = {
      ...mergedDefaults,
      ...options,
      headers: {
        ...mergedDefaults.headers,
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
        throw new Error(`El servicio en ${baseUrl} no está disponible`);
      }
      throw error;
    }
  }

  /**
   * Realiza una petición con timeout real y reintentos
   */
  async function requestWithRetry(endpoint, options = {}, retries = 1, timeoutMs = 5000) {
    let lastError;

    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const finalOptions = {
          ...options,
          signal: controller.signal
        };
        const result = await request(endpoint, finalOptions);
        clearTimeout(timeoutId);
        return result;
      } catch (error) {
        clearTimeout(timeoutId);
        lastError = error;

        const isRetryable =
          error.name === 'AbortError' ||
          error.message.includes('fetch') ||
          error.message.includes('ECONNREFUSED') ||
          error.message.includes('ENOTFOUND');

        if (attempt < retries && isRetryable) continue;

        if (error.name === 'AbortError') {
          throw new Error(`El servicio en ${baseUrl} no está disponible (timeout)`);
        }
        throw error;
      }
    }

    throw lastError;
  }

  return { request, requestWithRetry };
}

module.exports = {
  authClient,
  productosClient,
  pagosClient,
  notificacionesClient,
  enviosClient,
  createServiceClient
};
