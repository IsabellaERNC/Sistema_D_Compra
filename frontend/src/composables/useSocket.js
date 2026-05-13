import { io } from 'socket.io-client'
import { ref } from 'vue'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
let _socket = null
const connected = ref(false)
const _listeners = []

export function useSocket() {
  function connect(token) {
    if (_socket?.connected) return
    _socket = io(`${API_URL}/pedidos`, {
      auth: { token },
      transports: ['websocket', 'polling']
    })
    _socket.on('connect', () => { connected.value = true })
    _socket.on('disconnect', () => { connected.value = false })
    _socket.on('connect_error', (err) => console.error('[WS]', err.message))
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

  return { connected, connect, disconnect, on, off }
}
