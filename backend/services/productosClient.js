/**
 * Cliente HTTP para el servicio de productos externo
 * Usa fetch nativo de Node.js 18+
 */

const config = require('../config');

const BASE_URL = config.productosServiceUrl;

/**
 * Realiza una petición al servicio externo de productos
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
      throw new Error('El servicio de productos no está disponible');
    }
    throw error;
  }
}

/**
 * Obtiene la lista de productos del servicio externo
 * @param {string} [token] - Token opcional para autenticación Bearer
 * @returns {Promise<{productos: Array}>} Lista de productos
 */
async function getProductos(token) {
  const options = {
    method: 'GET'
  };

  // Si se proporciona token, agregar Authorization header
  if (token) {
    options.headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    };
  }

  const data = await request('/productos', options);

  // Normalizar el formato de respuesta para el frontend
  // El frontend espera: { productos: [{ id, nombre, precio, stock }, ...] }
  if (data.productos) {
    return { productos: data.productos };
  }

  // Si el servicio devuelve directamente un array, envolverlo
  if (Array.isArray(data)) {
    return { productos: data };
  }

  return data;
}

module.exports = {
  getProductos
};