<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()
const nombre = ref('usuario')
const CATALOGO_URL = import.meta.env.VITE_CATALOGO_URL || 'http://localhost:4001'

onMounted(() => {
  if (auth.usuario) {
    nombre.value = auth.usuario.nombre
  }
})
</script>

<template>
  <div class="confirmacion-wrap">
    <div class="caja-confirmacion">
      <div class="confirmacion-icon">
        <svg viewBox="0 0 90 90" aria-hidden="true">
          <circle cx="45" cy="45" r="42" class="confirmacion-circle" />
          <polyline points="25,45 40,60 65,30" class="confirmacion-check" />
        </svg>
      </div>
      <h2>Compra confirmada!</h2>
      <p>
        Gracias, <span class="nombre-usuario">{{ nombre }}</span>.
        Tu pedido ha sido procesado exitosamente.
        Recibiras una notificacion cuando este listo.
      </p>
      <a :href="`${CATALOGO_URL}/`" class="btn btn-primary btn-lg btn-pill" style="margin-top: 1.75rem;" target="_blank" rel="noopener">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
        Seguir comprando
      </a>
    </div>
  </div>
</template>
