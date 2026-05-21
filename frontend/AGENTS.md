# AGENTS.md - Sistema D Compra Frontend

This file documents the architecture, patterns, and conventions for the frontend application. Read it before making any changes. If you don't know something, search or ask.

---

## 1. Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Vue 3.5 | Composition API only |
| Script style | `<script setup>` | All .vue files, no Options API |
| Language | Plain JavaScript | No TypeScript detected anywhere |
| Build | Vite 8 | with `@vitejs/plugin-vue` 6 |
| State | Pinia 3 | Setup function syntax |
| Router | Vue Router 4 | Lazy-loaded routes |
| Real-time | Socket.IO client 4 | `/pedidos` namespace |
| CSS | Scoped `<style scoped>` + global design system | CSS custom properties, no preprocessor |
| Port | 5173 (dev) | Configured in `vite.config.js` |
| Path alias | `@` -> `./src` | Used in imports via `@/composables/useApi` |

### `package.json` scripts

```json
"dev": "vite"
"build": "vite build"
"preview": "vite preview"
```

### Environment variables

Defined in `.env` at project root:

```
VITE_API_URL=http://localhost:3000
VITE_AUTH_URL=http://localhost:4000
VITE_CATALOGO_URL=http://localhost:4001
```

---

## 2. Project Structure

```
frontend/
├── public/
│   └── css/
│       └── styles.css          # Global design system (CSS custom properties)
├── src/
│   ├── assets/                 # Static assets
│   ├── components/             # Shared components
│   │   ├── AppHeader.vue       # Navigation header + user dropdown
│   │   ├── ConfirmDialog.vue   # Confirm/alert dialog (Teleport to body)
│   │   └── ToastNotification.vue # Toast notification display
│   ├── composables/            # Reusable composition functions
│   │   ├── useApi.js           # HTTP client with auth
│   │   ├── useSocket.js        # Socket.IO client singleton
│   │   └── useToast.js         # Toast notification state
│   ├── router/
│   │   └── index.js            # Route definitions (7 routes)
│   ├── stores/
│   │   ├── auth.js             # Auth state (JWT, user, token decode)
│   │   └── cart.js             # Cart state (items, sync, real-time)
│   ├── views/
│   │   ├── CartView.vue        # /carrito - Cart management
│   │   ├── CheckoutView.vue    # /checkout - Address + checkout flow
│   │   ├── ConfirmationView.vue # /confirmacion - Post-purchase success
│   │   ├── DireccionesView.vue # /direcciones - Address CRUD
│   │   ├── OrdersView.vue      # /pedidos - Customer order list
│   │   ├── PaymentView.vue     # /pago - Payment processing + polling
│   │   └── VendorView.vue      # /vendedor - Vendor order management
│   ├── App.vue                 # Root: header, router-view (fade), toast
│   └── main.js                 # Entry: createApp, Pinia, Router
├── index.html                  # HTML entry (links /css/styles.css)
├── vite.config.js              # Vite config with @ alias
├── .env                        # Environment variables
└── package.json
```

---

## 3. Component Pattern

### Template (MANDATORY)

```vue
<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useCartStore } from '../stores/cart'
import { useToast } from '@/composables/useToast'
import { useApi } from '@/composables/useApi'
import { useSocket } from '@/composables/useSocket'

const router = useRouter()
const auth = useAuthStore()
const cart = useCartStore()
const { showToast } = useToast()
const { get, post, patch, del } = useApi()
const { on, off } = useSocket()
</script>

<template>
  <div class="page-container">
    <!-- template content -->
  </div>
</template>

<style scoped>
/* scoped styles only */
</style>
```

### Rules

- **Always** use `<script setup>` - never Options API (`data()`, `methods: {}`, `computed: {}`)
- **Always** use `defineProps` / `defineEmits` for component interfaces
- **Always** scope styles with `<style scoped>`
- Use `ref()` for primitive values, `ref([])` / `ref(null)` for objects and arrays
- Use `computed()` for derived state
- Use `onMounted`, `onUnmounted`, `onBeforeUnmount` for lifecycle hooks
- Prefer `@/` alias for deep imports (e.g. `@/composables/useApi`), relative paths for siblings (e.g. `../stores/auth`)
- No TypeScript - no type annotations, no generics on `defineProps`

---

## 4. Store Pattern (Pinia)

All stores use the **setup function syntax** (arrow function):

```js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useMyStore = defineStore('myStore', () => {
  // State
  const items = ref([])

  // Getters
  const total = computed(() => items.value.length)

  // Actions
  function add(item) {
    items.value.push(item)
  }

  return { items, total, add }
})
```

