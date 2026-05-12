/**
 * Cliente HTTP para el servicio de notificaciones de pedidos externo
 * Usa fetch nativo de Node.js 18+
 */

const config = require('../config');

const BASE_URL   = config.notificacionesServiceUrl;
const TIMEOUT_MS = 5000;

/**
 * Realiza una petición al servicio de notificaciones con timeout y reintento
 * @param {string} endpoint - Endpoint a llamar
 * @param {object}   options  - Opciones de fetch (method, body, headers, ...)
 * @param {number}   retries  - Número de reintentos adicionales (default: 1)
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
        continue; // reintentar
      }

      if (error.name === 'AbortError') {
        throw new Error('El servicio de notificaciones no está disponible (timeout)');
      }

      if (error.message.includes('fetch') || error.message.includes('Error del servicio')) {
        throw new Error('El servicio de notificaciones no está disponible');
      }

      throw error;
    }
  }
}

/**
 * Notifica la creación de un nuevo pedido
 * @param {object} pedidoData - Datos del pedido creado
 * @returns {Promise<object>} Respuesta del servicio
 */
async function notificarPedidoCreado(pedidoData) {
  if (!pedidoData || typeof pedidoData !== 'object') {
    throw new Error('Datos de pedido inválidos');
  }

  return request('/notificaciones/pedido-creado', {
    body: JSON.stringify(pedidoData)
  });
}

/**
 * Notifica un cambio de estado en un pedido
 * @param {string|number} pedidoId    - ID del pedido
 * @param {string}        nuevoEstado - Nuevo estado del pedido
 * @param {object}        [metadata]  - Metadatos adicionales opcionales
 * @returns {Promise<object>} Respuesta del servicio
 */
async function notificarCambioEstado(pedidoId, nuevoEstado, metadata) {
  if (!pedidoId) {
    throw new Error('ID de pedido es requerido');
  }

  if (!nuevoEstado || typeof nuevoEstado !== 'string') {
    throw new Error('Estado del pedido es requerido');
  }

  const payload = {
    pedido_id: pedidoId,
    estado: nuevoEstado,
    ...(metadata && typeof metadata === 'object' ? { metadata } : {})
  };

  return request('/notificaciones/cambio-estado', {
    body: JSON.stringify(payload)
  });
}

/**
 * Notifica la cancelación de un pedido
 * @param {string|number} pedidoId - ID del pedido
 * @param {string}        motivo   - Motivo de la cancelación
 * @returns {Promise<object>} Respuesta del servicio
 */
async function notificarCancelacion(pedidoId, motivo) {
  if (!pedidoId) {
    throw new Error('ID de pedido es requerido');
  }

  if (!motivo || typeof motivo !== 'string') {
    throw new Error('Motivo de cancelación es requerido');
  }

  return request('/notificaciones/cancelacion', {
    body: JSON.stringify({ pedido_id: pedidoId, motivo })
  });
}

/**
 * Notifica un reembolso asociado a un pedido
 * @param {string|number} pedidoId   - ID del pedido
 * @param {number}        monto      - Monto reembolsado
 * @param {string}        referencia - Referencia o identificador del reembolso
 * @returns {Promise<object>} Respuesta del servicio
 */
async function notificarReembolso(pedidoId, monto, referencia) {
  if (!pedidoId) {
    throw new Error('ID de pedido es requerido');
  }

  if (monto === undefined || monto === null || typeof monto !== 'number' || monto <= 0) {
    throw new Error('Monto de reembolso inválido: debe ser un número positivo');
  }

  if (!referencia || typeof referencia !== 'string') {
    throw new Error('Referencia de reembolso es requerida');
  }

  return request('/notificaciones/reembolso', {
    body: JSON.stringify({ pedido_id: pedidoId, monto, referencia })
  });
}

module.exports = {
  notificarPedidoCreado,
  notificarCambioEstado,
  notificarCancelacion,
  notificarReembolso
};
