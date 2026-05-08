/**
 * Cliente HTTP para el servicio de autenticación externo
 * Usa fetch nativo de Node.js 18+
 */

const config = require('../config');

const BASE_URL = config.authServiceUrl;

/**
 * Realiza una petición al servicio externo
 * @param {string} endpoint - Endpoint a llamar
 * @param {object} options - Opciones de fetch
 * @returns {Promise<object>} Respuesta del servicio
 */
async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...(config.authApiKey ? { 'X-API-Key': config.authApiKey } : {})
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
      throw new Error('El servicio de autenticación no está disponible');
    }
    throw error;
  }
}

/**
 * Login de usuario en el servicio externo
 * @param {string} email - Email del usuario
 * @param {string} password - Contraseña del usuario
 * @returns {Promise<{token: string, usuario: object}>}
 */
async function login(email, password) {
  if (!email || !password) {
    return { error: 'Email y contraseña son requeridos' };
  }

  return request('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
}

/**
 * Registro de nuevo usuario en el servicio externo
 * @param {string} email - Email del usuario
 * @param {string} password - Contraseña del usuario
 * @param {string} nombre - Nombre del usuario
 * @returns {Promise<{token: string, usuario: object}>}
 */
async function register(email, password, nombre) {
  if (!email || !password || !nombre) {
    return { error: 'Email, contraseña y nombre son requeridos' };
  }

  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, nombre })
  });
}

/**
 * Valida un token y retorna la información del usuario
 * @param {string} token - Token JWT del usuario
 * @returns {Promise<object>} Datos del usuario
 */
async function validateToken(token) {
  if (!token) {
    return { error: 'Token es requerido' };
  }

  return request('/auth/me', {
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