### Auth Store (`stores/auth.js`)

- **State**: `token` (ref from localStorage), `usuario` (ref from localStorage, parsed JSON)
- **Getters**: `isLoggedIn`, `isVendedor`, `nombre` (first name only)
- **Actions**: `setToken(t)`, `setUsuario(u)`, `logout()`, `decodeTokenPayload(t)`, `initFromUrl()`
- **On init**: reads `token` and `usuario` from localStorage; if only token exists, auto-decodes JWT payload
- **Persistence**: `setToken` and `setUsuario` write to localStorage immediately; `logout` clears and reloads the page

### Cart Store (`stores/cart.js`)

- **Cross-store access**: imports `useAuthStore` to get user ID for per-user localStorage keys
- **Storage keys**: `carrito_${user.id}` for logged-in, `carrito_guest` for anonymous
- **State**: `items` (ref of array with `{id, nombre, precio, cantidad}`)
- **Getters**: `totalItems`, `subtotal`, `envio` (free over $500 COP), `total`, `isEmpty`
- **Actions**: `add`, `remove`, `increase`, `decrease`, `clear`, `loadFromStorage`, `fetchBackendCart`, `syncBackend`, `save`
- **Guest cart merge**: On first `syncBackend` call with a token, merges guest items via `POST /api/carrito/fusionar`
- **Socket integration**: Subscribes to `'carrito:actualizado'` event (via `useSocket()` `on`/`off`)
- **Cleanup**: `onUnmounted` calls `off` to remove socket listeners

### The cart store also uses raw `fetch()` calls (not `useApi`) for some operations. This is a known inconsistency. Prefer `useApi` when adding new API calls.

---

## 5. Routing

Defined in `router/index.js`:

```js
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/carrito' },
    { path: '/carrito',      name: 'cart',        component: () => import('../views/CartView.vue') },
    { path: '/checkout',     name: 'checkout',     component: () => import('../views/CheckoutView.vue') },
    { path: '/pago',         name: 'payment',      component: () => import('../views/PaymentView.vue') },
    { path: '/confirmacion', name: 'confirmation', component: () => import('../views/ConfirmationView.vue') },
    { path: '/pedidos',      name: 'orders',       component: () => import('../views/OrdersView.vue') },
    { path: '/vendedor',     name: 'vendor',       component: () => import('../views/VendorView.vue') },
    { path: '/direcciones',  name: 'addresses',    component: () => import('../views/DireccionesView.vue') }
  ]
})
```

### Patterns

- All views are **lazy-loaded** with dynamic imports
- History mode (`createWebHistory`) - no hash routing
- Auth guards are done **inside views** via `onMounted` check + `router.push`, not via navigation guards
- Route redirect to `/carrito` is the default

---

## 6. Composables

### `useApi.js` - HTTP Client

```js
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

get(endpoint)        -> GET request
post(endpoint, body) -> POST request with JSON body
patch(endpoint, body)-> PATCH request with JSON body
del(endpoint)        -> DELETE request
ApiError             -> Custom error class with .status and .data
fetchWithTimeout(url, options, timeout=10000) -> AbortController-based fetch with configurable timeout
withRetry(fn, retries=1, delay=1000)          -> Retry wrapper for network errors (1 retry after 1s)
```

- **Auth header**: Reads token from `localStorage.getItem('token')` on every call
- **Error handling**: Throws `ApiError` with `status` and `data` properties
- **Usage**: Destructure `{ get, post, patch, del, ApiError }` from `useApi()`

### `useSocket.js` - Socket.IO Client (Singleton)

```js
connected  -> ref (boolean) - connection status
connect(token) -> connects to `/pedidos` namespace with JWT auth
disconnect()   -> disconnects and nullifies socket
on(event, cb)  -> subscribe to event
off(event, cb) -> unsubscribe
```

- **Singleton**: Module-level `_socket` and `_listeners` array shared across all consumers
- **Late subscription**: If `on()` is called before `connect()`, the listener is queued in `_listeners` and attached on connection
- **Namespace**: Always connects to `/pedidos`
- **Transports**: `['websocket', 'polling']`
- **Events subscribed by views**:
  - `'pedido:estado-cambiado'` - OrdersView, VendorView
  - `'pedido:creado'` - OrdersView
  - `'direcciones:actualizadas'` - DireccionesView
  - `'carrito:actualizado'` - cart store

### `useToast.js` - Toast Notifications (Singleton)

