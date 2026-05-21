/**
 * Cliente HTTP para el servicio de notificaciones de pedidos externo
 * Usa createServiceClient de adapters.js
 */

const config = require('../config');
const { createServiceClient } = require('../lib/adapters');

const { requestWithRetry } = createServiceClient(config.notificacionesServiceUrl, {
  headers: { 'Content-Type': 'application/json' }
});

/**
 * Notifica la creación de un nuevo pedido
 * @param {object} pedidoData - Datos del pedido creado
 * @returns {Promise<object>} Respuesta del servicio
 */
async function notificarPedidoCreado(pedidoData) {
  if (!pedidoData || typeof pedidoData !== 'object') {
    throw new Error('Datos de pedido inválidos');
  }

  return requestWithRetry('/notificaciones/pedido-creado', {
    method: 'POST',
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

  return requestWithRetry('/notificaciones/cambio-estado', {
    method: 'POST',
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

  return requestWithRetry('/notificaciones/cancelacion', {
    method: 'POST',
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

  return requestWithRetry('/notificaciones/reembolso', {
    method: 'POST',
    body: JSON.stringify({ pedido_id: pedidoId, monto, referencia })
  });
}

module.exports = {
  notificarPedidoCreado,
  notificarCambioEstado,
  notificarCancelacion,
  notificarReembolso
};
