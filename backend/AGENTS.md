# AGENTS.md — Backend (Carrito Service)

## Project Identity

This is the **carrito service** of Sistema D Compra, an Express-based monolith running on config.port (default 3000). It handles cart management, checkout flow, payments, orders, addresses, events, and vendor operations. All other microservices (auth, catalogo, pagos, notificaciones, envios) are external HTTP services consumed via service clients in `backend/services/`.

## Technology Stack

| Component | Technology | Notes |
|---|---|---|
| Runtime | Node.js 18+ | Alpine in Docker |
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
2. Attempts to connect to the primary PostgreSQL pool. Falls back to the external DB in Docker.
3. Creates the HTTP server and Socket.IO instance.
4. Registers the `verificarToken` middleware (closure over `effectiveDevMode`).
5. Mounts all 9 route modules.
6. Starts the TTL worker (clears inactive carts >30 days) and the retry worker (reprocesses `eventos_pendientes`).
- The `webhook` route does NOT receive `verificarToken` (it is a public endpoint with HMAC signature validation).
- Some routes import additional service clients at the top of their file (e.g., `pedidos.js` imports `pagosClient`, `notificacionesClient`).
- The `adapters.js` file in `lib/` provides a unified re-export point for all 5 service clients.

### Dual DB Fallback (Runtime)

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

> **Updated in production-hardening (2026-05-18)**: This dual DB fallback is intended for local development only. In production with a known DB URL, replace with a single pool: `const pool = await tryPool(config.db)`. The plan also documents step-by-step cleanup instructions (see root AGENTS.md Microservice URL Migration Guide).

### New Features (Production Hardening — May 2026)

- **config.port**: Port is now configurable via `process.env.PORT` (default `'3000'`), no longer hardcoded. Read from `config.port` exported by `config.js`.
- **/health endpoint**: `GET /api/health` returns `{ status: 'ok', timestamp, uptime }` — no auth required, always available. Great for load balancer health checks.
- **Graceful shutdown**: `gracefulShutdown()` function stops accepting new connections, closes HTTP server, closes DB pool, then exits with code 0. Triggered by SIGTERM or SIGINT. Forces exit after 10s timeout.
- **validateEnv()**: `config.js` exports `validateEnv()` that checks 8 required environment variables at startup: JWT_SECRET, DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, PAGOS_WEBHOOK_SECRET, AUTH_API_KEY, PAGOS_API_KEY. Call from server.js after loading config.

---

## 4. Service Client Pattern

All service clients live in `backend/services/`. They follow an identical wrapper pattern using Node.js native `fetch()` (NOT axios).

### Standard Structure

```js
const config = require('../config');

const BASE_URL = config.someServiceUrl;

async function request(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;

    const defaultOptions = {
        headers: { 'Content-Type': 'application/json' },
        ...(config.someApiKey ? { 'X-API-Key': config.someApiKey } : {})
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

`backend/lib/adapters.js` now exports `createServiceClient(baseUrl, defaultOptions)` — a factory that creates HTTP clients with built-in AbortController timeout (5s) and 1 automatic retry for network errors. Both `authClient.js` and `pagosClient.js` were refactored to use this factory, matching the pattern already used by `productosClient.js`, `enviosClient.js`, and `notificacionesPedidosClient.js`. Zero raw `fetch()` calls remain in these files.

```js
const { createServiceClient } = require('../lib/adapters');
const client = createServiceClient(BASE_URL, {
    headers: { 'Content-Type': 'application/json' },
    ...(config.someApiKey ? { 'X-API-Key': config.someApiKey } : {})
});

// Single request with timeout:
const data = await client.request('/endpoint');

// Request with 1 retry on network errors:
const data = await client.requestWithRetry('/endpoint');
```

### Export Pattern

All clients export arrow functions:

```js
async function someAction(param) {
    return request('/endpoint', { method: 'POST', body: JSON.stringify({ ... }) });
}

