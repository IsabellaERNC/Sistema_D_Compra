<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useToast } from '@/composables/useToast'
import { useApi } from '@/composables/useApi'
import { useSocket } from '@/composables/useSocket'

const router = useRouter()
const auth = useAuthStore()
const { showToast } = useToast()
const { get } = useApi()
const { on, off } = useSocket()

const pedidos = ref([])
const cargando = ref(true)
const expandido = ref({})

function actualizarPedidoLocal(data) {
  if (!data?.pedido) return
  const idx = pedidos.value.findIndex(p => p.id === data.pedido.id)
  if (idx !== -1) {
    pedidos.value[idx] = { ...pedidos.value[idx], ...data.pedido }
  } else {
    pedidos.value.unshift(data.pedido)
  }
}

onMounted(async () => {
  if (!auth.isLoggedIn) {
    window.location.href = import.meta.env.VITE_AUTH_URL + '/auth/login?redirect=' + encodeURIComponent(window.location.origin + '/pedidos')
    return
  }
  await cargarPedidos()
  on('pedido:estado-cambiado', actualizarPedidoLocal)
  on('pedido:creado', actualizarPedidoLocal)
})

async function cargarPedidos() {
  try {
    const data = await get('/api/pedidos')
    pedidos.value = data.pedidos || []
  } catch (err) {
    console.error(err)
    showToast('Error al cargar los pedidos', 'error')
  } finally {
    cargando.value = false
  }
}

function togglePedido(id) {
  expandido.value[id] = !expandido.value[id]
}

function estadoBadgeClass(estado) {
  const map = {
    'Pendiente': 'badge-pending',
    'Procesando': 'badge-processing',
    'Enviado': 'badge-shipped',
    'Entregado': 'badge-delivered',
    'Cancelado': 'badge-cancelled'
  }
  return map[estado] || 'badge-pending'
}

function formatearFecha(fecha) {
  return new Date(fecha).toLocaleString('es-CO')
}
</script>

<template>
  <div class="page-container">
    <h1 class="page-title">Mis Pedidos</h1>

    <div v-if="cargando" class="loading">
      <div class="spinner" style="margin: 0 auto 1rem;"></div>
      <p>Cargando pedidos...</p>
    </div>

    <div v-else-if="pedidos.length === 0" class="empty-state">
      <div class="empty-state-icon">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
      </div>
      <h3>Aún no tienes pedidos</h3>
      <p>Explora nuestro catálogo y realiza tu primera compra.</p>
    </div>

    <div v-else>
      <div v-for="pedido in pedidos" :key="pedido.id" class="pedido-card">
        <div class="pedido-header" @click="togglePedido(pedido.id)">
          <div class="pedido-info">
            <div class="pedido-id">Pedido #{{ pedido.id.substring(0, 8) }}</div>
            <div class="pedido-fecha">{{ formatearFecha(pedido.created_at) }}</div>
          </div>
          <div class="pedido-right">
            <span :class="['badge', estadoBadgeClass(pedido.estado)]">{{ pedido.estado }}</span>
            <span class="pedido-total">${{ Number(pedido.monto_total).toLocaleString() }}</span>
            <span class="expand-icon" :class="{ 'is-expanded': expandido[pedido.id] }"></span>
          </div>
        </div>
        <div v-if="expandido[pedido.id]" class="pedido-detalle">
          <div class="detalle-items">
            <h4>Items</h4>
            <div v-for="(item, idx) in (Array.isArray(pedido.items) ? pedido.items : JSON.parse(pedido.items || '[]'))" :key="idx" class="detalle-item">
              <span class="detalle-item-nombre">{{ item.nombre }}</span>
              <span class="detalle-item-cantidad">x{{ item.cantidad }}</span>
              <span class="detalle-item-precio">${{ Number(item.precio_unitario * item.cantidad).toLocaleString() }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
