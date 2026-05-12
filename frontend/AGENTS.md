# Frontend — Vite SPA

> Plain JavaScript SPA with no framework. Vite dev server, localStorage cart for guests, backend API sync for logged-in users.

## Quick Orientation

| What | Where | Notes |
|------|-------|-------|
| Entry | `index.html` | Loads `js/auth.js` + `js/main.js` |
| Styles | `css/styles.css` | Single CSS file, no preprocessors |
| Pages | `pages/` | 4 HTML pages: carrito, confirmacion, login, pago |
| Scripts | `js/` | 3 JS files: auth.js, carrito.js, main.js |

## Page Flow

```
index.html (product catalog + mini cart)
  ├── pages/login.html (login/register form)
  ├── pages/carrito.html (full cart view, quantity controls)
  ├── pages/pago.html (payment redirect + status)
  └── pages/confirmacion.html (payment success/retry)
```

## Authentication (`js/auth.js`)

- **No framework auth** — plain localStorage token management
- `isLoggedIn()` → checks `localStorage.getItem('token')`
- `getToken()` → returns JWT string or null
- `getUsuario()` → parses `localStorage.getItem('usuario')` JSON
- `logout()` → clears token + usuario from localStorage
- `renderAuthNav()` → injects login/logout UI into pages
- `getCarritoKey()` → returns `carrito_{userId}` if logged in, `carrito_guest` if not
- `handleAuthCallback()` / `procesarAuthCallback()` → processes auth redirect, handles user fusion

### Token Flow
1. User submits login form on `pages/login.html`
2. Frontend calls **auth service directly** (not through backend)
3. JWT stored in `localStorage.token`
4. All backend API calls include `Authorization: Bearer <token>` header
5. `verificarToken` validates token on backend side

## Cart Logic (`js/carrito.js`)

### Dual Storage Model
- **Guest**: Cart stored in `localStorage.carrito_guest` (array of `{producto_id, nombre, precio, cantidad}`)
- **Logged in**: Cart synced to backend via `/api/carrito` — localStorage only for display/optimistic updates

### Sync Behavior
- `addToCart()` → if logged in: `POST /api/carrito` (upsert) + update localStorage; if guest: localStorage only
- `updateQuantity()` → if logged in: `PATCH /api/carrito/:id`; if guest: localStorage only
- `deleteItem()` → if logged in: `DELETE /api/carrito/:id`; if guest: localStorage only
- `vaciarCarrito()` → if logged in: `DELETE /api/carrito` (all items); if guest: clear localStorage
- `procesarPago()` → if logged in: full backend checkout flow; if guest: redirect to login first

### Guest → User Fusion (`procesarAuthCallback`)
When guest logs in, frontend sends guest cart to `POST /api/carrito/fusionar` which merges quantities.

## Product Display (`js/main.js`)

- Fetches products from `PRODUCTOS_SERVICE_URL` via backend proxy or direct
- Renders product cards with "Add to cart" buttons
- On add: calls `addToCart()` from carrito.js, updates mini-cart display

## Guardrails ⚠️

- **No framework** — all DOM manipulation is vanilla JS, no React/Vue/Angular
- **No module bundling** — scripts loaded via `<script>` tags in HTML, not ES modules
- **localStorage dependency** — cart state relies on localStorage; don't replace with sessionStorage
- **Auth redirect** — auth service returns redirect URLs; don't change callback flow without updating auth.js
- **Cart key format** — `carrito_{userId}` or `carrito_guest` — don't create new key formats
- **Page navigation** — plain `<a href>` links between pages, no SPA router
- **CSS** — single file `css/styles.css`, no CSS-in-JS, no Tailwind, no preprocessors

## What NOT To Do

- ❌ Don't add a JS framework (React/Vue/etc) — project uses vanilla JS throughout
- ❌ Don't use ES module `import`/`export` in frontend JS — loaded via script tags
- ❌ Don't bypass the cart sync — always call backend API when logged in
- ❌ Don't store sensitive data in localStorage beyond what auth.js already stores (token + user JSON)
- ❌ Don't create new page-level HTML files without updating index.html navigation links
- ❌ Don't modify `getCarritoKey()` logic — it has a specific guest/user distinction
