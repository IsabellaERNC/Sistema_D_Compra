import { ref } from 'vue'

const toastState = ref(null)
let timer = null

export function useToast() {
  function showToast(message, type = 'info', duration = 3000) {
    if (timer) clearTimeout(timer)
    toastState.value = { visible: true, message, type, duration }
    timer = setTimeout(() => {
      hideToast()
    }, duration)
  }

  function hideToast() {
    if (timer) clearTimeout(timer)
    timer = null
    toastState.value = null
  }

  return { toastState, showToast, hideToast }
}
