# Backend — Express API Server

> Express + PostgreSQL shopping cart API. CommonJS, factory-pattern routes, external service clients.

## Quick Orientation

| What | Where | Notes |
|------|-------|-------|
| Entry point | `server.js` | Creates Express app, Pool, mounts routes |
| Config | `config.js` | All env vars: services URLs, DB, webhook secret |
| Routes | `routes/` | 4 route files, all factory pattern |
| Services | `services/` | 3 HTTP clients for external microservices |

## Route Factory Pattern (CRITICAL)

Every route file follows this exact pattern:

```javascript
// routes/carrito.js
module.exports = (pool, verificarToken) => {
  const router = express.Router();
  router.get('/', verificarToken, async (req, res) => { ... });
  return router;
};
```

**Why**: `server.js` injects the shared `pool` (pg Pool) and `verificarToken` middleware into every route at mount time. This avoids global state and makes testing possible.

**Rule**: NEVER export a bare `Router` — always use the factory signature `(pool, verificarToken) => router`.

## Route Files

| File | Prefix | Auth | Responsibilities |
|------|--------|------|-----------------|
| `carrito.js` | `/api/carrito` | ✅ All routes | CRUD: list, upsert, update qty, delete item, fusionar (guest→user merge), datos-pago |
| `checkout.js` | `/api/checkout` | ✅ All routes | Start checkout: validate cart → create transacción → call pagos service → return payment URL |
| `transacciones.js` | `/api/transacciones` | ✅ All routes | List user transactions, get by ID, update status |
| `webhook.js` | `/api/webhook` | ❌ No auth | Receives payment confirmations, verifies HMAC, clears cart |

## Service Clients

All service clients are thin HTTP wrappers:

| File | External Service | Methods |
|------|-----------------|---------|
| `authClient.js` | Auth service | `login()`, `register()`, `validateToken()`, `getUsuario()` |
| `productosClient.js` | Productos service | `getProductos()` |
| `pagosClient.js` | Pagos service (MercadoPago) | `crearCheckout()`, `verificarSignature()` |

**Rule**: Always call service clients from routes, never make direct HTTP calls to external services in route handlers.

## Middleware

### `verificarToken` (defined in `server.js`)
- Extracts `Authorization: Bearer <token>` header
- Delegates to `authClient.validateToken()`
- On success: sets `req.usuario = { id, nombre, email }`
- On failure: returns 401

**Important**: The webhook route does NOT use this middleware — it has its own HMAC verification via `pagosClient.verificarSignature()`.

## Database

- **Pool**: Created in `server.js` with config from `config.js`
- **Carrito table**: `id UUID PK`, `usuario_id INT`, `producto_id VARCHAR(50)`, `producto_nombre TEXT`, `precio_unitario DECIMAL`, `cantidad INT`, `created_at`, `updated_at`
- **Unique constraint**: `(usuario_id, producto_id)` — one product per user
- **Transacciones table**: `id`, `usuario_id`, `items JSONB`, `usuario_email`, `total`, `estado` (PENDIENTE/APROBADA/RECHAZADA), `fecha`
- **Trigger**: `updated_at` auto-timestamp on carrito row update

## Carrito Fusion Logic (`POST /api/carrito/fusionar`)

When a guest user logs in:
1. Read guest cart from localStorage (sent in request body)
2. For each guest item: `INSERT ... ON CONFLICT (usuario_id, producto_id) DO UPDATE SET cantidad = carrito.cantidad + EXCLUDED.cantidad`
3. This **adds** guest quantities to existing user items — does NOT replace them

## Guardrails ⚠️

- **Pool is shared** — don't create new pg.Pool instances; use the one injected via factory
- **Error handling**: Routes use try/catch with `res.status(500).json({ error: ... })` — maintain this pattern
- **CORS**: Enabled globally in `server.js` — don't add per-route CORS
- **No transactions**: No `BEGIN/COMMIT/ROLLBACK` in route handlers currently. If adding, use `pool.query('BEGIN')` pattern consistently
- **Config fallbacks**: `config.js` has hardcoded defaults — for local dev only, never rely on them in production
<!-- OMO_INTERNAL_INITIATOR -->

[SUPERMEMORY]

Project Knowledge:
- [100%] [Session Summary]


## Goal
Complete the shopping cart microservice plan (carrito-microservicio) with 13 implementation tasks and 4 final verification tasks

