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
const { get, patch } = useApi()
const { on, off } = useSocket()

const pedidos = ref([])
const cargando = ref(true)

onMounted(async () => {
  if (!auth.isLoggedIn || !auth.isVendedor) {
    router.push('/')
    return
  }
  await cargarPedidos()
  on('pedido:estado-cambiado', (data) => {
    if (!data?.pedido) return
    const idx = pedidos.value.findIndex(p => p.id === data.pedido.id)
    if (idx !== -1) {
      pedidos.value[idx] = { ...pedidos.value[idx], ...data.pedido }
    }
  })
})

async function cargarPedidos() {
  try {
    const data = await get('/api/vendedor/pedidos')
    pedidos.value = data.pedidos || []
  } catch (err) {
    console.error(err)
  } finally {
    cargando.value = false
  }
}

function estadoBadge(estado) {
  const map = {
    'Pendiente': 'badge-pending',
    'Procesando': 'badge-processing',
    'Enviado': 'badge-shipped',
    'Entregado': 'badge-delivered',
    'Cancelado': 'badge-cancelled'
  }
  return map[estado] || 'badge-pending'
}

function estadoOptions(estadoActual) {
  const flujos = {
    'Pendiente': ['Procesando', 'Cancelado'],
    'Procesando': ['Enviado', 'Cancelado'],
    'Enviado': ['Entregado'],
    'Entregado': [],
    'Cancelado': []
  }
  return flujos[estadoActual] || []
}

async function cambiarEstado(pedidoId, nuevoEstado) {
  if (!nuevoEstado) return
  try {
    await patch(`/api/vendedor/pedidos/${pedidoId}/estado`, { estado: nuevoEstado })
    await cargarPedidos()
    showToast('Estado actualizado correctamente', 'success')
  } catch (err) {
    showToast(err.message, 'error', 5000)
  }
}
</script>

<template>
  <div class="page-container">
    <h1 class="page-title">Panel de Vendedor</h1>

    <div v-if="cargando" class="loading">
      <div class="spinner" style="margin: 0 auto 1rem;"></div>
      <p>Cargando pedidos...</p>
    </div>

    <div v-else-if="pedidos.length === 0" class="empty-state">
      <div class="empty-state-icon">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
      </div>
      <h3>Sin pedidos</h3>
      <p>No tienes pedidos con productos tuyos.</p>
    </div>

    <div v-else>
      <div v-for="pedido in pedidos" :key="pedido.id" class="pedido-card">
        <div class="pedido-header">
          <div class="pedido-info">
            <div class="pedido-id">Pedido #{{ pedido.id.substring(0, 8) }}</div>
            <div class="pedido-fecha">{{ new Date(pedido.created_at).toLocaleString('es-CO') }}</div>
          </div>
          <div class="pedido-right">
            <span :class="['badge', estadoBadge(pedido.estado)]">{{ pedido.estado }}</span>
            <span class="pedido-total">${{ Number(pedido.monto_total).toLocaleString() }}</span>
          </div>
        </div>
        <div class="pedido-detalle">
          <div v-for="(item, idx) in (Array.isArray(pedido.items) ? pedido.items : JSON.parse(pedido.items || '[]'))" :key="idx" class="detalle-item">
            <span class="detalle-item-nombre">{{ item.nombre }}</span>
            <span class="detalle-item-cantidad">x{{ item.cantidad }}</span>
            <span class="detalle-item-precio">${{ Number(item.precio_unitario * item.cantidad).toLocaleString() }}</span>
          </div>
          <div v-if="estadoOptions(pedido.estado).length > 0" class="detalle-tracking">
            <h4>Cambiar estado</h4>
            <select @change="cambiarEstado(pedido.id, $event.target.value)" class="vendor-estado-select">
              <option value="">Seleccionar...</option>
              <option v-for="opt in estadoOptions(pedido.estado)" :key="opt" :value="opt">{{ opt }}</option>
            </select>
          </div>
          <p v-else class="no-transitions" style="margin-top: var(--space-3); color: var(--gray-500); font-size: 0.85rem;">No hay transiciones disponibles para este estado.</p>
        </div>
      </div>
    </div>
  </div>
</template>
