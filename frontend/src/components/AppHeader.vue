<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useCartStore } from '../stores/cart'

const auth = useAuthStore()
const cart = useCartStore()
const dropdownOpen = ref(false)
const navPerfilRef = ref(null)

const AUTH_URL = import.meta.env.VITE_AUTH_URL
const CATALOGO_URL = import.meta.env.VITE_CATALOGO_URL

function toggleDropdown() {
  dropdownOpen.value = !dropdownOpen.value
}

function closeDropdown() {
  dropdownOpen.value = false
}

function handleLogout() {
  auth.logout()
  dropdownOpen.value = false
}

function redirectToAuth() {
  const current = window.location.href
  window.location.href = `${AUTH_URL}/auth/login?redirect=${encodeURIComponent(current)}`
}

function onDocumentClick(e) {
  if (navPerfilRef.value && !navPerfilRef.value.contains(e.target)) {
    dropdownOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
})

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick)
})
</script>

<template>
  <header>
    <div class="header-logo">
      <RouterLink to="/">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:22px;height:22px">
          <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
        </svg>
        Carrito
      </RouterLink>
    </div>
    <div class="header-nav">
      <a :href="`${CATALOGO_URL}/`" class="nav-link" target="_blank" rel="noopener">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
        Catálogo
      </a>

      <div v-if="auth.isLoggedIn" ref="navPerfilRef" class="nav-perfil" :class="{ active: dropdownOpen }">
        <button class="btn-perfil" @click.stop="toggleDropdown">
          {{ auth.nombre }}
          <span class="flecha">▾</span>
        </button>
        <div class="dropdown">
          <p class="dropdown-email">{{ auth.usuario?.email || '' }}</p>
          <hr>
          <RouterLink to="/pedidos" class="dropdown-link" @click="closeDropdown">Mis Pedidos</RouterLink>
          <RouterLink to="/direcciones" class="dropdown-link" @click="closeDropdown">Mis Direcciones</RouterLink>
          <RouterLink v-if="auth.isVendedor" to="/vendedor" class="dropdown-link" @click="closeDropdown">Panel Vendedor</RouterLink>
          <hr>
          <button @click="handleLogout" class="btn-logout">Cerrar sesion</button>
        </div>
      </div>
      <button v-else class="btn-login" @click="redirectToAuth">
        Iniciar sesion
      </button>
    </div>
  </header>
</template>
