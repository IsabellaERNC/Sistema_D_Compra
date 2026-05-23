# AGENTS.md — Sistema D Compra

**Purchase/sales platform.** Single backend codebase (`backend/`) deployed to Cloud Run. Frontend is a Vue 3 SPA also on Cloud Run. Five external microservices (auth, catalogo, pagos, notificaciones, envios) are HTTP services on Cloud Run — this repo only contains the **carrito service** (port 3000).

## Architecture

```
Browser ─── Cloud Run ─── carrito (Express 3000) ─── Cloud SQL (PostgreSQL 15)
    │                └── Socket.IO /pedidos namespace
    └── External Microservices (via HTTP clients in backend/services/)
        ├── auth: JWT validation only (no local verify)
        ├── catalogo: product queries
        ├── pagos: MercadoPago integration
        ├── notificaciones: email/push
        └── envios: shipping
```

- **No Nginx or Docker Compose** — each service is an independent Cloud Run deployment. `.env.example` documents the Cloud Run / Cloud SQL config.
- **CORS**: multi-origin via `CORS_ORIGINS` env var.
- **Health check**: `GET /health` (no auth).

## Key Conventions

### Backend — Route Factory Pattern (MANDATORY)
Every file in `backend/routes/` exports a factory: `module.exports = (pool, verificarToken, ...deps) => { const router = express.Router(); ... return router; }`. Dependencies are positional (pool first, verificarToken second, then optional `io`, `productosClient`, etc.).

| Route | Extra deps |
|-------|-----------|
| `carrito.js` | `io`, `productosClient` |
| `checkout.js` | `io` |
| `direcciones.js` | — |
| `eventos.js` | — |
| `internal.js` | `config` (no verificarToken — uses X-Internal-Key header) |
| `pedidos.js` | `io` (imports pagosClient, notificacionesClient inline) |
| `productos.js` | `productosClient` |
| `transacciones.js` | `io` |
| `vendedor.js` | `io` |
| `webhook.js` | — (no verificarToken — HMAC-signed public endpoint) |

### Backend — Error Handling
- Always `return res.status(N).json({ error: 'msg' })` — never `next(err)`.
- Catch every handler with try/catch.
- Log with `console.error('[METHOD /path]', err)`.

### Backend — Service Clients (`services/`)
All use `createServiceClient(baseUrl, opts)` from `lib/adapters.js`. Returns `{ request, requestWithRetry }` with 5s timeout + 1 retry on network errors. Native `fetch()` — no axios.

### Backend — SQL Rules
- **Parameterized queries only** (`$1`, `$2`). Never string interpolation.
- Pool is passed to route factories — never create `new Pool()` in a handler.
- Transactions: `pool.connect()` → `client.query('BEGIN')` → commit/rollback → `client.release()` in `finally`.

### Database
- Canonical schema: `database/schema_consolidado.sql` (consolidates all migrations).
- `carrito` table lives in `carrito_ms` schema. Pool must set `searchPath: ['carrito_ms', 'public']`.
- Tables: `transacciones`, `carrito_ms.carrito`, `direcciones`, `pedidos`, `log_estados`, `eventos_pendientes`.
- `pedidos` and `transacciones` have `prevent_delete` triggers — use state transitions instead of DELETE.
- State check constraints (VARCHAR, not ENUM): `PENDIENTE, PROCESANDO, ENVIADO, ENTREGADO, CANCELADO` (pedidos) and `PENDIENTE, APROBADA, RECHAZADA, CANCELADA` (transacciones).

### Frontend (Vue 3)
- **Composition API + `<script setup>`** only. No Options API.
- **Pinia 3** with setup function stores (`defineStore('x', () => { ... })`).
- Routes defined in `frontend/src/router/index.js` — 7 lazy-loaded views, `createWebHistory`.
- Auth checks done **inside views** (`onMounted` → `router.push`), not via navigation guards.
- Socket.IO: connects to `/pedidos` namespace on auth token change (`useSocket` composable).
- HTTP: `useApi` composable with `fetchWithTimeout` (10s) + `withRetry` (1 retry, 1s delay).
- CSS: custom properties in `public/css/styles.css` — no preprocessor, no utility framework.
- Backend API base: `VITE_API_URL` env var.

## Developer Commands

```bash
# Backend (requires PostgreSQL running)
cd backend && npm install && npm run dev    # nodemon on port 3000

# Frontend
cd frontend && npm install && npm run dev   # Vite on port 5173

# Docker (Cloud Run style — build only, no compose)
docker build -t carrito backend/
docker build -t frontend frontend/
```

Copy `.env.example` to `backend/.env` and set values before running.

## Auth
- **Always delegated** to external auth service via `authClient.validateToken()` — no local JWT verify in server.js.
- `verificarToken` middleware calls `authClient.validateToken()` on every request.
- `webhook.js` is the only public endpoint — validates via HMAC signature (`pagosClient.verificarSignature()`).

## Internal Routes (Cloud Scheduler)
- `POST /internal/ttl-carritos` — deletes carts inactive >30 days (schedule: every 24h)
- `POST /internal/retry-eventos` — retries pending/failed events with exponential backoff (schedule: every 2min)
- Both protected by `X-Internal-Key` header matching `INTERNAL_API_KEY` env var.

## Rate Limiters (defined in server.js)
| Limiter | Rate | Scope |
|---------|------|-------|
| General | 100 req/min | All `/api/` routes |
| Checkout | 5 req/10min | `/api/checkout/iniciar` |
| Auth | 20 req/15min | For auth microservice (apply at nginx level) |

## Known Gotchas
- `carrito_ms` schema: queries referencing the `carrito` table must use `search_path` or fully qualify as `carrito_ms.carrito`.
- `pedidos.js`, `checkout.js`, `webhook.js`, `vendedor.js` import some service clients inline (not via factory params). `webhook.js` calls deducirStock, notificarPedidoCreado, crearEnvio directly.
- Socket.IO Redis adapter is optional — only activates if `REDIS_HOST` is set.
- `validateEnv()` warns on missing vars in dev, throws in production.
- BUG comments (BUG-01 through BUG-10) mark intentional fixes — do not remove.