```js
toastState -> ref({ visible, message, type, duration }) or null
showToast(message, type='info', duration=3000)
hideToast()
```

- **Singleton**: Module-level `toastState` ref shared everywhere
- **Types**: `'info'`, `'success'`, `'warning'`, `'error'`
- **Duration**: Default 3000ms, can be overridden (e.g. 5000ms for errors)
- **Usage**: `const { showToast } = useToast()`
- **Cross-page pattern**: CartView reads `toast_after_redirect` from localStorage to show toasts after navigation

---

## 7. API Communication

### All API calls go through `useApi` composable

```js
const { get, post, patch, del, ApiError } = useApi()
```

### Backend Services Architecture

```
Frontend (5173)  ->  Auth (4000)    - Login/register pages, redirects back
                 ->  Catalog (4001)  - Product browsing (opens in new tab)
                 ->  API (3000)      - All data operations (cart, checkout, orders, addresses)
```

### Error Handling Pattern

```js
try {
  const data = await get('/api/some-endpoint')
  // use data
} catch (err) {
  if (err instanceof ApiError) {
    showToast(err.message, 'error', 5000)
  } else {
    showToast('Error inesperado', 'error')
  }
}
```

### Endpoints

| Endpoint | Method | View/Store |
|----------|--------|------------|
| `/api/carrito` | GET, POST, DELETE | cart store |
| `/api/carrito/:id` | DELETE | cart store |
| `/api/carrito/fusionar` | POST | cart store |
| `/api/checkout/iniciar` | POST | CheckoutView |
| `/api/pedidos` | GET | OrdersView |
| `/api/direcciones` | GET, POST | DireccionesView, CheckoutView |
| `/api/direcciones/:id` | PATCH, DELETE | DireccionesView |
| `/api/vendedor/pedidos` | GET | VendorView |
| `/api/vendedor/pedidos/:id/estado` | PATCH | VendorView |
| `/api/transacciones/` | GET | PaymentView |

---

## 8. State Management Flow

### Auth Flow

1. User visits `AUTH_URL` (port 4000) to login/register
2. Backend redirects back to frontend with `?token=JWT` in URL
3. `auth.initFromUrl()` in `App.vue` extracts the token, stores it, cleans the URL
4. `watch(() => auth.token)` triggers `useSocket.connect(token)` for real-time
5. `auth.decodeTokenPayload()` extracts user info from JWT payload (base64 decode, no server verification)
6. `auth.logout()` clears localStorage and reloads the page
7. Views check `auth.isLoggedIn` in `onMounted` and redirect to auth if needed

### Cart Flow

1. **Guest**: Items stored in `carrito_guest` localStorage key
2. **Logged in**: Items stored in `carrito_${userId}` localStorage key
3. **On login**: Guest items merge with backend cart via `POST /api/carrito/fusionar`
4. **Every mutation**: `save()` writes to localStorage, then `syncBackend()` pushes to API (if logged in)
5. **Socket updates**: `'carrito:actualizado'` event updates items reactively

### Order Flow

1. User adds items to cart (CartView)
2. User selects address and confirms (CheckoutView) -> `POST /api/checkout/iniciar`
3. Backend returns `checkout_url`, browser redirects to payment gateway
4. Payment gateway redirects back to `/pago?tid=...` (PaymentView)
5. PaymentView polls `GET /api/transacciones/` every 2 seconds for status:
   - **APROBADA**: Cart clears, redirects to `/confirmacion` then `/pedidos`
   - **RECHAZADA**: Sets `toast_after_redirect` in localStorage, redirects to `/carrito`
6. ConfirmationView shows success message with link to catalog
7. OrdersView displays order list with real-time status updates

---

## 9. Socket.IO Integration

### Connection Lifecycle

```
auth.token changes -> connect(token) in App.vue watch
                  -> io(`${API_URL}/pedidos`, { auth: { token } })
                  -> socket joins room automatically via JWT payload
                  -> Views subscribe to events in onMounted
                  -> Views unsubscribe in onUnmounted (or via returned off callback)
auth.logout()     -> disconnect()
```

### Event-Driven Store Updates

Views use socket events to update local data without refetching:

```js
// In onMounted:
on('pedido:estado-cambiado', (data) => {
  if (!data?.pedido) return
  const idx = pedidos.value.findIndex(p => p.id === data.pedido.id)
  if (idx !== -1) {
    pedidos.value[idx] = { ...pedidos.value[idx], ...data.pedido }
  }
})
```

### Event Registry

