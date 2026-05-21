const API_URL = import.meta.env.VITE_API_URL;

class ApiError extends Error {
  constructor(message, status, data) {
    super(message)
    this.status = status
    this.data = data
  }
}

/**
 * Fetch with configurable timeout via AbortController.
 * @param {string} url
 * @param {object} options - fetch options (without signal)
 * @param {number} timeoutMs - timeout in milliseconds
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(url, { ...options, signal: controller.signal })
    clearTimeout(timeoutId)
    return res
  } catch (err) {
    clearTimeout(timeoutId)
    throw err
  }
}

function isNetworkError(err) {
  return err instanceof TypeError || err.name === 'AbortError'
}

export function useApi() {
  const getHeaders = () => {
    const token = localStorage.getItem('token')
    return token ? { 'Authorization': `Bearer ${token}` } : {}
  }

  const handleResponse = async (res) => {
    const data = await res.json()
    if (!res.ok) {
      throw new ApiError(data.error || `HTTP ${res.status}`, res.status, data)
    }
    return data
  }

  /**
   * Execute an async function with retry on network errors.
   * @param {function(number): Promise} fn - receives timeoutMs
   * @param {object} [options]
   * @param {number} [options.timeout] - per-request timeout override
   * @param {boolean} [options.skipRetry] - skip retry on first failure
   */
  const withRetry = async (fn, options = {}) => {
    const timeout = options.timeout || 10000
    try {
      return await fn(timeout)
    } catch (err) {
      if (!options.skipRetry && isNetworkError(err)) {
        await new Promise(r => setTimeout(r, 1000))
        return await fn(timeout)
      }
      throw err
    }
  }

  const get = async (endpoint, options) => {
    return withRetry(async (timeout) => {
      const res = await fetchWithTimeout(`${API_URL}${endpoint}`, { headers: getHeaders() }, timeout)
      return handleResponse(res)
    }, options)
  }

  const post = async (endpoint, body, options) => {
    return withRetry(async (timeout) => {
      const res = await fetchWithTimeout(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getHeaders() },
        body: JSON.stringify(body)
      }, timeout)
      return handleResponse(res)
    }, options)
  }

  const patch = async (endpoint, body, options) => {
    return withRetry(async (timeout) => {
      const res = await fetchWithTimeout(`${API_URL}${endpoint}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getHeaders() },
        body: JSON.stringify(body)
      }, timeout)
      return handleResponse(res)
    }, options)
  }

  const del = async (endpoint, options) => {
    return withRetry(async (timeout) => {
      const res = await fetchWithTimeout(`${API_URL}${endpoint}`, {
        method: 'DELETE',
        headers: getHeaders()
      }, timeout)
      return handleResponse(res)
    }, options)
  }

  return { get, post, patch, del, ApiError }
}
