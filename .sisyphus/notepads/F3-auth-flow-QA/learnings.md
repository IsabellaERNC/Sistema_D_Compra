# QA Learnings - F3 Auth Flow Verification

**Date:** 2026-05-08

## Summary
All 8 QA scenarios PASS. The external auth flow is correctly structured across all components.

## Detailed Results

### Scenario 1: Backend syntax check — ✅ PASS
- All 8 backend JS files pass `node --check`:
  - `server.js`, `config.js`, `checkout.js`, `transacciones.js`, `webhook.js`, `authClient.js`, `pagosClient.js`, `productosClient.js`
- No syntax errors found

### Scenario 2: Auth routes commented out — ✅ PASS
- `backend/server.js` lines 63-80: `/api/auth/register` wrapped in `/* */`
- `backend/server.js` lines 82-99: `/api/auth/login` wrapped in `/* */`
- `backend/server.js` lines 101-105: `/api/auth/me` wrapped in `/* */`
- These routes will correctly return 404 since Express never sees them

### Scenario 3: Auth guard in carrito.html — ✅ PASS
- `frontend/pages/carrito.html` lines 144-154: `intentarPagar()` function
- Checks `carrito.length === 0` first
- Then checks `!isLoggedIn()` — redirects to `http://localhost:4000/auth/login?redirect=...`
- If logged in, calls `irAPagar()` → `procesarPagoConBackend()`
- The auth guard logic is correct for the external auth service pattern

### Scenario 4: Callback handler in login.html — ✅ PASS
- `frontend/pages/login.html` lines 57-74: IIFE handler
- Parses `?token=` from URL via `URLSearchParams`
- Saves token to `localStorage`
- Calls `renderAuthNav()` if available
- Redirects to `../index.html`
- Shows error message if no token received

### Scenario 5: main.js callback — ✅ PASS
- `frontend/js/main.js` lines 7-14: IIFE handler
- Parses `?token=` from URL
- Saves to `localStorage`
- Cleans URL with `window.history.replaceState()`
- This is a secondary/backup handler for the index page

### Scenario 6: No modal code references — ✅ PASS
- grep for `abrirModal|cerrarModal|handleLogin|handleRegister|onLoginExitoso` returns zero matches
- All legacy modal auth code has been fully removed from `frontend/`

### Scenario 7: All API_URL complete URLs — ✅ PASS
- `frontend/js/auth.js` line 1: `API_URL = 'http://localhost:3000'` — complete
- `frontend/js/auth.js` line 76: `AUTH_LOGIN_URL = 'http://localhost:4000/auth/login?redirect='` — complete  
- `frontend/js/main.js` line 4: `API_URL = 'http://localhost:3000'` — complete (trailing `//localhost:3000';` is a comment, works fine with ASI)
- All URLs are complete and well-formed

### Scenario 8: auth.js exports preserved — ✅ PASS
All 5 required functions present:
- `isLoggedIn()` ✓
- `getToken()` ✓
- `getUsuario()` ✓
- `logout()` ✓
- `renderAuthNav()` ✓
- Additional utilities: `toggleDropdown()`, `getCarritoKey()`, `guardarToken()`, `redirectToAuth()`

## Auth Flow Diagram (verified)
```
guest → checkout → !isLoggedIn() → redirect to localhost:4000/auth/login
    → auth service handles login
    → redirects back with ?token=xxx
    → login.html or main.js parses token
    → saves to localStorage
    → redirects to index.html
    → renderAuthNav() shows logged-in state
```
