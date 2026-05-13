<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useCartStore } from '../stores/cart'
import { useToast } from '@/composables/useToast'
import { useApi } from '@/composables/useApi'

const router = useRouter()
const auth = useAuthStore()
const cart = useCartStore()
const { showToast } = useToast()
const { post, get, ApiError } = useApi()

const procesando = ref(false)
const direcciones = ref([])
const direccionSeleccionada = ref(null)
const cargandoDirecciones = ref(false)

async function cargarDirecciones() {
  if (!auth.isLoggedIn) return
  cargandoDirecciones.value = true
  try {
    const data = await get('/api/direcciones')
    direcciones.value = data.direcciones || []
    if (direcciones.value.length > 0) {
      const principal = direcciones.value.find(d => d.predeterminada)
      direccionSeleccionada.value = principal?.id || direcciones.value[0].id
    }
  } catch (err) {
    console.error('Error cargando direcciones:', err)
  } finally {
    cargandoDirecciones.value = false
  }
}

onMounted(() => {
  if (!auth.isLoggedIn) {
    localStorage.setItem('redirect_after_login', 'checkout')
    window.location.href = import.meta.env.VITE_AUTH_URL + '/auth/login?redirect=' + encodeURIComponent(window.location.origin + '/checkout')
  }
  cart.loadFromStorage()
  cargarDirecciones()
})

async function confirmar() {
  if (!auth.isLoggedIn) {
    window.location.href = import.meta.env.VITE_AUTH_URL + '/auth/login?redirect=' + encodeURIComponent(window.location.origin + '/checkout')
    return
  }
  if (cart.isEmpty) {
    showToast('El carrito esta vacio', 'warning')
    return
  }
  if (!direccionSeleccionada.value) {
    showToast('Selecciona una direccion de envio', 'warning')
    return
  }

  procesando.value = true
  try {
    const data = await post('/api/checkout/iniciar', {
      items: cart.items.map(i => ({
        producto_id: i.id,
        nombre: i.nombre,
        cantidad: i.cantidad,
        precio_unitario: i.precio
      })),
      total: cart.total,
      moneda: 'COP',
      direccion_envio_id: direccionSeleccionada.value
    })
    if (data.checkout_url) {
      const url = new URL(data.checkout_url)
      if (data.transaction_id) url.searchParams.set('tid', data.transaction_id)
      window.location.href = url.toString()
    } else {
      showToast('No se pudo iniciar el pago. Intenta nuevamente.', 'error', 5000)
    }
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 409) {
        const detalle = err.data.items_sin_stock
          ? err.data.items_sin_stock.map(i => `${i.nombre} (solicitado: ${i.cantidad_solicitada}, disponible: ${i.stock_disponible})`).join('\n')
          : ''
        showToast('Stock insuficiente: ' + detalle, 'error', 5000)
        return
      }
      if (err.status === 400) {
        showToast(err.data.error || 'Error en el checkout', 'error', 5000)
        return
      }
    }
    showToast(err.message, 'error', 5000)
  } finally {
    procesando.value = false
  }
}
</script>

<template>
  <div class="page-container">
    <h1 class="page-title">Resumen de Compra</h1>

    <div v-if="cart.isEmpty" class="empty-state">
      <p>Tu carrito esta vacio.</p>
      <RouterLink to="/carrito" class="btn btn-primary">Volver al carrito</RouterLink>
    </div>

    <div v-else>
      <div v-for="item in cart.items" :key="item.id" class="checkout-item">
        <div>
          <div class="checkout-item-name">{{ item.nombre }}</div>
          <div class="checkout-item-detail">{{ item.cantidad }} x ${{ Number(item.precio).toLocaleString() }}</div>
        </div>
        <div class="checkout-item-name">${{ (item.precio * item.cantidad).toLocaleString() }}</div>
      </div>

<div class="checkout-totals">
        <div class="checkout-total-row">
          <span>Subtotal</span>
          <span>${{ cart.subtotal.toLocaleString() }}</span>
        </div>
        <div class="checkout-total-row">
          <span>Envio</span>
          <span>{{ cart.envio === 0 ? 'Gratis' : '$' + cart.envio.toLocaleString() }}</span>
        </div>
        <div class="checkout-total-row total">
          <span>Total</span>
          <span>${{ cart.total.toLocaleString() }}</span>
        </div>
      </div>

      <div class="address-section">
        <h3 class="section-title">Direccion de Envio</h3>
        <div v-if="cargandoDirecciones" class="loading-state">
          <span class="spinner"></span> Cargando direcciones...
        </div>
        <div v-else-if="direcciones.length === 0" class="empty-state">
          <p>No tienes direcciones guardadas.</p>
          <RouterLink to="/direcciones/agregar?redirect=checkout" class="btn btn-outline btn-sm">
            Agregar direccion
          </RouterLink>
        </div>
        <div v-else class="address-selector">
          <label v-for="dir in direcciones" :key="dir.id" class="address-option" :class="{ selected: direccionSeleccionada === dir.id }">
            <input type="radio" :value="dir.id" v-model="direccionSeleccionada" name="direccion" />
            <div class="address-details">
              <span class="address-label">{{ dir.alias }}</span>
              <span class="address-text">{{ dir.calle }}, {{ dir.ciudad }}</span>
              <span v-if="dir.predeterminada" class="badge-principal">Principal</span>
            </div>
          </label>
          <RouterLink to="/direcciones?redirect=checkout" class="btn btn-outline btn-sm">
            Administrar direcciones
          </RouterLink>
        </div>
      </div>

      <div class="cart-actions">
        <RouterLink to="/carrito" class="btn btn-outline">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5m0 0 7-7m-7 7 7 7"/></svg>
          Regresar al carrito
        </RouterLink>
        <button @click="confirmar" class="btn btn-success btn-lg btn-pill" :disabled="procesando || !direccionSeleccionada" :class="{ loading: procesando }">
          <span class="spinner spinner-sm"></span>
          <span class="btn-text" v-if="!procesando">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            Confirmar compra
          </span>
          <span class="btn-text" v-else>Procesando...</span>
        </button>
      </div>
    </div>
  </div>
</template>
