<script setup>
const props = defineProps({
  message: { type: String, required: true },
  type: { type: String, default: 'info' },
  duration: { type: Number, default: 3000 }
})

const emit = defineEmits(['close'])
</script>

<template>
  <div class="toast-container">
    <div
      class="toast"
      :class="`toast-${type}`"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <span class="toast-accent" aria-hidden="true"></span>
      <span class="toast-message">{{ message }}</span>
      <button class="toast-close" @click="emit('close')" aria-label="Cerrar">&times;</button>
    </div>
  </div>
</template>

<style scoped>
.toast-container {
  position: fixed;
  top: calc(var(--space-6, 24px) + 64px);
  right: var(--space-6, 24px);
  z-index: 1100;
  pointer-events: none;
}

.toast {
  pointer-events: auto;
  display: grid;
  grid-template-columns: 10px 1fr auto;
  align-items: center;
  gap: var(--space-3, 12px);
  width: min(520px, calc(100vw - 2 * var(--space-6, 24px)));
  padding: var(--space-4, 16px);
  border-radius: var(--radius-lg, 14px);
  border: 1px solid var(--gray-200, #E2E8F0);
  box-shadow: 0 12px 40px rgba(2, 6, 23, 0.18);
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.toast-accent {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: var(--color-info, #3B82F6);
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.16);
}

.toast-message {
  color: var(--gray-800, #1E293B);
  font-weight: 600;
  line-height: 1.4;
}

.toast-close {
  border: none;
  background: transparent;
  color: var(--gray-500, #64748B);
  width: 36px;
  height: 36px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 22px;
  line-height: 1;
}

.toast-close:hover {
  background: var(--gray-100, #F1F5F9);
  color: var(--gray-700, #334155);
}

.toast-success .toast-accent {
  background: var(--color-success, #10B981);
  box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.16);
}

.toast-warning .toast-accent {
  background: var(--color-warning, #F59E0B);
  box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.16);
}

.toast-error .toast-accent {
  background: var(--color-danger, #F43F5E);
  box-shadow: 0 0 0 4px rgba(244, 63, 94, 0.16);
}

.toast-info .toast-accent {
  background: var(--color-info, #3B82F6);
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.16);
}

@media (max-width: 520px) {
  .toast-container {
    left: var(--space-4, 16px);
    right: var(--space-4, 16px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .toast {
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
}
</style>
