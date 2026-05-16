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

module.exports = {
  authClient,
  productosClient,
  pagosClient,
  notificacionesClient,
  enviosClient
};
