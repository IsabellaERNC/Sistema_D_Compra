import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || '')
  const usuario = ref(null)

  try {
    const u = localStorage.getItem('usuario')
    if (u) usuario.value = JSON.parse(u)
  } catch {
    usuario.value = null
  }

  const isLoggedIn = computed(() => !!token.value && !!usuario.value?.id)
  const isVendedor = computed(() => usuario.value?.rol === 'vendedor' && !!usuario.value?.vendor_id)
  const nombre = computed(() => usuario.value?.nombre?.split(' ')[0] || 'Mi Perfil')

  function setToken(t) {
    token.value = t
    localStorage.setItem('token', t)
  }

  function setUsuario(u) {
    usuario.value = u
    localStorage.setItem('usuario', JSON.stringify(u))
  }

  function logout() {
    token.value = ''
    usuario.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    window.location.reload()
  }

  function decodeTokenPayload(t) {
    try {
      const parts = t.split('.')
      if (parts.length !== 3) return null
      const payload = JSON.parse(atob(parts[1]))
      return {
        id: payload.id || payload.sub || null,
        nombre: payload.nombre || payload.name || '',
        email: payload.email || '',
        rol: payload.rol || 'cliente',
        vendor_id: payload.vendor_id || null
      }
    } catch {
      return null
    }
  }

  function initFromUrl() {
    const params = new URLSearchParams(window.location.search)
    const t = params.get('token')
    if (t) {
      setToken(t)
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }

  // If token exists but no usuario, try to decode from JWT
  if (token.value && !usuario.value?.id) {
    const decoded = decodeTokenPayload(token.value)
    if (decoded?.id) {
      setUsuario(decoded)
    }
  }

  return { token, usuario, isLoggedIn, isVendedor, nombre, setToken, setUsuario, logout, initFromUrl }
})
