import { io } from 'socket.io-client'
import { ref } from 'vue'

const API_URL = import.meta.env.VITE_API_URL
let _socket = null
const connected = ref(false)
const reconnecting = ref(false)
const _listeners = []

export function useSocket() {
  function connect(token) {
    if (_socket?.connected) return
    _socket = io(`${API_URL}/pedidos`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.5,
      timeout: 10000
    })
    _socket.on('connect', () => {
      connected.value = true
      reconnecting.value = false
    })
    _socket.on('disconnect', (reason) => {
      connected.value = false
      if (reason === 'io server disconnect') {
        // Server explicitly disconnected, don't reconnect
        _socket = null
      }
    })
    _socket.on('connect_error', (err) => {
      console.error('[WS] Error:', err.message)
    })
    _socket.on('reconnect_attempt', () => {
      reconnecting.value = true
    })
    _socket.on('reconnect', () => {
      reconnecting.value = false
      connected.value = true
    })
    for (const { event, fn } of _listeners) {
      _socket.on(event, fn)
    }
  }

  function disconnect() {
    if (_socket) {
      _socket.disconnect()
      _socket = null
      connected.value = false
    }
  }

  function on(event, callback) {
    if (_socket) _socket.on(event, callback)
    else _listeners.push({ event, fn: callback })
  }

  function off(event, callback) {
    if (_socket) _socket.off(event, callback)
  }

  return { connected, reconnecting, connect, disconnect, on, off }
}