module.exports = { someAction, otherAction };
```

## BUG Reference Table

| ID | Location | Description |
|---|---|---|
| BUG-01 | `pedidos.js`, `vendedor.js` | States unified to UPPERCASE canonical form |
| BUG-03 | `pedidos.js`, `vendedor.js` | Import path corrected for notificacionesClient |
| BUG-04 | `productosClient.js` | AbortController signal propagated to request, explicit isRetryable |
| BUG-05 | `pagosClient.js` | Length guard before timingSafeEqual to prevent exception |
| BUG-06 | `checkout.js` | Deduplicated address validation (moved before try block) |
| BUG-07 | `server.js` | Removed duplicate `/api/productos` handler |
| BUG-08 | `webhook.js` | cancelled/canceled treated as cancellation, not rejection |
| BUG-09 | `authClient.js` | Throws Error instead of returning `{ error }` for try/catch consistency |
| BUG-10 | `config.js`, `pagosClient.js` | PAGOS_API_KEY propagation and header inclusion |

---

## File Index (backend/)

```
backend/
├── .env                       # Local dev config (gitignored)
├── AGENTS.md                  # This file
├── config.js                  # Centralized config from env vars
├── Dockerfile                 # node:18-alpine, port 3000
├── package.json               # "type": "commonjs"
├── server.js                  # Entry point: Express + Socket.IO + DB init
├── lib/
│   └── adapters.js            # Unified re-export of all service clients
├── routes/
│   ├── carrito.js             # Cart CRUD + price enrichment
│   ├── checkout.js            # Checkout flow + MP preference creation
│   ├── direcciones.js         # Address CRUD (max 5 per user)
│   ├── eventos.js             # Retry queue (FOR UPDATE SKIP LOCKED)
│   ├── pedidos.js             # Order CRUD + PDF invoice + state machine
│   ├── productos.js           # Recommendations + listing
│   ├── transacciones.js       # Transaction history + dev public status
│   ├── vendedor.js            # Vendor order management + state changes
│   ├── vendedorMiddleware.js  # Role-based authorization middleware
│   └── webhook.js             # Payment webhook (public, HMAC auth)
├── services/
│   ├── authClient.js          # Auth microservice HTTP client
│   ├── enviosClient.js        # Envios microservice HTTP client (retry)
│   ├── notificacionesPedidosClient.js  # Notificaciones client (retry)
│   ├── pagosClient.js         # Pagos/MercadoPago client + HMAC verify
│   └── productosClient.js     # Catalogo client (retry + timeout)
├── scripts/
│   ├── create-db.js           # DB creation utility
│   └── run-schema.js          # Schema runner
└── test/
    [test/ removed — mock file deleted, local testing not planned]
```

---

## MICROSERVICE URL MIGRATION GUIDE (Backend)

When real microservice URLs are available, update:

### `backend/config.js` — Service URLs
```js
// Set these as env vars or change defaults:
authServiceUrl:     process.env.AUTH_SERVICE_URL      || 'http://auth:4000',
productosServiceUrl: process.env.PRODUCTOS_SERVICE_URL || 'http://catalogo:4001',
pagosServiceUrl:    process.env.PAGOS_SERVICE_URL     || 'http://pagos:4002',
notificacionesServiceUrl: process.env.NOTIFICACIONES_SERVICE_URL || 'http://notificaciones:4003',
enviosServiceUrl:   process.env.ENVIOS_SERVICE_URL    || 'http://envios:4004',
```

### `backend/server.js` — Remove Dual DB Fallback
Simplify pool creation when DB URL is known:
```js
// BEFORE (auto-detect):
let pool;
try { pool = await tryPool(config.db); }
catch (e) { pool = await tryPool(config.externalDb); }

// AFTER (single pool):
const pool = new Pool(config.db);
```

### No Changes Needed
- `services/authClient.js` and `services/pagosClient.js`: Use `createServiceClient()` which reads from config.js — updated automatically.
- `lib/adapters.js`: No URL hardcodes.