## Constraints & Preferences
- Backend: improve existing Express backend (not create new project)
- Persistence: hybrid (localStorage for guests, PostgreSQL for authenticated users)
- Guest→user fusion: preserve (don't combine) - existing items stay, new items added
- No automated tests - manual verification only
- Services (auth, productos, pagos) are external - only consume, don't implement

## Progress
### Done
- Task 1: Migration SQL - tabla carrito + fix transacciones
- Task 2: External service contracts documentation
- Task 3: Cart route structure in backend/routes/carrito.js
- Task 4: GET /api/carrito endpoint
- Task 5: POST /api/carrito endpoint (add item with upsert)
- Task 6: PATCH /api/carrito/:producto_id endpoint
- Task 7: DELETE /api/carrito/:producto_id endpoint
- Task 8: POST /api/carrito/fusionar endpoint (guest→user)
- Task 9: Cart clear in webhook on payment confirmed
- Task 10: GET /api/carrito/datos-pago endpoint
- Task 11: Frontend sync cart on add (main.js)
- Task 12: Frontend guest→user fusion on login (auth.js + carrito.js)
- Task 13: Frontend clear cart on payment confirmation (pago.html)

### In Progress
- Final Wave: F1-F4 verification tasks (F1 completed, F2 completed, F3 in progress)

### Blocked
- None

## Key Decisions
- Architecture: improve existing backend instead of creating new project
- Persistencia híbrida: localStorage para guests, PostgreSQL para autenticados
- Fusión guest→user: conservar (no sumar cantidades) - si el usuario ya tiene el producto, no se duplica

## Next Steps
- Complete F3 (Real Manual QA) verification
- Run F4 (Scope Fidelity Check)
- Mark plan complete in boulder.json

## Critical Context
- Plan has 13/17 tasks complete (76%)
- The plan was created in a previous session and approved by Momus with "OKAY"
- Tasks 4-13 were Wave 2-4 implementations launched as parallel agent tasks

## Relevant Files
- .sisyphus/plans/carrito-microservicio.md: Active plan file
- .sisyphus/boulder.json: Work session state
- backend/routes/carrito.js: Cart API implementation
- backend/routes/webhook.js: Cart clear on payment
- frontend/js/main.js, auth.js, carrito.js: Frontend sync and fusion
- database/schema_completo.sql: Complete DB schema (replaces migrations 000-009)

## 1. User Requests (As-Is)
- "somos un carrito de compras con micro servicios" - We are a shopping cart with microservices
- 5 user stories: 1) save products from catalog, 2) verify user login (redirect to external auth), 3) preserve cart when guest registers, 4) send payment data to payment gateway, 5) empty cart after payment

## 2. Final Goal
Complete the shopping cart microservice implementation with:
- PostgreSQL cart table with migration
- REST API for cart CRUD operations
- Guest→user cart fusion on authentication
- Items detail in transacciones table
- Frontend integration to sync with backend
- Cart empty on payment confirmation

## 3. Work Completed
13 implementation tasks completed:
- Database migration: new `carrito` table + columns added to `transacciones`
- API endpoints: GET, POST, PATCH, DELETE, /fusionar, /datos-pago
- Webhook modification: clear cart on successful payment
- Frontend: sync cart on add, fusion on login, clear on payment
- Contracts documented: auth-service.md, productos-service.md, pagos-service.md

## 4. Remaining Tasks
- Final verification tasks F1-F4 are partially complete:
  - F1 (Plan Compliance Audit): Completed with findings in notepad
  - F2 (Code Quality Review): Completed - 4 minor console.log issues, otherwise clean
  - F3 (Real Manual QA): In progress
  - F4 (Scope Fidelity Check): Not started

## 5. Active Working Context (For Seamless Continuation)
- Files: .sisyphus/plans/carrito-microservicio.md (plan), backend/routes/carrito.js (API)
- The final verification wave was running when session compacted
- Verification results from F1 and F2 need to be recorded in plan file
- Current boulder state: 13/17 tasks complete

## 6. Explicit Constraints (Verbatim Only)
- "NO modificar interfaces de authClient, productosClient, pagosClient"
- "NO agregar endpoints de auth/register/login al backend"
- "NO introducir ORM o dependencias nuevas"
- "NO modificar lógica de verificación de firma del webhook"
- "NO cambiar las localStorage keys existentes"

## 7. Agent Verification State (Critical for Reviewers)
- Current verification: Final Wave (F1-F4)
- Completed: F1 (Plan Compliance Audit), F2 (Code Quality Review)
- Pending: F3 (Real Manual QA), F4 (Scope Fidelity Check)
- Previous findings: F2 found 4 console.log debug traces (minor, non-blocking)

## 8. Delegated Agent Sessions
- Multiple Sisyphus-Junior agents executed in parallel for Wave 2-4
- Key sessions:
  - Task 5 (POST /api/carrito): ses_1f7535274ffef2wUuZwlxDBpUg - completed
  - Task 6 (PATCH): ses_1f74f8bf9ffebMfoYFgCeIEdLE - completed
  - Task 7 (DELETE): ses_1f74edfbfffewTjhJtAkmY1b94 - completed
  - Task 8 (fusionar): ses_1f74e09a5ffeC8XHgv2r6w0dLA - completed
  - Task 9 (webhook clear): ses_1f74caf42ffeouMfMLmCqK9eFD - completed
  - Task 10 (datos-pago): ses_1f74c1db7ffelx7w06uvKX1Gk5 - completed
  - Task 11 (frontend sync): ses_1f74a6ea5ffeglNwQYcFhUUXyq - completed
  - Task 12 (fusion frontend): ses_1f68a4c5dffeFJtwsawMe04qNH - completed
  - Task 13 (payment clear): ses_1f681d289ffeX9CgMro09FO14q - completed
- Verification agents: F1 completed, F2 completed
- [100%] Code Quality Review (auth migration): Reviewed frontend/js/auth.js, main.js, carrito.js, pages/login.html. APPROVED with 3 minor findings: console.log debug traces in carrito.js lines 98 and 159, and dead getStock() stub in carrito.js lines 3-6. Everything else clean — no TODO/FIXME, no AI slop, no inconsistent indentation, no unused variables. Auth callback flow is logically sound across all files.