| Event | Listened by | Payload |
|-------|-------------|---------|
| `pedido:estado-cambiado` | OrdersView, VendorView | `{ pedido: {...} }` |
| `pedido:creado` | OrdersView | `{ pedido: {...} }` |
| `direcciones:actualizadas` | DireccionesView | (none needed, triggers reload) |
| `carrito:actualizado` | cart store | (updates items) |

---

## 10. Styling Guidelines

### Design System

Located in `/public/css/styles.css`. Uses CSS custom properties with an Indigo + Glass aesthetic:

- **Fonts**: Inter (sans-serif), JetBrains Mono (monospace)
- **Primary**: Indigo-600 (#4F46E5)
- **Secondary**: Purple-600 (#7C3AED)
- **Success**: Emerald-500 (#10B981)
- **Warning**: Amber-500 (#F59E0B)
- **Danger**: Rose-500 (#F43F5E)
- **Info**: Blue-500 (#3B82F6)
- **Spacing**: 8pt scale (`--space-1` through `--space-16`)
- **Radii**: `--radius-sm` (6px) through `--radius-2xl` (24px), `--radius-full`
- **Shadows**: Layered shadow tokens (`--shadow-sm` through `--shadow-2xl`)

### Rules

- **Always** use `<style scoped>` - never global styles from components
- **Always** use CSS custom properties from the design system for colors, spacing, radii
- **Never** use inline styles (`style=""` attribute) for layout or styling (exception: inline SVG attributes)
- **No CSS preprocessors** - plain CSS only
- **Responsive**: Use CSS custom properties + media queries. No Tailwind or utility framework
- **Transitions**: The app uses `page-fade` CSS transition in `App.vue` - 250ms ease opacity
- **Spinner**: Uses `.spinner` class from design system for loading states

---

## 11. UI/UX Conventions

### Loading States

```html
<div v-if="cargando" class="loading">
  <div class="spinner"></div>
  <p>Cargando...</p>
</div>
```

### Empty States

```html
<div v-if="items.length === 0" class="empty-state">
  <div class="empty-state-icon">
    <svg><!-- icon --></svg>
  </div>
  <h3>Title</h3>
  <p>Description with action hint.</p>
</div>
```

### Error States

- API errors: `catch (err)` block -> `showToast(err.message, 'error', 5000)`
- Validation errors: `showToast('Completa los campos obligatorios', 'warning')`
- 409 conflicts (stock): Show detailed item-level error via `err.data.items_sin_stock`
- Network errors: Generic "Error inesperado" toast

### Toast Notifications

- Used for all user feedback (success, error, warning, info)
- Displayed via `ToastNotification` component, positioned top-right
- Controlled by singleton `useToast` composable

### Button Conventions

- `.btn` base class
- `.btn-primary` - Primary action (Indigo)
- `.btn-ghost` - Secondary/tertiary
- `.btn-danger` - Destructive action (Rose)
- `.btn-lg` - Large size
- `.btn-pill` - Fully rounded

### Confirm Dialog

- Use `ConfirmDialog` component for destructive actions
- Uses `Teleport to="body"` for proper layering
- Supports `destructive` prop to style confirm button as danger
- Emits `confirm`, `cancel`, and `update:open`

---

## 12. Import Alias Convention

Both relative and `@/` alias imports are used. The `@` alias points to `./src`.

```js
// RELATIVE - preferred for components/stores in same feature area
import { useAuthStore } from '../stores/auth'
import { useCartStore } from '../stores/cart'

// @/ ALIAS - preferred for composables and deep imports
import { useApi } from '@/composables/useApi'
import { useSocket } from '@/composables/useSocket'
import { useToast } from '@/composables/useToast'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
```

Be consistent. When adding new imports, match the existing pattern in the file you are editing.

---

## 13. What NOT To Do

### Forbidden

- **No inline styles** (`style=""`) for layout or design. Use scoped CSS classes. (Exception: inline SVG attributes on `<svg>` elements like `stroke-width`.)
- **No TypeScript**. This project uses plain JavaScript. Do not add `.ts` files or type annotations.
- **No Options API** (`data()`, `methods: {}`, `computed: {}` blocks). Always use `<script setup>`.
- **No direct DOM manipulation** via `document.querySelector` or `document.addEventListener` unless absolutely necessary (AppHeader does for click-outside dropdown; wrap in `onMounted`/`onUnmounted` cleanup).
- **No navigation guards** (`router.beforeEach`) for auth. Handle auth checks inside view `onMounted` with `router.push` / `window.location.href`.
- **No raw `fetch()` without error handling.** Prefer `useApi` which handles errors through `ApiError`. If raw fetch is necessary (cart store has a few), wrap in try/catch with `.catch(() => {})`.
- **No duplicate API calls** when Socket.IO provides real-time updates. Listen for events instead of polling.
- **No unused socket listeners.** Always call `off()` in `onUnmounted` or use the pattern shown in views.
- **No circular store imports.** A store can import another store (auth in cart is fine), but avoid two stores importing each other.
- **No modifying `index.html`** unless adding external resources. Entry point is managed through `main.js`.
- **No emoji in code or UI.** Use SVG icons from the design system or Feather-style inline SVGs.
- **No hardcoded URLs.** Use `import.meta.env.VITE_API_URL`, `VITE_AUTH_URL`, `VITE_CATALOGO_URL` with fallbacks.
- **Do not refactor the store structure** (auth/cart) without understanding the localStorage persistence contract. These stores depend on specific key names (`carrito_guest`, `carrito_{id}`, `token`, `usuario`).
- **Do not break the `initFromUrl` flow.** Auth depends on the `?token=` URL parameter pattern for SSO-style login.

### Cautions

- The cart store mixes `useApi` and raw `fetch()`. When adding new cart API calls, prefer `useApi` but match the existing pattern if the surrounding code uses fetch.
- `PaymentView.vue` uses raw `fetch()` for polling transactions. This is intentional (no error toast on poll failures). Do not replace with `useApi` without testing.
- `window.location.reload()` is used by `auth.logout()` to reset all state. Do not remove this without a complete state reset strategy.
- The `carrito` and `pedidos` stores use `localStorage` as source of truth with backend as sync target, not the other way around. Local mutations happen first, then sync.

---

## 14. Quick Reference

### Creating a new view

```vue
<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useToast } from '@/composables/useToast'
import { useApi } from '@/composables/useApi'

const router = useRouter()
const auth = useAuthStore()
const { showToast } = useToast()
const { get, post } = useApi()

const cargando = ref(true)
const data = ref([])

onMounted(async () => {
  if (!auth.isLoggedIn) {
    router.push('/carrito')
    return
  }
  try {
    const res = await get('/api/endpoint')
    data.value = res.items || []
  } catch (err) {
    showToast(err.message, 'error')
  } finally {
    cargando.value = false
  }
})
</script>

<template>
  <div class="page-container">
    <h1 class="page-title">Title</h1>
    <div v-if="cargando" class="loading">
      <div class="spinner"></div>
      <p>Cargando...</p>
    </div>
    <div v-else-if="data.length === 0" class="empty-state">
      <h3>Sin datos</h3>
      <p>No hay contenido disponible.</p>
    </div>
    <div v-else>
      <!-- content -->
    </div>
  </div>
</template>

<style scoped>
/* scoped styles using CSS custom properties */
</style>
```

### Creating a new composable

```js
import { ref } from 'vue'

export function useMyFeature() {
  const state = ref(null)
  function doSomething() { /* ... */ }
  return { state, doSomething }
}
```

### Creating a new store

```js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './auth'

export const useMyStore = defineStore('myStore', () => {
  const auth = useAuthStore()
  const items = ref([])
  const total = computed(() => items.value.length)
  function add(item) { items.value.push(item) }
  return { items, total, add }
})
```

### Adding a new route

```js
// In router/index.js:
{ path: '/nueva-ruta', name: 'newRoute', component: () => import('../views/NewView.vue') }
```

### Socket subscription pattern

```js
import { onMounted, onUnmounted } from 'vue'
import { useSocket } from '@/composables/useSocket'

const { on, off } = useSocket()
const handler = (data) => { /* update local state */ }

onMounted(() => {
  on('event:name', handler)
})

onUnmounted(() => {
  off('event:name', handler)
})
```

---

*Last updated: May 2026. Keep this file in sync when new patterns, stores, composables, or routes are added.*

---

## 15. Production Hardening (2026-05-18)

### `useApi.js` — Timeout and Retry

- **`fetchWithTimeout(url, options, timeout=10000)`**: Native `AbortController`-based timeout. Default 10s. Throws on timeout (caught by caller's `catch`).
- **`withRetry(fn, retries=1, delay=1000)`**: Wraps any async function. Retries once after 1s on network errors (AbortError, TypeError, NetworkError). Does NOT retry on 4xx/5xx responses.
- Uses zero new npm dependencies — purely native browser APIs.
- All existing `useApi` methods (`get`, `post`, `patch`, `del`) remain unchanged and do NOT automatically retry. Use `withRetry` explicitly when needed.
