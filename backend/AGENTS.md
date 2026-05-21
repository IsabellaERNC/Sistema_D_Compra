# AGENTS.md — Backend (Carrito Service)

## Project Identity

This is the **carrito service** of Sistema D Compra, an Express-based monolith running on port 3000 on Cloud Run. It handles cart management, checkout flow, payments, orders, addresses, events, and vendor operations. All other microservices (auth, catalogo, pagos, notificaciones, envios) are external HTTP services consumed via service clients in `backend/services/`.

## Technology Stack

| Component | Technology | Notes |
|---|---|---|
| Runtime | Node.js 18+ | `"type": "commonjs"` in package.json |
| Framework | Express 4 | `require('express')`, `express.Router()` |
| Module system | CommonJS | `"type": "commonjs"` in package.json |
| Database driver | `pg` (node-postgres) | `Pool` from config.js |
| Auth | `jsonwebtoken` | Local verify in DEV_MODE, delegated to auth service otherwise |
| Real-time | `socket.io` v4 | `/pedidos` namespace |
| PDF generation | `pdfkit` | Invoice/factura generation |
| HTTP client | Native `fetch()` | Node.js 18+ built-in (no axios) |
| Dev tooling | `nodemon` | `npm run dev` |

---

## 1. Architecture Overview

```
                    +----------------------+
                    |   Express Server     |
                    |   (server.js:3000)   |
                    +------+-----+--------+
                           |     |
                    +------+     +------+
                    v                   v
            +---------------+   +------------------+
            |  REST Routes  |   |  Socket.IO       |
            | (9 modules)   |   |  /pedidos ns     |
            +------+--------+   +------------------+
                   |
          +--------+--------+
          v                  v
   +--------------+   +--------------+
   |  PostgreSQL  |   | HTTP Clients |
   |  (pg Pool)   |   | (5 services) |
   +--------------+   +--------------+
```

The backend is a single-process Express application started from `server.js`. All routes are organized by domain in `routes/` and follow an identical factory pattern. External microservices are accessed through HTTP service clients in `services/`. Real-time events flow through Socket.IO on the `/pedidos` namespace.

---

## 2. Route Factory Pattern (MANDATORY)

Every route file in `backend/routes/` MUST follow this exact factory pattern:

```js
const express = require('express');

module.exports = (pool, verificarToken, ...additionalDeps) => {
    const router = express.Router();

    router.get('/', verificarToken, async (req, res) => {
        try {
            // ... handler logic
            return res.status(200).json({ data: result.rows });
        } catch (err) {
            console.error('[GET /ruta]', err);
            return res.status(500).json({ error: 'Mensaje descriptivo.' });
        }
    });

    return router;
};
```

### Rules

- **ALWAYS** use `module.exports = (pool, verificarToken, ...) => { ... }`.
- **ALWAYS** destructure dependencies at module scope (pool comes first, verificarToken second, then optional io/service clients).
- **ALWAYS** return `router` at the end.
- The factory signature is flexible: some routes receive `io`, some receive `productosClient`, some receive both. The pattern is positional (not named args).

### Current Route Factories and Their Dependencies

| Route File | pool | verificarToken | io | productosClient | pagosClient | Additional |
|---|---|---|---|---|---|---|
| `carrito.js` | Yes | Yes | Yes | Yes | No | — |
| `checkout.js` | Yes | Yes | Yes | Yes | Yes | `crypto` for MP |
| `direcciones.js` | Yes | Yes | No | No | No | — |
| `eventos.js` | Yes | No | No | No | No | — |
| `pedidos.js` | Yes | Yes | Yes | No | Yes | `notificacionesClient`, `enviosClient`, `pagosClient`, `productosClient` |
| `productos.js` | Yes | Yes | No | Yes | No | — |
| `transacciones.js` | Yes | Yes (dev mode: No) | No | No | No | — |
| `vendedor.js` | Yes | Yes | Yes | No | No | `notificacionesClient` |
| `vendedorMiddleware.js` | No | No | No | No | No | — |
| `webhook.js` | Yes | No (HMAC) | Yes | No | Yes | `crypto` for signature |

---

## 3. Server Initialization Flow

`server.js` is the entry point. It does the following in order:

1. Loads `config.js` (reads all env vars with defaults).
2. Connects to PostgreSQL using the managed pool from config.
3. Creates the HTTP server and Socket.IO instance.
4. Registers the `verificarToken` middleware (closure over `effectiveDevMode`).
5. Mounts all 9 route modules.
6. Starts the TTL worker (clears inactive carts >30 days) and the retry worker (reprocesses `eventos_pendientes`).
- The `webhook` route does NOT receive `verificarToken` (it is a public endpoint with HMAC signature validation).
- Some routes import additional service clients at the top of their file (e.g., `pedidos.js` imports `pagosClient`, `notificacionesClient`).
- The `adapters.js` file in `lib/` provides a unified re-export point for all 5 service clients.

