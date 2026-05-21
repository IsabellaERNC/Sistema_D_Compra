<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useCartStore } from '../stores/cart'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const auth = useAuthStore()
const cart = useCartStore()
const { showToast } = useToast()
const CATALOGO_URL = import.meta.env.VITE_CATALOGO_URL

onMounted(() => {
  if (auth.isLoggedIn) {
    cart.fetchBackendCart()
  } else {
    cart.loadFromStorage()
  }

  try {
    const raw = localStorage.getItem('toast_after_redirect')
    if (raw) {
      localStorage.removeItem('toast_after_redirect')
      const parsed = JSON.parse(raw)
      if (parsed?.message) {
        showToast(parsed.message, parsed.type || 'info', 5000)
      }
    }
  } catch (_) {
    // ignore invalid stored toast payload
  }
})

function goToCheckout() {
  router.push('/checkout')
}

function handleIncrease(index) {
  cart.increase(index)
  showToast('Producto agregado', 'success')
}

function handleRemove(index) {
  cart.remove(index)
  showToast('Producto eliminado', 'info')
}

function handleClear() {
  cart.clear()
  showToast('Carrito vaciado', 'success')
}
</script>

<template>
  <div class="page-container">
    <h1 class="page-title">Mi Carrito</h1>

    <div v-if="cart.isEmpty" class="empty-state">
      <div class="empty-state-icon">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
      </div>
      <h3>Tu carrito esta vacio</h3>
      <p>Navega al catalogo de productos para agregar articulos a tu carrito.</p>
    </div>

    <div v-else>
      <div v-for="(item, index) in cart.items" :key="item.id" class="cart-item">
        <div class="cart-item-info">
          <div class="cart-item-name">{{ item.nombre }}</div>
          <div class="cart-item-price">${{ Number(item.precio).toLocaleString() }} c/u</div>
        </div>
        <div class="qty-controls">
          <button @click="cart.decrease(index)" aria-label="Disminuir cantidad">-</button>
          <span class="qty-value">{{ item.cantidad }}</span>
          <button @click="handleIncrease(index)" aria-label="Aumentar cantidad">+</button>
        </div>
        <div class="cart-item-subtotal">${{ (item.precio * item.cantidad).toLocaleString() }}</div>
        <button @click="handleRemove(index)" class="cart-item-remove" title="Eliminar producto" aria-label="Eliminar producto">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>

      <div class="cart-summary">
        <div class="cart-summary-row">
          <span>Subtotal</span>
          <span>${{ cart.subtotal.toLocaleString() }}</span>
        </div>
        <div class="cart-summary-row">
          <span>Envio</span>
          <span>{{ cart.envio === 0 ? 'Gratis' : '$' + cart.envio.toLocaleString() }}</span>
        </div>
        <div class="cart-summary-row total">
          <span>Total</span>
          <span>${{ cart.total.toLocaleString() }}</span>
        </div>
      </div>

      <div class="cart-actions">
        <button @click="handleClear" class="btn btn-ghost btn-sm" title="Vaciar carrito">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          Vaciar
        </button>
        <a :href="`${CATALOGO_URL}/`" class="btn btn-outline" target="_blank" rel="noopener">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5m0 0 7-7m-7 7 7 7"/></svg>
          Seguir comprando
        </a>
        <button @click="goToCheckout" class="btn btn-success btn-lg btn-pill">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14m0 0-7-7m7 7-7 7"/></svg>
          Proceder al pago
        </button>
      </div>
    </div>
  </div>
</template>
