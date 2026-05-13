# Sistema_D_Compra — Project Guide

> Shopping cart microservice: Express backend + Vite frontend, PostgreSQL DB, external auth/productos/pagos services.

## Quick Orientation

| What | Where | Notes |
|------|-------|-------|
| Backend entry | `backend/server.js` | Express on port 3000 |
| Frontend entry | `frontend/index.html` | Vite dev server, loads `js/auth.js` + `js/main.js` |
| DB schema | `database/schema_completo.sql` | Complete database schema (replaces migrations 000-009) |
| Config | `backend/config.js` | All env vars in one place |
| Routes | `backend/routes/*.js` | Factory pattern: `(pool, verificarToken) => router` |
| External clients | `backend/services/*.js` | HTTP wrappers: auth, productos, pagos |

## Architecture

```
┌─────────────┐   ┌──────────────┐   ┌─────────────────┐
│  Vite SPA   │──▶│  Express API │──▶│   PostgreSQL DB  │
│ (frontend/) │   │ (backend/)   │   │ (carrito,        │
│             │   │              │   │  transacciones)  │
└─────────────┘   └──────┬───────┘   └─────────────────┘
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
        Auth Svc   Productos Svc  Pagos Svc
       (external)   (external)  (MercadoPago)
```

- **Backend** is a **consumer** of three external microservices — it delegates auth, product catalog, and payments.
- **Frontend** is a thin SPA that calls the backend API; auth tokens come from the external auth service.
- **Webhook** endpoint (`/api/webhook`) receives payment confirmations from the pagos service asynchronously.

## How to Run

```bash
# Backend
cd backend
npm install
npm run dev          # nodemon on port 3000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev          # Vite dev server

# Database — run migration manually
psql -U postgres -d sistema_d_compra -f database/schema_completo.sql
```

### Required Environment Variables

See `backend/config.js` for the full list. Key vars:

| Variable | Purpose | Default |
|----------|---------|---------|
| `AUTH_SERVICE_URL` | External auth microservice base URL | `http://localhost:4000` |
| `PRODUCTOS_SERVICE_URL` | External productos service base URL | `http://localhost:4001` |
| `PAGOS_SERVICE_URL` | External pagos/MercadoPago service base URL | `http://localhost:4002` |
| `PAGOS_WEBHOOK_SECRET` | HMAC secret for webhook signature verification | — |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | PostgreSQL connection | `localhost:5432`, `postgres`, `sistema_d_compra` |
| `TU_LOCAL_URL` | Frontend URL for payment redirect | `http://localhost:5173` |

## Key Flows

### Cart Lifecycle
1. **Guest** → items stored in localStorage (`carrito_guest`)
2. **Login** → `POST /api/carrito/fusionar` merges guest cart into user cart (preserves existing items)
3. **Checkout** → `POST /api/checkout/iniciar` creates transacción, redirects to payment
4. **Webhook** → payment service confirms → carrito cleared

### Auth Flow
1. Frontend calls **external auth service** directly for login/register
2. Backend `verificarToken` middleware validates JWT via auth service (`authClient.validateToken`)
3. Token attached as `Authorization: Bearer <jwt>` header
4. `req.usuario` populated by middleware with `{ id, nombre, email }`

### Payment Flow
1. `POST /api/checkout/iniciar` → creates transacción (PENDIENTE) → calls pagos service → returns MP checkout URL
2. User pays on MercadoPago
3. Payment service sends webhook to `POST /api/webhook/pago-confirmado`
4. Webhook verifies HMAC signature → updates transacción → clears carrito

## Cross-Cutting Conventions

- **CommonJS** throughout backend (`require`/`module.exports`) — no ESM in backend
- **No TypeScript** — plain JavaScript only
- **No tests** — no test infrastructure (no jest, no vitest, no test scripts)
- **No linter/formatter** — no ESLint, no Prettier configured
- **Factory pattern for routes** — every route file exports `(pool, verificarToken) => router`, never a bare router
- **Service clients return data** — `authClient`, `productosClient`, `pagosClient` make HTTP calls and return parsed JSON; errors thrown as-is
- **Frontend uses plain fetch** — no Axios, no SWR, no React Query

## Guardrails ⚠️

- **Never break the factory pattern** — route files MUST export `(pool, verificarToken) => router`
- **Never hardcode external service URLs** — use `config.js` env vars
- **Never skip `verificarToken`** on auth-required routes
- **Webhook endpoint has NO auth** by design — it verifies via HMAC signature
- **Frontend `carrito_guest`** is localStorage-only until login
- **`fusionar` adds quantities** — if user already has an item, guest quantity is ADDED to existing
- **Transacción estados**: `PENDIENTE`, `APROBADA`, `RECHAZADA` — don't invent new states without DB migration

## What NOT To Do

- ❌ Don't add TypeScript — project is JS-only, no tsconfig
- ❌ Don't use `import`/`export` syntax in backend — it's CommonJS
- ❌ Don't bypass `verificarToken` middleware for authenticated endpoints
- ❌ Don't call external services directly from routes — go through `services/*.js` clients
- ❌ Don't store cart state in frontend-only during checkout — always sync to backend first
- ❌ Don't modify transacción states outside the defined enum