### DEV_MODE Auto-Detection

```js
async function startServer() {
    let pool;
    try {
        pool = await tryPool(config.db);         // try local DB first
    } catch (err) {
        pool = await tryPool(config.externalDb); // fallback to external DB
        effectiveDevMode = false;                 // force auth service mode
    }
    // ... register routes with pool
}
```

> This dual DB fallback is for local development only. In Cloud Run, a single pool connects directly to Cloud SQL.

### New Features (Production Hardening — May 2026)

- **config.port**: Port is now configurable via `process.env.PORT` (default `'3000'`). No more hardcoded port.
- **validateEnv()**: Called at startup in `server.js`. Checks 8 required vars (`JWT_SECRET`, `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `PAGOS_WEBHOOK_SECRET`, `AUTH_API_KEY`, `PAGOS_API_KEY`). Warns in dev, throws in production.
- **createServiceClient factory** in `lib/adapters.js`: All 5 HTTP service clients now use `requestWithRetry` with AbortController timeout (5s) and 1 automatic retry on network errors.
- **Graceful shutdown**: `SIGTERM` and `SIGINT` handlers close the HTTP server (stop accepting connections) and drain the DB pool. Force-exits after 10s if cleanup stalls.
- **`/health` endpoint**: Returns `{ status, timestamp, uptime }`. Used by Cloud Run health checks.
- **NGINX removed**: All Docker Compose and Nginx gateway infrastructure has been removed. The backend exposes port 3000 directly to Cloud Run.

---

## 4. Route Details

### 4.1 Carrito (`/api/carrito/carrito`)
- **GET `/`** — List items in the active cart for the authenticated user. Returns `{ data: rows }`.
- **POST `/`** — Add item to cart. Validates stock via `productosClient`. If item exists, increments quantity. Returns `{ data: newItem }`.
- **PATCH `/:itemId`** — Update quantity or `notas` of a cart item.
- **DELETE `/:itemId`** — Remove item from cart.
- **DELETE `/`** — Clear the entire cart.
- **Socket.IO**: On cart mutations, emits `cart:updated` to the user's room.

### 4.2 Checkout (`/api/carrito/checkout`)
- **POST `/`** — Rate-limited (1 request per user per 5s). Validates cart ownership, stock, shipping address. Creates pedido + transaccion, calls `pagosClient.crearCheckout()` for MercadoPago preference, returns payment URL.
- **States**: `'PENDIENTE'`, `'RECHAZADA'`, `'COMPLETADA'`.

### 4.3 Direcciones (`/api/carrito/direcciones`)
- **GET `/`** — List user's shipping addresses.
- **POST `/`** — Add new address.
- **PATCH `/:id`** — Update address.
- **DELETE `/:id`** — Delete address.

### 4.4 Eventos (`/api/carrito/eventos-pendientes`)
- **GET `/`** — Returns pending events. Uses `FOR UPDATE SKIP LOCKED` to prevent double-processing. Exponentially backs off `next_retry_at` on failures.
- **States**: `'PENDIENTE'`, `'PROCESANDO'`, `'COMPLETADO'`, `'FALLIDO'`.

### 4.5 Pedidos (`/api/carrito/pedidos`)
- **GET `/`** — List user's orders, most recent first.
- **GET `/vendedor`** — Vendor dashboard: list orders containing their products.
- **PATCH `/:id/estado`** — Transition order status using `TRANSICIONES_VALIDAS` table. Emits `pedido:actualizado` via Socket.IO.
- **Valid transitions**: `'PENDIENTE'` → `'PROCESANDO'` → `'ENVIADO'` → `'ENTREGADO'`; any state → `'CANCELADO'`.

### 4.6 Productos (`/api/carrito/productos`)
- **GET `/`** — Query products from catalogo service by name.
- **GET `/:id`** — Get single product by ID.

### 4.7 Transacciones (`/api/carrito/transacciones`)
- **GET `/`** — List user's transactions (payment history).
- **States**: `'PENDIENTE'`, `'COMPLETADO'`, `'FALLIDO'`, `'REEMBOLSADO'`.

### 4.8 Vendedor (`/api/carrito/vendedor`)
- **GET `/resumen`** — Summary stats (total sales, pending orders) for vendor's products.
- **GET `/productos`** — List vendor's products.
- **GET `/pedidos`** — List orders containing vendor's products, with pagination.
- Uses `vendedorMiddleware.js` to extract vendor info from JWT.

### 4.9 Webhook (`POST /api/carrito/pago-confirmado`)
- **Public endpoint** (no `verificarToken`). Validates HMAC signature via `pagosClient.verificarSignature()`.
- On valid payment: updates pedido status, records transaccion, emits Socket.IO events, calls `notificacionesClient` for email notification.
- Uses atomic transaction (BEGIN/COMMIT/ROLLBACK with savepoints).

---

## 5. Service Clients (HTTP)

### Pattern

All 5 service clients in `backend/services/` follow the same pattern:

```js
const config = require('../config');
const BASE_URL = config.someServiceUrl;

async function request(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': config.someApiKey,
        },
    };

    const finalOptions = {
        ...defaultOptions,
        ...options,
        headers: { ...defaultOptions.headers, ...(options.headers || {}) }
    };

    try {
        const response = await fetch(url, finalOptions);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `HTTP ${response.status}`);
        }

        return data;
    } catch (err) {
        console.error(`[${BASE_URL}${endpoint}]`, err.message);
        throw err;
    }
}
```

### Standard `request()` Wrapper

Every service client defines a private `request()` function that:
- Merges default headers (Content-Type, API key) with per-call options.
- Calls `fetch()`, parses JSON, and throws on non-2xx responses.
- Logs errors with a `[SERVICE_NAME]` prefix before rethrowing.

### `requestWithRetry()` (for production resilience)

A retry wrapper around `request()` that:
- Accepts `(endpoint, options, retries = 1, timeout = 5000)`.
- Creates an `AbortController` with the configured timeout.
- On failure, retries only if the error is network-related (AbortError, fetch failure, ECONNREFUSED, ENOTFOUND).
- After exhausting retries, throws the original error.

```js
async function requestWithRetry(endpoint, options = {}, retries = 1, timeout = 5000) {
    for (let attempt = 0; attempt <= retries; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const finalOptions = { ...options, signal: controller.signal };
            const result = await request(endpoint, finalOptions);
            clearTimeout(timeoutId);
            return result;
        } catch (error) {
            clearTimeout(timeoutId);
            const isRetryable =
                error.name === 'AbortError' ||
                error.message.includes('fetch') ||
                error.message.includes('ECONNREFUSED') ||
                error.message.includes('ENOTFOUND');

            if (attempt < retries && isRetryable) continue;
            throw error;
        }
    }
}
```

### All 5 Service Clients

| File | Service | Config Key | Retry? |
|---|---|---|---|
| `authClient.js` | Auth microservice | `authServiceUrl` | Yes (1 retry, 5s timeout, via createServiceClient) |
| `pagosClient.js` | Pagos (MercadoPago) | `pagosServiceUrl` | Yes (1 retry, 5s timeout, via createServiceClient) |
| `productosClient.js` | Catalogo | `productosServiceUrl` | Yes (1 retry, 5s timeout) |
| `enviosClient.js` | Envios | `enviosServiceUrl` | Yes (1 retry, 5s timeout) |
| `notificacionesPedidosClient.js` | Notificaciones | `notificacionesServiceUrl` | Yes (1 retry, 5s timeout) |

### Shared HTTP Client Factory (New)

`backend/lib/adapters.js` now exports `createServiceClient(baseUrl, defaultOptions)` — a factory that creates HTTP clients with built-in AbortController timeout (5s) and 1 automatic retry on network errors. `authClient.js` and `pagosClient.js` have been refactored to use this factory. The remaining 3 clients (`productosClient.js`, `enviosClient.js`, `notificacionesPedidosClient.js`) continue using their own inline `requestWithRetry` but follow the same pattern and can be migrated when convenient.

---

## 6. Naming Conventions & Coding Rules

### JavaScript (CommonJS only)
- `require()` / `module.exports` always. No `import/export`.
- `async/await` always in route handlers (the factory already gives you `async`).
- `try/catch` always — no unhandled promise rejections.
- Return the response object: `return res.status(...).json(...)`.

### File Naming
- Route files: `kebab-case.js` (e.g., `carrito.js`, `checkout.js`, `eventos.js`).
- Service clients: `kebab-case.js` with `Client` suffix (e.g., `authClient.js`, `pagosClient.js`).

### Database
- Parameterized queries only: `pool.query('SELECT ... WHERE id = $1', [id])`.
- Never string-concatenate user input into SQL.
- Use the pool passed to the route factory (never import your own).

### Error Handling
- Always return a JSON error response with a descriptive message.
- Log the error with `console.error('[METHOD /path]', err)` including the actual error object.
- Never call `next(err)` — there is no Express error middleware in this project.

### JWT / Auth
- Use the `verificarToken` middleware passed to the route factory.
- Do NOT implement auth logic inside routes.
- `transacciones.js` and `eventos.js` are exceptions (no token check).
