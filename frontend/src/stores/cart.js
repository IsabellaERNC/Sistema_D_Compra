import { defineStore } from 'pinia'
import { ref, computed, onUnmounted } from 'vue'
import { useAuthStore } from './auth'
import { useSocket } from '../composables/useSocket'

const API_URL = import.meta.env.VITE_API_URL

export const useCartStore = defineStore('cart', () => {
  const auth = useAuthStore()
  const { on, off } = useSocket()

  function getStorageKey() {
    return auth.usuario?.id ? `carrito_${auth.usuario.id}` : 'carrito_guest'
  }

  const items = ref([])

  function loadFromStorage() {
    try {
      const raw = localStorage.getItem(getStorageKey())
      items.value = raw ? JSON.parse(raw) : []
    } catch {
      items.value = []
    }
  }

  loadFromStorage()

  let fusionCompletada = false

  const totalItems = computed(() => items.value.reduce((s, i) => s + i.cantidad, 0))
  const subtotal = computed(() => items.value.reduce((s, i) => s + i.precio * i.cantidad, 0))
  const envio = computed(() => subtotal.value < 500 ? 50 : 0)
  const total = computed(() => subtotal.value + envio.value)
  const isEmpty = computed(() => items.value.length === 0)

  function save() {
    localStorage.setItem(getStorageKey(), JSON.stringify(items.value))
  }

  function add(producto) {
    const existe = items.value.find(i => i.id === producto.id)
    if (existe) {
      existe.cantidad++
    } else {
      items.value.push({ id: producto.id, nombre: producto.nombre, precio: producto.precio, cantidad: 1 })
    }
    save()
    syncBackend()
  }

  function remove(index) {
    items.value.splice(index, 1)
    save()
    syncBackend()
  }

  function increase(index) {
    items.value[index].cantidad++
    save()
    syncBackend()
  }

  function decrease(index) {
    const item = items.value[index]
    if (item.cantidad > 1) {
      item.cantidad--
      save()
      syncBackend()
    } else {
      const productoId = item.id
      items.value.splice(index, 1)
      save()
      if (auth.token) {
        fetch(`${API_URL}/api/carrito/${productoId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${auth.token}` }
        }).catch(() => {})
      }
    }
  }

  function clear() {
    items.value = []
    save()
    if (auth.token) {
      fetch(`${API_URL}/api/carrito`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${auth.token}` }
      }).catch(() => {})
    }
  }

  async function syncBackend() {
    if (!auth.token) return

    if (!fusionCompletada) {
      fusionCompletada = true
      const guestKey = 'carrito_guest'
      const guestRaw = localStorage.getItem(guestKey)
      if (guestRaw) {
        try {
          const guestItems = JSON.parse(guestRaw)
          if (guestItems.length > 0) {
            await fetch(`${API_URL}/api/carrito/fusionar`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${auth.token}`
              },
              body: JSON.stringify({ items: guestItems })
            })
          }
        } catch (e) {
          console.error('Error merging guest cart:', e)
        }
        localStorage.removeItem(guestKey)
      }
    }

    await fetchBackendCart()
  }

  async function fetchBackendCart() {
    if (!auth.token) return
    try {
      const res = await fetch(`${API_URL}/api/carrito`, {
        headers: { 'Authorization': `Bearer ${auth.token}` }
      })
      if (res.ok) {
        const data = await res.json()
        if (data.items) {
          items.value = data.items.map(i => ({
            id: i.producto_id,
            nombre: i.producto_nombre,
            precio: i.precio_unitario,
            cantidad: i.cantidad
          }))
          save()
        }
      }
    } catch (err) {
      console.error('Error cargando carrito backend:', err)
    }
  }

  async function updateQuantity(productoId, cantidad) {
    if (!auth.token) return
    try {
      const res = await fetch(`${API_URL}/api/carrito/${productoId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify({ cantidad })
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error actualizando cantidad')
      }
      await fetchBackendCart()
    } catch (err) {
      alert(err.message)
      throw err
    }
  }

  function onCarritoActualizado(data) {
    if (auth.isLoggedIn && data?.carrito) {
      items.value = data.carrito.map(i => ({
        id: i.producto_id,
        nombre: i.producto_nombre,
        precio: i.precio_unitario,
        cantidad: i.cantidad
      }))
      save()
    }
  }

  function onCarritoLimpiado() {
    if (auth.isLoggedIn) {
      items.value = []
      save()
    }
  }

  on('carrito:actualizado', onCarritoActualizado)
  on('carrito:limpiado', onCarritoLimpiado)

  return {
    items, totalItems, subtotal, envio, total, isEmpty,
    add, remove, increase, decrease, clear,
    fetchBackendCart, updateQuantity, loadFromStorage
  }
})
