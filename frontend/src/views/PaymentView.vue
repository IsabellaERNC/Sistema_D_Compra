<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useCartStore } from '../stores/cart'
import { useSocket } from '@/composables/useSocket'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const cart = useCartStore()

const status = ref('')
const paymentId = ref('')
const loading = ref(true)
const titulo = ref('Procesando pago...')
const mensaje = ref('Por favor espera mientras procesamos tu pago.')
const transaccion = ref(null)
const transaccionEstado = computed(() => (transaccion.value?.estado || '').toUpperCase())

const animKey = ref(0)

let redirectTimeoutId = null
let pollIntervalId = null

function scheduleRedirectToPedidos() {
  if (redirectTimeoutId) clearTimeout(redirectTimeoutId)
  redirectTimeoutId = setTimeout(() => router.push('/pedidos'), 3000)
}

function scheduleRedirectToCarrito() {
  if (redirectTimeoutId) clearTimeout(redirectTimeoutId)
  redirectTimeoutId = setTimeout(() => router.push('/carrito'), 300)
}

function notifyRejectedAndRedirect() {
  try {
    localStorage.setItem('toast_after_redirect', JSON.stringify({
      message: 'Tu transacción fue rechazada. Tu carrito se mantiene para que intentes nuevamente.',
      type: 'error'
    }))
  } catch (_) {}

  // Redirección inmediata (más confiable que depender solo de setTimeout)
  try {
    router.replace('/carrito')
    return
  } catch (_) {
  }

  scheduleRedirectToCarrito()
}

function stopPolling() {
  if (pollIntervalId) {
    clearInterval(pollIntervalId)
    pollIntervalId = null
  }
}

async function pollTransaccionesUntilResolved() {
  if (!auth.token) return
  stopPolling()
  pollIntervalId = setInterval(async () => {
    try {
      const r = await fetch(import.meta.env.VITE_API_URL + '/api/transacciones/', {
        headers: { 'Authorization': `Bearer ${auth.token}` }
      })
      const data = await r.json()
      if (!data?.error && data.transacciones?.length) {
        transaccion.value = data.transacciones[0]
        const nuevoEstado = String(transaccion.value?.estado || '').toUpperCase()
        if (nuevoEstado === 'APROBADA') {
          titulo.value = 'Pago aprobado'
          mensaje.value = 'Tu pago fue procesado exitosamente. Gracias por tu compra.'
          status.value = 'approved'
          cart.clear()
          scheduleRedirectToPedidos()
          stopPolling()
        } else if (nuevoEstado === 'RECHAZADA') {
          titulo.value = 'Pago rechazado'
          mensaje.value = 'Tu pago fue rechazado. Por favor intenta con otro metodo de pago.'
          status.value = 'rejected'
          notifyRejectedAndRedirect()
          stopPolling()
        }
      }
    } catch (_) {
    }
  }, 2000)
}

const statusClass = computed(() => {
  if (status.value === 'approved') return 'status-approved'
  if (status.value === 'pending') return 'status-pending'
  if (status.value === 'rejected' || status.value === 'failure') return 'status-rejected'
  return 'status-unknown'
})

onMounted(() => {
  status.value = route.query.status || ''
  paymentId.value = route.query.payment_id || ''
  loading.value = false

  if (!status.value && !paymentId.value) {
    router.push('/carrito')
    return
  }

  if (status.value === 'approved') {
    titulo.value = 'Pago aprobado'
    mensaje.value = 'Tu pago fue procesado exitosamente. Gracias por tu compra.'
    cart.clear()
    scheduleRedirectToPedidos()
    if (auth.token) {
      fetch(import.meta.env.VITE_API_URL + '/api/transacciones/', {
        headers: { 'Authorization': `Bearer ${auth.token}` }
      })
        .then(r => r.json())
        .then(data => { if (!data.error && data.transacciones?.length) transaccion.value = data.transacciones[0] })
        .catch(() => {})
    }
  }
  const socket = useSocket()
  if (auth.token) socket.connect(auth.token)

  socket.on('transaccion:actualizada', (data) => {
    if (data?.transaccion) {
      transaccion.value = data.transaccion
      const nuevoEstado = String(data.transaccion.estado || '').toUpperCase()
      if (nuevoEstado === 'APROBADA') {
        titulo.value = 'Pago aprobado'
        mensaje.value = 'Tu pago fue procesado exitosamente. Gracias por tu compra.'
        status.value = 'approved'
        cart.clear()
        scheduleRedirectToPedidos()
      } else if (nuevoEstado === 'RECHAZADA') {
        titulo.value = 'Pago rechazado'
        mensaje.value = 'Tu pago fue rechazado. Por favor intenta con otro metodo de pago.'
        status.value = 'rejected'
        notifyRejectedAndRedirect()
      }
    }
  })

  if (status.value === 'pending') {
    pollTransaccionesUntilResolved()
  }

  if (status.value === 'pending') {
    titulo.value = 'Pago pendiente'
    mensaje.value = 'Tu pago esta pendiente de confirmacion. Te notificaremos cuando sea procesado.'
  } else if (status.value === 'rejected' || status.value === 'failure') {
    titulo.value = 'Pago rechazado'
    mensaje.value = 'Tu pago fue rechazado. Por favor intenta con otro metodo de pago.'
    notifyRejectedAndRedirect()
  } else {
    titulo.value = 'Estado del pago'
    mensaje.value = `Payment ID: ${paymentId.value || 'N/A'} | Status: ${status.value || 'desconocido'}`
  }

  animKey.value = Date.now()
})

onBeforeUnmount(() => {
  stopPolling()
  if (redirectTimeoutId) clearTimeout(redirectTimeoutId)
})

function volverCarrito() {
  router.push('/carrito')
}

function reintentar() {
  router.push('/checkout')
}

function verPedidos() {
  router.push('/pedidos')
}
</script>

<template>
  <div class="page-container">
    <div class="pago-container" :key="animKey">
      <div class="status-icon" :class="statusClass"></div>

      <h2 class="animate-in">{{ titulo }}</h2>

      <div v-if="loading" class="spinner" style="margin: 2rem auto;"></div>

      <p class="animate-in delay-1" style="margin-top: 0.75rem; color: var(--gray-500); line-height: 1.6;">{{ mensaje }}</p>

      <div v-if="transaccion" class="transaccion-detalle animate-in delay-2">
        <div class="transaccion-row">
          <span class="transaccion-label">Transaccion</span>
          <span class="transaccion-value">#{{ transaccion.id?.substring(0, 8) }}</span>
        </div>
        <div class="transaccion-row">
          <span class="transaccion-label">Monto</span>
          <span class="transaccion-value">${{ Number(transaccion.total).toLocaleString() }}</span>
        </div>
        <div class="transaccion-row">
          <span class="transaccion-label">Estado</span>
          <span class="transaccion-value">{{ transaccion.estado }}</span>
        </div>
      </div>

      <div class="btn-group">
        <button v-if="status === 'approved'" @click="verPedidos" class="btn btn-primary btn-pill">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          Ver pedido
        </button>
        <button v-if="status === 'rejected' || status === 'failure'" @click="reintentar" class="btn btn-warning btn-pill">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          Reintentar pago
        </button>
        <button @click="volverCarrito" class="btn btn-ghost">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5m0 0 7-7m-7 7 7 7"/></svg>
          Volver al carrito
        </button>
      </div>
    </div>
  </div>
</template>
