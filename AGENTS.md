# AGENTS.md — Sistema D Compra

## Project Identity

**Sistema D Compra** is a purchase/sales platform deployed on **Cloud Run** (Google Cloud). A single backend codebase in `backend/` runs as an Express monolith on Cloud Run. All services share one PostgreSQL database (Cloud SQL), each isolated by schema convention.

The frontend is a Vue 3 SPA deployed on Cloud Run, talking directly to the backend API.

## Architecture Overview

```
Browser ──> Cloud Run Frontend (:5173) ──> Cloud Run Backend (:3000) ──> Cloud SQL PostgreSQL (:5432)
                                              └── Socket.IO (real-time events to frontend)
```

- **Monolith code in `backend/`** — all routes, services, and DB logic live in one repo. The `carrito` service is the monolith running on port 3000.
- **External microservices** (auth, catalogo, pagos, notificaciones, envios) are consumed via HTTP service clients in `backend/services/`. They are independent deployments expected to have their own URLs configured via env vars.
- **Socket.IO** on the carrito service pushes real-time events (order status, payment confirmations) to the Vue frontend.
- **PostgreSQL** (Cloud SQL) is shared across all services. No cross-schema foreign keys — logical references only (e.g. `usuario_id` in carrito references auth's user table without a real FK).

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Backend runtime | Node.js 18 | `"type": "commonjs"` in package.json |
| Backend framework | Express 4 | Factory pattern for route modules |
| Database driver | `pg` (node-postgres) | Managed pools from `config.js` |
| Auth | `jsonwebtoken` | Local JWT verify (DEV_MODE) or delegated to auth service |
| Real-time | `socket.io` + `socket.io-client` | Via carrito service port 3000 |
| Frontend framework | Vue 3 + Composition API + `<script setup>` | Vite 8 as build tool |
| State management | Pinia 3 | Composition API stores (`defineStore` with setup function) |
| Routing | Vue Router 4 | Lazy-loaded views, `createWebHistory` |
| Payment | MercadoPago SDK | Via pagos microservice |
| PDF generation | `pdfkit` | Invoice/receipt generation in pedidos route |
| Deployment | Cloud Run | Google Cloud serverless containers |
| Database | Cloud SQL (PostgreSQL 15) | Managed PostgreSQL |

## Directory Structure

```
/
├── AGENTS.md                     ← This file
├── .env.example                  ← Template for all env vars (copy to backend/.env)
├── .gitignore                    ← node_modules/, .env, *.log
│
├── backend/                      ← Carrito service (monolith codebase)
│   ├── .env                      ← Local dev env vars (gitignored)
│   ├── config.js                 ← Centralized config from env vars
│   ├── server.js                 ← Express app bootstrap + Socket.IO + DB pool init
│   ├── Dockerfile                ← node:18-alpine, port 3000 (for Cloud Run build)
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
│   ├── services/                 ← HTTP clients to external microservices
│   │   ├── authClient.js
│   │   ├── enviosClient.js
│   │   ├── notificacionesPedidosClient.js
│   │   ├── pagosClient.js
│   │   └── productosClient.js
│   ├── scripts/                  ← DB setup utilities
│   │   ├── create-db.js
│   │   └── run-schema.js
│   └── test/
│
├── frontend/                     ← Vue 3 SPA
│   ├── .env                      ← VITE_API_URL for dev
│   ├── Dockerfile                ← node:18-alpine, vite --host 0.0.0.0 (for Cloud Run build)
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
- Prefix with domain: `[carrito]`, `[checkout]`, `[auth]`, `[db]`.
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
- **NEVER** use raw `.then()` / `.catch()` chains in route handlers.
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

### Backend (`backend/.env`)

| Variable | Description | Default |
|---|---|---|
| `PORT` | HTTP port for Cloud Run | `3000` |
| `DB_HOST` | Cloud SQL host (public IP or private connection) | — |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_USER` | Database user | — |
| `DB_PASSWORD` | Database password | — |
| `DB_NAME` | Database name | `sistema_d_compra` |
| `JWT_SECRET` | Secret for JWT signing/verification | — |
| `DEV_MODE` | `true` = local JWT verify, `false` = auth service | `true` |
| `AUTH_SERVICE_URL` | Auth microservice endpoint | — |
| `AUTH_API_KEY` | API key for auth service | — |
| `PRODUCTOS_SERVICE_URL` | Catalogo microservice endpoint | — |
| `PAGOS_SERVICE_URL` | Pagos microservice endpoint | — |
| `PAGOS_WEBHOOK_SECRET` | HMAC secret for webhook signature verification | — |
| `PAGOS_API_KEY` | API key for pagos service | — |
| `NOTIFICACIONES_SERVICE_URL` | Notificaciones microservice endpoint | — |
| `ENVIOS_SERVICE_URL` | Envios microservice endpoint | — |
| `TU_LOCAL_URL` | Frontend URL (CORS origin) | — |
| `URL_PAGO_OK` | Redirect after successful payment | — |
| `URL_PAGO_ERROR` | Redirect after failed payment | — |

### Frontend (`frontend/.env`)

| Variable | Description | Default |
|---|---|---|
| `VITE_API_URL` | Backend API base URL | `http://localhost:3000` |

Note: Frontend env vars MUST use the `VITE_` prefix for Vite to expose them to the client.

## Deployment (Cloud Run)

### Backend Dockerfile
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

### Frontend Dockerfile
```dockerfile
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### How to Deploy
```bash
# Build and deploy backend
gcloud builds submit --tag gcr.io/PROJECT_ID/carrito-backend
gcloud run deploy carrito-backend \
  --image gcr.io/PROJECT_ID/carrito-backend \
  --set-env-vars "DB_HOST=...","DB_USER=...","DB_PASSWORD=...","DB_NAME=sistema_d_compra","JWT_SECRET=..." \
  --add-cloudsql-instances PROJECT_ID:REGION:INSTANCE \
  --allow-unauthenticated

# Build and deploy frontend
gcloud builds submit --tag gcr.io/PROJECT_ID/carrito-frontend
gcloud run deploy carrito-frontend \
  --image gcr.io/PROJECT_ID/carrito-frontend \
  --set-env-vars "VITE_API_URL=https://carrito-backend-xxxxx-uc.a.run.app" \
  --allow-unauthenticated
```

## Common Pitfalls / Known Issues

1. **Cross-schema references**: There are no real foreign keys between schemas. `usuario_id` in carrito tables is an integer referencing auth's user table logically only. Joins between services happen at the application layer via HTTP clients.

2. **DEV_MODE auto-detection**: The server tries the local DB first. If it fails, it falls back to the external DB and forces `DEV_MODE=false`. This is runtime behavior — be aware when debugging auth issues.

3. **BUG references in code**: Several files contain inline `BUG-NN` comments (BUG-01, BUG-03, BUG-05, BUG-06, BUG-09, BUG-10). These mark known issues or corrections. Do not remove them — they document intentional fixes.

4. **Webhook endpoint is public**: `POST /api/carrito/pago-confirmado` (in `webhook.js`) does NOT use `verificarToken`. It validates via HMAC signature instead. Do not add token auth to this route.

5. **Socket.IO and token auth**: The Socket.IO connection authenticates via JWT token passed during handshake. If the token is invalid or expired, the connection is rejected silently.

6. **Environment-specific URLs**: `URL_PAGO_OK` and `URL_PAGO_ERROR` are used as redirect URLs by MercadoPago. They must be publicly accessible URLs in production, not localhost.

## Microservice URL Configuration

When you have the real URLs of the 5 external microservices (auth, catalogo, pagos, notificaciones, envios), set these env vars in Cloud Run:

```ini
AUTH_SERVICE_URL=https://auth.mi-dominio.com
PRODUCTOS_SERVICE_URL=https://catalogo.mi-dominio.com
PAGOS_SERVICE_URL=https://pagos.mi-dominio.com
NOTIFICACIONES_SERVICE_URL=https://notificaciones.mi-dominio.com
ENVIOS_SERVICE_URL=https://envios.mi-dominio.com

# Redirect URLs for MercadoPago
URL_PAGO_OK=https://mi-frontend.com/confirmacion
URL_PAGO_ERROR=https://mi-frontend.com/error
TU_LOCAL_URL=https://mi-frontend.com
```

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

### 2026-05-20 — Cloud Run Migration
- Removed `docker-compose.yml`, `nginx.conf`
- Cleaned `config.js`: removed `externalDb` fallback block
- Rewrote AGENTS.md: Docker orchestration → Cloud Run deployment
- Removed all local dev / Docker Compose references
- Backend and frontend Dockerfiles preserved for Cloud Run builds
