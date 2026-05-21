<script setup>
import { watch } from 'vue'
import { RouterView } from 'vue-router'
import AppHeader from './components/AppHeader.vue'
import ToastNotification from './components/ToastNotification.vue'
import { useToast } from './composables/useToast'
import { useAuthStore } from './stores/auth'
import { useSocket } from './composables/useSocket'

const { toastState, hideToast } = useToast()
const auth = useAuthStore()
const { connect, disconnect } = useSocket()

watch(() => auth.token, (token) => {
  if (token) {
    connect(token)
  } else {
    disconnect()
  }
}, { immediate: true })
</script>

<template>
  <AppHeader />
  <main class="page-container">
    <transition name="page-fade" mode="out-in">
      <RouterView />
    </transition>
  </main>
  <ToastNotification
    v-if="toastState?.visible"
    :message="toastState.message"
    :type="toastState.type"
    :duration="toastState.duration"
    @close="hideToast"
  />
</template>

<style scoped>
.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity 250ms ease;
}

.page-fade-enter-from,
.page-fade-leave-to {
  opacity: 0;
}
</style>
