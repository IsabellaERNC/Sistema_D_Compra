/**
 * Cliente HTTP para el servicio de autenticación externo
 * Usa createServiceClient de adapters.js
 */

const config = require('../config');
const { createServiceClient } = require('../lib/adapters');

const client = createServiceClient(config.authServiceUrl, {
  headers: {
    ...(config.authApiKey ? { 'X-API-Key': config.authApiKey } : {})
  }
});

/**
 * Login de usuario en el servicio externo
 * BUG-09: Lanza Error en lugar de retornar { error } para consistencia con try/catch
 */
async function login(email, password) {
  if (!email || !password) {
    throw new Error('Email y contraseña son requeridos');
  }

  return client.requestWithRetry('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
}

/**
 * Registro de nuevo usuario en el servicio externo
 * BUG-09: Lanza Error en lugar de retornar { error } para consistencia con try/catch
 */
async function register(email, password, nombre) {
  if (!email || !password || !nombre) {
    throw new Error('Email, contraseña y nombre son requeridos');
  }

  return client.requestWithRetry('/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, nombre })
  });
}

/**
 * Valida un token y retorna la información del usuario
 */
async function validateToken(token) {
  if (!token) {
    return { error: 'Token es requerido' };
  }

  return client.requestWithRetry('/me', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
}

module.exports = {
  login,
  register,
  validateToken
};
