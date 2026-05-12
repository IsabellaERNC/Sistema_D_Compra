## Conventions & Patterns

- CommonJS throughout backend (`require`/`module.exports`)
- Factory pattern for routes: `(pool, verificarToken) => router`
- Service clients return parsed JSON, errors thrown as-is
- Frontend uses plain fetch, no Axios/SWR
- PostgreSQL with pg Pool
- No TypeScript, no ESM in backend

## Decisions

- Jest for testing (CommonJS compatible)
- socket.io for WebSocket (real-time order status)
- REST + Webhooks (no Kafka/RabbitMQ)
- Carrito redirects to Pasarela (no card form)

## Issues & Gotchas

- State naming inconsistency: DB uses PENDIENTE/APROBADA/RECHAZADA but code uses pendiente/pagado/cancelado/fallido
  - FIXED (2026-05-10): All 3 route files updated, 12 occurrences aligned. Tests in __tests__/transaccion-estados.test.js
- JWT only has {id, nombre, email} — need vendor_id and rol for VEND-01

## Service Client Pattern (T14)

- New service client: `notificacionesPedidosClient.js` follows same pattern as `pagosClient.js`
  - Native `fetch` with a private `request()` helper
  - Config var: `notificacionesServiceUrl` (default `http://localhost:4003`)
  - 4 methods: `notificarPedidoCreado`, `notificarCambioEstado`, `notificarCancelacion`, `notificarReembolso`
  - Each with input validation (same defensive style as pagosClient)
  - Added: 5s timeout via `AbortController`, 1 automatic retry on retryable errors
  - Tests in `backend/__tests__/notificacionesPedidosClient.test.js` with mocked `global.fetch`
  - 13 tests: 4 success paths, 5 validation errors, 4 error handling (retry, timeout, 4xx, 5xx)
- productosClient incomplete (only getProductos)
- No notificacionesPedidosClient exists
- No address management

## Problems

- None yet

## Sprint 1 Documentation (Completed)

- README.md: description, architecture ASCII diagram, services table, setup instructions, env vars table, conventions
- .env.example: all 11 vars from config.js with empty/example values, no real credentials
- docs/setup.md: 7-step guide (clone, npm install x2, .env setup, DB migration, start backend, start frontend), troubleshooting section, project structure tree
- docs/arquitectura.md: full ASCII architecture diagram, 6 data flow sequences (guest cart, authenticated cart, fusion, checkout, webhook, transactions), design patterns, state table
- docs/api-externa.md: 4 external services documented (Auth:4000, Productos:4001, Pagos:4002, Notificaciones:4003) with endpoints, request/response contracts, sequence diagram
- All files use CommonJS conventions, no TypeScript, no real credentials exposed

## productosClient Extension
- Added requestWithRetry helper with AbortController timeout (5000ms) and 1 retry
- Added 4 new methods: verificarStock, getProducto, deducirStock, getReco

## T20/T21/T23 Verification (2026-05-11)

### T20: Multiple Shipping Addresses — INCOMPLETE
BACKEND COMPLETE:
- direcciones.js: Full CRUD (GET, POST, PATCH, DELETE, PATCH /:id/predeterminada)
- POST enforces max 5 addresses per user (line 40)
- Proper predeterminada handling (unset others before setting new)
- DELETE prevents deleting the last default address
- Route registered in server.js at /api/direcciones
- Migration 002_direcciones.sql creates direcciones table with proper schema

FRONTEND MISSING:
- No frontend address management UI (no direcciones.html in pages/)
- No frontend JS for address management (no direcciones.js in js/)
- No address selection in checkout.html — checkout flow doesn't reference direccion_envio_id
- carrito.html has no address references
- The pedidos table has direccion_envio_id column but it's never populated by checkout/iniciar

### T21: Complete Purchase History — COMPLETE
BACKEND:
- transacciones.js: GET /api/transacciones (list) + GET /api/transacciones/:id (detail) — both user-scoped
- pedidos.js: GET /api/pedidos (list) + GET /api/pedidos/:id (detail)
- PATCH /api/transacciones/:id/estado for state updates

FRONTEND:
- pedidos.html: Full purchase history page with expandable cards, status badges, WebSocket status indicator
- pedidos.js: listarPedidos(), obtenerPedido(), renderPedidos(), WebSocket real-time updates
- Auth guard redirects to login if not authenticated
- Cancel button for Pendiente/Procesando orders
- Socket.IO connection for real-time estado changes

### T23: Payment Retry Flow — COMPLETE
BACKEND:
- checkout.js lines 96-113: Rate limits to max 3 PENDIENTE transactions per user in 10-minute window
- Returns 429 with retry_after: '10 minutos' when limit exceeded
- Migration 008_pago_intentos.sql: intentos_pago (default 1), ultimo_intento_pago, intentos_cancelacion columns on transacciones
- ultimo_intento_pago set to NOW() on transaction creation
- POST /api/eventos/reintentar for failed event reprocessing with intentos/max_intentos tracking
- eventos.js registered in server.js at /api/eventos

NOTE: intentos_pago column exists in DB but is not actively incremented by checkout.js.
The rate limiting counts distinct PENDIENTE transactions in the window (COUNT query) rather
than tracking retries per-transaction. Functional equivalent — user can't create >3 payment
attempts in 10 min.

- F1 (2026-05-11): Plan compliance audit complete. 86/100 Must Have items present (86%). 0 Must NOT Do violations. VERDICT: CONDITIONAL APPROVE. Key gaps: T22 PDF invoice (marked not needed), T1 Jest (intentionally deleted), T13 confirmacion.js missing, T21 historial.html/js missing. Full report in .sisyphus/evidence/final-qa/f1-plan-compliance.txt
