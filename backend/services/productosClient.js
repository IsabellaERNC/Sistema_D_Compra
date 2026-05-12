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

/**
 * Realiza una petición con timeout y reintentos
 * @param {string} endpoint - Endpoint a llamar
 * @param {object} [options={}] - Opciones de fetch
 * @param {number} [timeout=5000] - Timeout en ms
 * @param {number} [retries=1] - Número de reintentos en caso de fallo
 * @returns {Promise<object>} Respuesta del servicio
 */
async function requestWithRetry(endpoint, options = {}, timeout = 5000, retries = 1) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

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
      // Si no quedan reintentos, se lanza el error al salir del bucle
    }
  }

  throw lastError;
}

/**
 * Verifica el stock disponible de un producto
 * @param {string|number} productoId - ID del producto
 * @returns {Promise<{producto_id: string|number, stock: number}>} Stock del producto
 */
async function verificarStock(productoId) {
  if (!productoId) {
    throw new Error('productoId es requerido');
  }

  return requestWithRetry(`/productos/${productoId}/stock`);
}

/**
 * Obtiene un producto por su ID
 * @param {string|number} productoId - ID del producto
 * @returns {Promise<{id: string|number, nombre: string, precio: number, stock: number}>} Datos del producto
 */
async function getProducto(productoId) {
  if (!productoId) {
    throw new Error('productoId es requerido');
  }

  return requestWithRetry(`/productos/${productoId}`);
}

/**
 * Reduce el stock de un producto
 * @param {string|number} productoId - ID del producto
 * @param {number} cantidad - Cantidad a descontar
 * @returns {Promise<{success: boolean, nuevo_stock: number}>} Resultado de la operación
 */
async function deducirStock(productoId, cantidad) {
  if (!productoId) {
    throw new Error('productoId es requerido');
  }

  if (!cantidad || cantidad <= 0) {
    throw new Error('cantidad debe ser un número positivo');
  }

  return requestWithRetry(`/productos/${productoId}/descontar-stock`, {
    method: 'POST',
    body: JSON.stringify({ cantidad })
  });
}

/**
 * Obtiene recomendaciones de productos para un usuario
 * @param {string|number} userId - ID del usuario
 * @param {number} [limit=5] - Cantidad máxima de recomendaciones
 * @returns {Promise<Array>} Lista de productos recomendados
 */
async function getRecommendations(userId, limit = 5) {
  if (!userId) {
    throw new Error('userId es requerido');
  }

  const params = new URLSearchParams({
    userId: String(userId),
    limit: String(limit)
  });

  return requestWithRetry(`/productos/recomendaciones?${params.toString()}`);
}

module.exports = {
  getProductos,
  verificarStock,
  getProducto,
  deducirStock,
  getRecommendations
};