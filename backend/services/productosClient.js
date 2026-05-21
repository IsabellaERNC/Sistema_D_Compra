/**
 * Cliente HTTP para el servicio de productos externo
 * Usa createServiceClient de adapters.js
 */

const config = require('../config');
const { createServiceClient } = require('../lib/adapters');

const client = createServiceClient(config.productosServiceUrl, {
  headers: { 'Content-Type': 'application/json' }
});

/**
 * Obtiene la lista de productos del servicio externo
 * BUG-04: Usa requestWithRetry con timeout en lugar de request() directo
 */
async function getProductos(token) {
  const options = { method: 'GET' };

  if (token) {
    options.headers = { 'Authorization': `Bearer ${token}` };
  }

  const data = await client.requestWithRetry('/productos', options);

  if (data.productos) return { productos: data.productos };
  if (Array.isArray(data)) return { productos: data };
  return data;
}

/**
 * Verifica el stock disponible de un producto
 */
async function verificarStock(productoId, token) {
  if (!productoId) {
    throw new Error('productoId es requerido');
  }

  const options = {};
  if (token) {
    options.headers = { 'Authorization': `Bearer ${token}` };
  }

  return client.requestWithRetry(`/productos/${productoId}/stock`, options);
}

/**
 * Obtiene un producto por su ID
 */
async function getProducto(productoId, token) {
  if (!productoId) {
    throw new Error('productoId es requerido');
  }

  const options = {};
  if (token) {
    options.headers = { 'Authorization': `Bearer ${token}` };
  }

  return client.requestWithRetry(`/productos/${productoId}`, options);
}

/**
 * Reduce el stock de un producto
 */
async function deducirStock(productoId, cantidad) {
  if (!productoId) {
    throw new Error('productoId es requerido');
  }

  if (!cantidad || cantidad <= 0) {
    throw new Error('cantidad debe ser un número positivo');
  }

  return client.requestWithRetry(`/productos/${productoId}/descontar-stock`, {
    method: 'POST',
    body: JSON.stringify({ cantidad })
  });
}

/**
 * Obtiene recomendaciones de productos para un usuario
 */
async function getRecommendations(userId, limit = 5) {
  if (!userId) {
    throw new Error('userId es requerido');
  }

  const params = new URLSearchParams({
    userId: String(userId),
    limit: String(limit)
  });

  return client.requestWithRetry(`/productos/recomendaciones?${params.toString()}`);
}

module.exports = {
  getProductos,
  verificarStock,
  getProducto,
  deducirStock,
  getRecommendations
};
