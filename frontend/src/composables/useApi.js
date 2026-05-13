const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

class ApiError extends Error {
  constructor(message, status, data) {
    super(message)
    this.status = status
    this.data = data
  }
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

  const get = async (endpoint) => {
    const res = await fetch(`${API_URL}${endpoint}`, { headers: getHeaders() })
    return handleResponse(res)
  }

  const post = async (endpoint, body) => {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getHeaders() },
      body: JSON.stringify(body)
    })
    return handleResponse(res)
  }

  const patch = async (endpoint, body) => {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getHeaders() },
      body: JSON.stringify(body)
    })
    return handleResponse(res)
  }

  const del = async (endpoint) => {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'DELETE',
      headers: getHeaders()
    })
    return handleResponse(res)
  }

  return { get, post, patch, del, ApiError }
}
