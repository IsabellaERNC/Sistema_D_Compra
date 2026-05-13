<script setup>
import { computed, nextTick, onBeforeUnmount, watch } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: 'Confirmar' },
  message: { type: String, default: '' },
  confirmText: { type: String, default: 'Confirmar' },
  cancelText: { type: String, default: 'Cancelar' },
  destructive: { type: Boolean, default: false }
})

const emit = defineEmits(['update:open', 'confirm', 'cancel'])

const titleId = computed(() => `dlg_title_${Math.random().toString(36).slice(2)}`)
const descId = computed(() => `dlg_desc_${Math.random().toString(36).slice(2)}`)

function close() {
  emit('update:open', false)
  emit('cancel')
}

function onConfirm() {
  emit('confirm')
  emit('update:open', false)
}

function onKeydown(e) {
  if (e.key === 'Escape') close()
}

watch(() => props.open, async (isOpen) => {
  if (!isOpen) return
  await nextTick()
  const btn = document.querySelector('.confirm-dialog .btn-confirm')
  if (btn && typeof btn.focus === 'function') btn.focus()
})

watch(() => props.open, (isOpen) => {
  if (!isOpen) return
  document.addEventListener('keydown', onKeydown)
}, { immediate: true })

watch(() => props.open, (isOpen, wasOpen) => {
  if (!isOpen && wasOpen) {
    document.removeEventListener('keydown', onKeydown)
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="confirm-dialog" @click.self="close">
      <div
        class="dialog-panel"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        :aria-describedby="message ? descId : undefined"
      >
        <div class="dialog-header">
          <h3 :id="titleId" class="dialog-title">{{ title }}</h3>
        </div>
        <div v-if="message" class="dialog-body">
          <p :id="descId" class="dialog-message">{{ message }}</p>
        </div>
        <div class="dialog-actions">
          <button type="button" class="btn btn-ghost" @click="close">{{ cancelText }}</button>
          <button
            type="button"
            class="btn btn-confirm"
            :class="destructive ? 'btn-danger' : 'btn-primary'"
            @click="onConfirm"
          >
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.confirm-dialog {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: grid;
  place-items: center;
  padding: var(--space-6);
  z-index: 1000;
}

.dialog-panel {
  width: min(520px, 100%);
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-xl, 20px);
  box-shadow: 0 20px 60px rgba(2, 6, 23, 0.25);
  overflow: hidden;
}

.dialog-header {
  padding: var(--space-5) var(--space-6);
  border-bottom: 1px solid var(--gray-200);
}

.dialog-title {
  margin: 0;
  font-weight: 800;
}

.dialog-body {
  padding: var(--space-5) var(--space-6);
}

.dialog-message {
  margin: 0;
  color: var(--gray-600);
  line-height: 1.6;
}

.dialog-actions {
  padding: var(--space-4) var(--space-6);
  border-top: 1px solid var(--gray-200);
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
}

@media (prefers-reduced-motion: reduce) {
  .confirm-dialog {
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
}
</style>
