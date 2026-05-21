# AGENTS.md — Sistema D Compra

## Project Identity

**Sistema D Compra** is a purchase/sales platform with a monolith codebase and microservice-style Docker orchestration. A single backend codebase in `backend/` runs as different services depending on the Dockerfile you build from. All services share one PostgreSQL database, each isolated by schema convention.

The frontend is a Vue 3 SPA talking to a unified Nginx gateway that proxies to the 6 backend services.

## Architecture Overview

```
Browser ──> Nginx (:8080) ──> auth (:4000)
                           ──> catalogo (:4001)
                           ──> pagos (:4002)
                           ──> notificaciones (:4003)
                           ──> envios (:4004)
                           ──> carrito (:3000) ──> PostgreSQL (:5432)
                              └── Socket.IO (real-time events to frontend)
```

- **Monolith code in `backend/`** — all routes, services, and DB logic live in one repo. The `carrito` service is the main monolith (port 3000). Other Docker services (auth, catalogo, pagos, notificaciones, envios) are separate projects referenced by `build: ./auth`, `build: ./catalogo`, etc. in docker-compose.yml.
- **Nginx gateway** (`nginx.conf`) is the single entry point. Frontend calls `/api/auth/*`, `/api/catalogo/*`, `/api/pagos/*`, `/api/notificaciones/*`, `/api/envios/*`, `/api/carrito/*`. Nginx strips `/api/` prefix when proxying.
- **Socket.IO** on the carrito service (port 3000) pushes real-time events (order status, payment confirmations) to the Vue frontend.
- **PostgreSQL** is shared across all services. No cross-schema foreign keys — logical references only (e.g. `usuario_id` in carrito references auth's user table without a real FK).

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Backend runtime | Node.js 18 (Alpine in Docker) | `"type": "commonjs"` in package.json |
| Backend framework | Express 4 | Factory pattern for route modules |
| Database driver | `pg` (node-postgres) | Managed pools from `config.js` |
| Auth | `jsonwebtoken` | Local JWT verify (DEV_MODE) or delegated to auth service |
| Real-time | `socket.io` + `socket.io-client` | Via carrito service port 3000 |
| Frontend framework | Vue 3 + Composition API + `<script setup>` | Vite 8 as build tool |
| State management | Pinia 3 | Composition API stores (`defineStore` with setup function) |
| Routing | Vue Router 4 | Lazy-loaded views, `createWebHistory` |
| Payment | MercadoPago SDK | Via pagos microservice |
| PDF generation | `pdfkit` | Invoice/receipt generation in pedidos route |
| Containerization | Docker Compose 3.8 | Nginx Alpine gateway + Node 18 Alpine services |
| Database | PostgreSQL 15 Alpine | Shared server, per-service schema convention |

## Directory Structure

```
/
├── AGENTS.md                     ← This file
├── .env.example                  ← Template for all env vars (copy to backend/.env)
├── .gitignore                    ← node_modules/, .env, *.log
├── docker-compose.yml            ← Orchestrates 6 services + nginx + postgres
├── nginx.conf                    ← Gateway reverse proxy config
│
├── backend/                      ← Carrito service (monolith codebase)
│   ├── .env                      ← Local dev env vars (gitignored)
│   ├── config.js                 ← Centralized config from env vars
│   ├── server.js                 ← Express app bootstrap + Socket.IO + DB pool init
│   ├── Dockerfile                ← node:18-alpine, port 3000
│   ├── package.json              ← "type": "commonjs"
│   ├── lib/
│   │   └── adapters.js           ← Unified re-exports of all service clients
│   ├── routes/                   ← Route factories (each exports a function)
│   │   ├── carrito.js            ← Cart CRUD
│   │   ├── checkout.js           ← Checkout flow + payment initiation
│   │   ├── direcciones.js        ← Address management
│   │   ├── eventos.js            ← Pending events queue / retry logic
│   │   ├── pedidos.js            ← Order listing + status transitions
│   │   ├── productos.js          ← Product queries via catalogo service
│   │   ├── transacciones.js      ← Transaction history
│   │   ├── vendedor.js           ← Vendor dashboard
│   │   ├── vendedorMiddleware.js ← Vendor role authorization
│   │   └── webhook.js            ← Payment webhook receiver (public endpoint)
│   ├── services/                 ← HTTP clients to other microservices
│   │   ├── authClient.js
│   │   ├── enviosClient.js
│   │   ├── notificacionesPedidosClient.js
│   │   ├── pagosClient.js
│   │   └── productosClient.js
│   ├── scripts/                  ← DB setup utilities
│   │   ├── create-db.js
│   │   └── run-schema.js
│   └── test/
  │   [test/ removed — mock file deleted, local testing not planned]
│
├── frontend/                     ← Vue 3 SPA
│   ├── .env                      ← VITE_API_URL for dev
│   ├── Dockerfile                ← node:18-alpine, vite --host 0.0.0.0
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js            ← @ alias to ./src, port 5173
│   ├── public/
│   │   └── css/
│   │       └── styles.css
│   └── src/
│       ├── main.js               ← App bootstrap (Pinia + Router + Vue)
│       ├── App.vue               ← Root component (Socket init, header, router-view)
│       ├── components/
│       │   ├── AppHeader.vue
│       │   ├── ConfirmDialog.vue
│       │   └── ToastNotification.vue
│       ├── composables/
│       │   ├── useApi.js         ← HTTP helper (get/post/patch/del with JWT)
│       │   ├── useSocket.js      ← Socket.IO client connection
│       │   └── useToast.js       ← Toast notification state
│       ├── stores/
│       │   ├── auth.js           ← Auth store (token, usuario, login/logout)
│       │   └── cart.js           ← Cart store (items, localStorage, Socket.IO sync)
│       ├── router/
│       │   └── index.js          ← Routes: /carrito, /checkout, /pago, /confirmacion, /pedidos, /vendedor, /direcciones
│       └── views/
│           ├── CartView.vue
│           ├── CheckoutView.vue
│           ├── ConfirmationView.vue
│           ├── DireccionesView.vue
│           ├── OrdersView.vue
│           ├── PaymentView.vue
│           └── VendorView.vue
│
└── database/
    ├── schema_completo.sql       ← Full carrito schema (tables, constraints, triggers)
    └── migrations/
        └── 006_normalizar_estados.sql  ← State normalization migration
```

## Global Conventions

### Variable Naming
- **camelCase** for all JavaScript identifiers (variables, functions, parameters).
- **UPPERCASE_SNAKE_CASE** for constants and SQL enum states (`ESTADOS_VALIDOS`, `'PENDIENTE'`).
- **kebab-case** for file names: `carrito.js`, `authClient.js`, `CartView.vue`.

### Route Factory Pattern (Backend)
Every route file in `backend/routes/` follows the same factory pattern:

```js
const express = require('express');

module.exports = (pool, verificarToken, io) => {
    const router = express.Router();

    router.get('/', verificarToken, async (req, res) => {
        try {
            const result = await pool.query('SELECT ...', [params]);
            return res.status(200).json({ data: result.rows });
        } catch (err) {
            console.error('[GET /ruta]', err);
            return res.status(500).json({ error: 'Mensaje descriptivo.' });
        }
    });

    return router;
};
```

### Error Handling
- **DO**: `return res.status(4xx/5xx).json({ error: 'Mensaje' })` — always return the response object.
- **DO**: Catch errors in every route handler with try/catch.
- **DO**: Log errors with `console.error('[METHOD /path]', err)` using a descriptive prefix.
- **DO NOT**: Throw strings, use generic 500 messages, or skip error returns.
- **DO NOT**: Use `next(err)` — this codebase does not use Express error middleware.

### File Naming
- Backend JS: `kebab-case.js` — `carrito.js`, `authClient.js`, `notificacionesPedidosClient.js`.
- Vue files: `PascalCase.vue` — `CartView.vue`, `AppHeader.vue`.
- SQL files: `snake_case.sql` — `schema_completo.sql`, `006_normalizar_estados.sql`.

### Commit Messages
- Prefix with domain: `[carrito]`, `[checkout]`, `[auth]`, `[docker]`, `[db]`.
- Reference bug IDs where applicable: `BUG-05`, `BUG-10`.

## Language / Stack Rules

### JavaScript — CommonJS Only
- **ALWAYS** use `require()` / `module.exports`. This is a CommonJS project (`"type": "commonjs"` in package.json).
- **NEVER** use `import/export` (ES modules). The backend does not support them.
- Frontend JS uses ES modules (`import/export`) via Vite's ESM handling — this is correct for the frontend.

### Environment Variables
- **ALWAYS** source from `process.env` via `config.js`.
- **NEVER** hardcode IPs, passwords, secrets, tokens, or local network addresses in source code.
- **NEVER** commit `.env` files (they are in `.gitignore`).
- **ALWAYS** update `.env.example` when adding new environment variables.

Template for config values:
```js
module.exports = {
  mySetting: process.env.MY_SETTING || 'default_value',
};
```

### PostgreSQL
- **ALWAYS** use parameterized queries with `$1, $2, ...` placeholders.
- **NEVER** use string interpolation for SQL values — SQL injection risk.
- **NEVER** use raw SQL concatenation for user input.
- **ALWAYS** use the managed pool from `server.js` (passed to route factories).
- **DO**: `pool.query('SELECT * FROM carrito WHERE usuario_id = $1', [usuarioId])`
- **DO NOT**: `` pool.query(`SELECT * FROM carrito WHERE usuario_id = ${usuarioId}`) ``

### Async/Await
- **ALWAYS** use `async/await` in route handlers and service functions.
- **ALWAYS** wrap `await` calls in try/catch blocks.
- **NEVER** use raw `.then()` / `.catch()` chains in route code.
- The route factory pattern already sets `async (req, res) => ...` — use it.

### JWT Authentication
- Two modes controlled by `DEV_MODE` env var (or auto-detected):
  - `DEV_MODE=true`: JWT verified locally with `jwt.verify()` using `config.jwtSecret`.
  - `DEV_MODE=false`: JWT delegated to the external auth microservice.
- Middleware function is `verificarToken`, created in `server.js` and passed to route factories.
- DO NOT reimplement auth in route files — use the `verificarToken` middleware.

### HTTP Service Clients (backend/services/)
- Built with native `fetch()` (Node.js 18+).
- Every client follows the same pattern:
  ```js
  const config = require('../config');
  const BASE_URL = config.someServiceUrl;

  async function request(endpoint, options = {}) { ... }

  async function someAction(param) {
    return request('/path', { method: 'POST', body: JSON.stringify({ ... }) });
  }

  module.exports = { someAction };
  ```
- Errors throw descriptive messages, never raw network errors.

### Vue 3 Frontend Patterns
- **DO**: Use `<script setup>` Composition API syntax.
- **DO**: Use Pinia with setup functions: `export const useXStore = defineStore('x', () => { ... })`.
- **DO**: Use the `@` alias for imports: `import Foo from '@/components/Foo.vue'`.
- **DO**: Lazy-load views via dynamic imports in router: `() => import('../views/X.vue')`.
- **DO**: Create composables for reusable logic: `useApi`, `useSocket`, `useToast`.
- **DO NOT**: Use Options API, Vuex, or class-based components.
- **DO NOT**: Use CommonJS in frontend code — frontend uses ES modules via Vite.

### Socket.IO
- Backend creates the Socket.IO server on the same HTTP server as Express (port 3000).
- Frontend connects via `useSocket` composable, passing the JWT token for authentication.
- Used for real-time: order status updates, payment confirmations, cart sync events.

## Environment Variables

Key environment variables. All are defined in `.env.example` and loaded via `config.js` (backend) or `import.meta.env` (frontend).

### Backend (`backend/.env`)

| Variable | Description | Default |
|---|---|---|
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_USER` | Database user | `postgres` |
| `DB_PASSWORD` | Database password | `1234` |
| `DB_NAME` | Database name | `sistema_d_compra` |
| `EXTERNAL_DB_HOST` | Fallback DB host (Docker) | (empty) |
| `EXTERNAL_DB_PORT` | Fallback DB port | `5432` |
| `EXTERNAL_DB_NAME` | Fallback DB name | `sistema_d_compra` |
| `EXTERNAL_DB_USER` | Fallback DB user | `postgres` |
| `EXTERNAL_DB_PASSWORD` | Fallback DB password | `1234` |
| `JWT_SECRET` | Secret for JWT signing/verification | — |
| `DEV_MODE` | `true` = local JWT verify, `false` = auth service | `true` |
| `AUTH_SERVICE_URL` | Auth microservice endpoint | `http://localhost:4000` |
| `AUTH_API_KEY` | API key for auth service (if needed) | — |
| `PRODUCTOS_SERVICE_URL` | Catalogo microservice endpoint | `http://localhost:4001` |
| `PAGOS_SERVICE_URL` | Pagos microservice endpoint | `http://localhost:4002` |
| `PAGOS_WEBHOOK_SECRET` | HMAC secret for webhook signature verification | — |
| `PAGOS_API_KEY` | API key for pagos service | — |
| `NOTIFICACIONES_SERVICE_URL` | Notificaciones microservice endpoint | `http://localhost:4003` |
| `ENVIOS_SERVICE_URL` | Envios microservice endpoint | `http://localhost:4004` |
| `TU_LOCAL_URL` | Frontend URL (CORS origin) | `http://localhost:5173` |
| `URL_PAGO_OK` | Redirect after successful payment | `http://localhost:5173/pages/confirmacion.html` |
| `URL_PAGO_ERROR` | Redirect after failed payment | `http://localhost:5173/pages/pago.html?error=1` |

### Frontend (`frontend/.env`)

| Variable | Description | Default |
|---|---|---|
| `VITE_API_URL` | Backend API base URL | `http://localhost:3000` |

Note: Frontend env vars MUST use the `VITE_` prefix for Vite to expose them to the client.

## Docker Rules

### docker-compose.yml Convention
- File is named `docker-compose.yml` (not `.dev` or `.prod`).
- Docker Compose version: `3.8`.
- Network: `internal` (all services communicate via DNS names, not IPs).
- Ports are mapped to host for local development.

### Service Naming
- Container names match service names: `container_name: auth`, `container_name: catalogo`.
- Service URLs in docker-compose use container names as DNS: `http://auth:4000`, `http://catalogo:4001`.
- Each service depends on `postgres` with `condition: service_healthy`.

### Dockerfiles
- Base image: `node:18-alpine` for all Node.js services.
- Pattern: `COPY package*.json ./` then `RUN npm install` (layered for cache), then `COPY . .`.
- Frontend Dockerfile: `CMD ["npx", "vite", "--host", "0.0.0.0"]` (must bind to all interfaces for Docker networking).
- Backend Dockerfile: `CMD ["node", "server.js"]`.

### How to Run
```bash
# Full stack with Docker
docker-compose up --build

# Or locally (without Docker)
# 1. Start PostgreSQL on localhost:5432
# 2. cd backend && npm install && npm run dev   (port 3000)
# 3. cd frontend && npm install && npm run dev  (port 5173)
# 4. Update .env as needed
```

## Available Skills

The following agent skills are available for this project. Load them with `skill(name="skill-name")` when the task matches their domain.

| Skill | When to use |
|---|---|
| `diagnose` | Debugging hard bugs, performance regressions, or unexpected behavior. Follow the reproduce-minimise-hypothesise-instrument-fix loop. |
| `nodejs-backend-patterns` | Building or refactoring Express routes, middleware, auth, or API design. Sets middleware patterns, validation, structured logging, async safety. |
| `vertical-slice-architecture` | Organizing new features by use-case/feature rather than by technical layer. Each slice owns its route, validation, service calls, and DB queries. |
| `hexagonal-architecture` | Extracting domain logic from Express routes. Ports & Adapters with dependency inversion — useful when a route grows beyond CRUD. |
| `full-output-enforcement` | Any task requiring exhaustive output. Prevents truncation, bans placeholder patterns (`// ...`, `// rest of code`). |
| `vercel-react-best-practices` | Reviewing or optimizing frontend performance (bundle size, rendering, data fetching). |
| `vue` | Writing Vue 3 SFCs, using Composition API, script setup, defineProps, watchers, transitions. |
| `design-taste-frontend` | UI/UX design decisions — component architecture, CSS, layout, responsive design, visual consistency. |
| `ui-ux-pro-max` | Frontend UI/UX design with 50+ styles, color palettes, font pairings, responsive patterns. |
| `grill-me` | Stress-testing a plan or design before implementing. Use when the approach is unclear or has risky tradeoffs. |

## Common Pitfalls / Known Issues

1. **Cross-schema references**: There are no real foreign keys between schemas. `usuario_id` in carrito tables is an integer referencing auth's user table logically only. Joins between services happen at the application layer via HTTP clients.

2. **DEV_MODE auto-detection**: The server tries the local DB first. If it fails, it falls back to the external DB and forces `DEV_MODE=false`. This is runtime behavior — be aware when debugging auth issues.

3. **BUG references in code**: Several files contain inline `BUG-NN` comments (BUG-01, BUG-03, BUG-05, BUG-06, BUG-09, BUG-10). These mark known issues or corrections. Do not remove them — they document intentional fixes.

4. **Webhook endpoint is public**: `POST /api/carrito/pago-confirmado` (in `webhook.js`) does NOT use `verificarToken`. It validates via HMAC signature instead. Do not add token auth to this route.

5. **Socket.IO and token auth**: The Socket.IO connection authenticates via JWT token passed during handshake. If the token is invalid or expired, the connection is rejected silently.

6. **Vite host binding**: When running in Docker, Vite must use `--host 0.0.0.0`. For local development, it defaults to `localhost:5173`. The frontend Dockerfile sets this explicitly.

7. **Environment-specific URLs**: `URL_PAGO_OK` and `URL_PAGO_ERROR` are used as redirect URLs by MercadoPago. They must be publicly accessible URLs in production, not localhost.

## CHANGELOG

### 2026-05-18 — Production Hardening (9 tasks, all verified)

| # | File | Change | Why |
|---|------|--------|-----|
| 1 | `backend/config.js` | Added `port: process.env.PORT \|\| '3000'` + `validateEnv()` function (checks 8 required vars) | Dynamic port config, startup validation |
| 2 | `backend/lib/adapters.js` | Added `createServiceClient(baseUrl, defaultOptions)` factory returning `{ request, requestWithRetry }` (AbortController, 5s timeout, 1 retry) | Shared HTTP client with timeout/retry, 0 new deps |
| 3 | `backend/services/authClient.js` | Refactored to use `createServiceClient` — `login()`, `register()`, `validateToken()` all use `requestWithRetry` | Resilience: auth calls now have timeout+retry |
| 4 | `backend/services/pagosClient.js` | Refactored to use `createServiceClient` — `crearCheckout()`, `solicitarReembolso()` use `requestWithRetry`; `verificarSignature()` preserved as pure crypto | Resilience: pagos calls now have timeout+retry |
| 5 | `frontend/src/composables/useApi.js` | Added `fetchWithTimeout(url, options, timeout=10000)` (AbortController) + `withRetry(fn, retries=1, delay=1000)` | Frontend resilience: no hanging requests |
| 6 | `nginx.conf` | Added 6 security headers (`X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `HSTS`, `Referrer-Policy`, `Permissions-Policy`) + rate limiting (`limit_req_zone 30r/s`, `burst=50`) | Security hardening + abuse protection |
| 7 | `docker-compose.yml` | Added `restart: always` + `mem_limit` + `cpus` to all 8 services (nginx: 256m/0.25, postgres: 512m, Node services: 512m/0.5) | Resource governance, self-healing |
| 8 | `.env.example` | Fixed `DB_NAME=sistema_d_compra` (was `sistema_compras`) + removed dangling test route logs from `server.js` | Correct config, cleanup |
| 9 | `backend/server.js` | `const PORT = config.port` (no hardcode), `GET /health` endpoint (`{ status, timestamp, uptime }`), graceful shutdown (`gracefulShutdown()` closes HTTP server + DB pool, SIGTERM + SIGINT handlers, 10s force timeout) | Observability, zero-downtime deploys |

### What Did NOT Change
- Business logic in any endpoint — ZERO changes to route handlers
- `productosClient.js`, `enviosClient.js`, `notificacionesPedidosClient.js` — untouched (already had timeout/retry)
- Vue views, stores, router — no changes
- No new npm dependencies added (used native AbortController)
- Route factory pattern preserved

## Microservice URL Migration Guide

When you have the real URLs/addresses of the 5 external microservices (auth, catalogo, pagos, notificaciones, envios), update these locations:

### 1. `backend/config.js` — Service URL defaults
```js
// CURRENT (placeholders — localhost dev defaults)
authServiceUrl:      process.env.AUTH_SERVICE_URL          || 'http://localhost:4000',
productosServiceUrl: process.env.PRODUCTOS_SERVICE_URL     || 'http://localhost:4001',
pagosServiceUrl:     process.env.PAGOS_SERVICE_URL         || 'http://localhost:4002',
notificacionesServiceUrl: process.env.NOTIFICACIONES_SERVICE_URL || 'http://localhost:4003',
enviosServiceUrl:    process.env.ENVIOS_SERVICE_URL        || 'http://localhost:4004',

// CHANGE TO — production URLs (via env vars only, keep defaults for local dev)
// Set in production .env: AUTH_SERVICE_URL=https://auth.prod.com/api
```

### 2. Production `.env` file (NOT `.env.example`)
Create `backend/.env.production` (or set in Docker/CI env):
```ini
AUTH_SERVICE_URL=https://auth.mi-dominio.com
PRODUCTOS_SERVICE_URL=https://catalogo.mi-dominio.com
PAGOS_SERVICE_URL=https://pagos.mi-dominio.com
NOTIFICACIONES_SERVICE_URL=https://notificaciones.mi-dominio.com
ENVIOS_SERVICE_URL=https://envios.mi-dominio.com

# Also update redirect URLs
URL_PAGO_OK=https://mi-frontend.com/confirmacion?status=ok
URL_PAGO_ERROR=https://mi-frontend.com/confirmacion?status=error
TU_LOCAL_URL=https://mi-frontend.com
```

### 3. `backend/config.js` — DB config for production
Remove `EXTERNAL_DB_*` fallback env vars if not needed. Set `DB_HOST` to production DB address.

### 4. `backend/server.js` — Remove dual DB fallback
The current `startServer()` has dual DB try/fallback logic. In production with a known DB URL, remove the fallback:
```js
// CHANGE FROM:
let pool;
try { pool = await tryPool(config.db); }
catch (e) { pool = await tryPool(config.externalDb); }

// CHANGE TO:
const pool = await tryPool(config.db);  // single pool, no fallback
```

### 5. `nginx.conf` — Upstream URLs
If Nginx is used in production (recommended for SSL termination), update:
```nginx
upstream auth-service { server AUTH_REAL_URL:4000; }
upstream catalogo-service { server CATALOGO_REAL_URL:4001; }
# ... etc for all 6 services
```

### 6. `frontend/.env` — Frontend env vars
```ini
VITE_API_URL=https://api-backend.mi-dominio.com
VITE_AUTH_URL=https://auth.mi-dominio.com
VITE_CATALOGO_URL=https://catalogo.mi-dominio.com
```

### 7. Review `adapters.js` — baseUrl per service
`createServiceClient(baseUrl, defaultOptions)` reads from config.js by default, but if you hardcoded any baseUrl override, replace it with config values.