> Shopping cart microservice: Express backend + Vite frontend, PostgreSQL DB, external auth/productos/pagos services.

## Quick Orientation

| What | Where | Notes |
|------|-------|-------|
| Backend entry | `backend/server.js` | Express on port 3000 |
| Frontend entry | `frontend/index.html` | Vite dev server, loads `js/auth.js` + `js/main.js` |
| DB schema | `database/schema_completo.sql` | Complete database schema (replaces migrations 000-009) |
| Config | `backend/config.js` | All env vars in one place |
| Routes | `backend/routes/*.js` | Factory pattern: `(pool, verificarToken) => router` |
| External clients | `backend/services/*.js` | HTTP wrappers: auth, productos, pagos |

## Architecture

```
┌─────────────┐   ┌──────────────┐   ┌─────────────────┐
│  Vite SPA   │──▶│  Express API │──▶│   PostgreSQL DB  │
│ (frontend/) │   │ (backend/)   │   │ (carrito,        │
│             │   │              │   │  transacciones)  │
└─────────────┘   └──────┬───────┘   └─────────────────┘
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
        Auth Svc   Productos Svc  Pagos Svc
       (external)   (external)  (MercadoPago)
```

- **Backend** is a **consumer** of three external microservices — it delegates auth, product catalog, and payments.
- **Frontend** is a thin SPA that calls the backend API; auth tokens come from the external auth service.
- **Webhook** endpoint (`/api/webhook`) receives payment confirmations from the pagos service asynchronously.

## How to Run

```bash
# Backend
cd backend
npm install
npm run dev          # nodemon on port 3000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev          # Vite dev server

# Database — run migration manually
psql -U postgres -d sistema_d_compra -f database/schema_completo.sql
```

### Required Environment Variables

See `backend/config.js` for the full list. Key vars:

| Variable | Purpose | Default |
|----------|---------|---------|
| `AUTH_SERVICE_URL` | External auth microservice base URL | `http://localhost:4000` |
| `PRODUCTOS_SERVICE_URL` | External productos service base URL | `http://localhost:4001` |
| `PAGOS_SERVICE_URL` | External pagos/MercadoPago service base URL | `http://localhost:4002` |
| `PAGOS_WEBHOOK_SECRET` | HMAC secret for webhook signature verification | — |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | PostgreSQL connection | `localhost:5432`, `postgres`, `sistema_d_compra` |
| `TU_LOCAL_URL` | Frontend URL for payment redirect | `http://localhost:5173` |

## Key Flows

### Cart Lifecycle
1. **Guest** → items stored in localStorage (`carrito_guest`)
2. **Login** → `POST /api/carrito/fusionar` merges guest cart into user cart (preserves existing items)
3. **Checkout** → `POST /api/checkout/iniciar` creates transacción, redirects to payment
4. **Webhook** → payment service confirms → carrito cleared

### Auth Flow
1. Frontend calls **external auth service** directly for login/register
2. Backend `verificarToken` middleware validates JWT via auth service (`authClient.validateToken`)
3. Token attached as `Authorization: Bearer <jwt>` header
4. `req.usuario` populated by middleware with `{ id, nombre, email }`

### Payment Flow
1. `POST /api/checkout/iniciar` → creates transacción (PENDIENTE) → calls pagos service → returns MP checkout URL
2. User pays on MercadoPago
3. Payment service sends webhook to `POST /api/webhook/pago-confirmado`
4. Webhook verifies HMAC signature → updates transacción → clears carrito

## Cross-Cutting Conventions

- **CommonJS** throughout backend (`require`/`module.exports`) — no ESM in backend
- **No TypeScript** — plain JavaScript only
- **No tests** — no test infrastructure (no jest, no vitest, no test scripts)
- **No linter/formatter** — no ESLint, no Prettier configured
- **Factory pattern for routes** — every route file exports `(pool, verificarToken) => router`, never a bare router
- **Service clients return data** — `authClient`, `productosClient`, `pagosClient` make HTTP calls and return parsed JSON; errors thrown as-is
- **Frontend uses plain fetch** — no Axios, no SWR, no React Query

## Guardrails ⚠️

- **Never break the factory pattern** — route files MUST export `(pool, verificarToken) => router`
- **Never hardcode external service URLs** — use `config.js` env vars
- **Never skip `verificarToken`** on auth-required routes
- **Webhook endpoint has NO auth** by design — it verifies via HMAC signature
- **Frontend `carrito_guest`** is localStorage-only until login
- **`fusionar` adds quantities** — if user already has an item, guest quantity is ADDED to existing
- **Transacción estados**: `PENDIENTE`, `APROBADA`, `RECHAZADA` — don't invent new states without DB migration

## What NOT To Do

- ❌ Don't add TypeScript — project is JS-only, no tsconfig
- ❌ Don't use `import`/`export` syntax in backend — it's CommonJS
- ❌ Don't bypass `verificarToken` middleware for authenticated endpoints
- ❌ Don't call external services directly from routes — go through `services/*.js` clients
- ❌ Don't store cart state in frontend-only during checkout — always sync to backend first
- ❌ Don't modify transacción states outside the defined enum
