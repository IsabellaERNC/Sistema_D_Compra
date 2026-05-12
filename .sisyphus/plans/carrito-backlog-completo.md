# Plan: Backlog Completo — Carrito de Compras

## TL;DR

> **Quick Summary**: Implementar las 17 historias de usuario + 3 tareas de documentación del backlog del microservicio Carrito, abarcando carrito CRUD, checkout, pedidos, estados, historial y extras, conectándose a 4 servicios externos (LOGIN, CATÁLOGO, PASARELA DE PAGOS, NOTIFICACIONES-PEDIDOS).
> 
> **Deliverables**:
> - Documentación: README.md, .env.example, docs de setup
> - Infraestructura: Jest testing, WebSocket (socket.io), notificacionesPedidosClient, productosClient extendido
> - APIs: Direcciones (CRUD), Pedidos (CRUD + estados), Factura PDF, Reembolsos
> - Frontend: Panel de vendedor, historial, checkout rediseñado, recomendaciones
> - Base de datos: Migraciones para direcciones, pedidos, transacciones audit
> 
> **Estimated Effort**: XL (25 tareas de implementación + 4 de verificación)
> **Parallel Execution**: YES — 6 waves + Final
> **Critical Path**: T1 (Jest) → T4 (productosClient) → T8 (stock validation) → T10 (cart summary) → T12 (checkout) → T14 (order persist) → T15 (notifications) → T17 (tracking) → F1-F4

---

## Context

### Original Request
Implementar el backlog completo del microservicio Carrito de Compras: 17 historias de usuario + 3 tareas de documentación en 7 sprints.

### Interview Summary

**Key Discussions**:
- **Arquitectura**: REST + Webhooks (sin Kafka/RabbitMQ). Patrón actual del proyecto confirmado.
- **Scope**: Los 7 sprints completos en UN SOLO plan.
- **Contratos externos**: Ya existen. LOGIN, CATÁLOGO, PASARELA, NOTIFICACIONES-PEDIDOS definen sus APIs.
- **Pago**: El Carrito NO maneja formulario de tarjeta. Solo redirige a Pasarela con datos del pedido.
- **Stock**: Validación al agregar al carrito + revalidación al confirmar pedido.
- **Vendedor (VEND-01)**: Panel dentro del Carrito. Rol desde JWT de LOGIN. Filtrado por vendor_id del producto.
- **Testing**: Jest. TDD (RED → GREEN → REFACTOR) para todas las tareas.
- **Sprint 1**: Solo documentación del setup existente.
- **WebSocket**: Incluir socket.io para estados de pedido en tiempo real.

**Research Findings**:
- **productosClient**: Solo tiene `getProductos()`. Faltan: `verificarStock()`, `getProducto()`, `deducirStock()`, `getRecommendations()`.
- **notificacionesPedidosClient**: No existe. Hay que crearlo desde cero.
- **State naming**: DB usa `PENDIENTE/APROBADA/RECHAZADA` pero código usa `pendiente/pagado/cancelado/fallido`. Hay que alinear.
- **JWT**: Solo tiene `{id, nombre, email}`. Para VEND-01 se necesita `vendor_id` y `rol`.
- **No address management**: Sin tabla ni endpoints de direcciones.
- **No socket.io**: Sin dependencia ni setup de WebSocket.

### Metis Review
**Identified Gaps** (addressed):
- ProductosClient incompleto → Tarea 4: Extender productosClient con métodos faltantes
- NotificacionesPedidosClient inexistente → Tarea 5: Crear nuevo service client
- Inconsistencia de estados transacción → Tarea 6: Alinear DB y código
- Sin lógica de vendor en JWT → Tarea 19: Asumir que LOGIN agrega `rol` y `vendor_id` al JWT
- Sin gestión de direcciones → Tarea 18: Nueva tabla + API de direcciones
- Sin WebSocket → Tarea 2: Setup socket.io
- Sin tests → Tarea 1: Setup Jest + ejemplo

---

## Work Objectives

### Core Objective
Completar la implementación del backlog de 17 historias de usuario del Carrito de Compras, transformándolo en el microservicio central del marketplace que orquesta catálogo, autenticación, pagos y notificaciones/envíos.

### Concrete Deliverables
- **Docs**: `README.md` mejorado, `.env.example`, `docs/setup.md`
- **Backend**: `backend/services/notificacionesPedidosClient.js`, `backend/routes/direcciones.js`, `backend/routes/pedidos.js`, `backend/routes/vendedor.js`, `backend/routes/facturas.js`
- **Frontend**: `frontend/js/checkout.js`, `frontend/js/pedidos.js`, `frontend/js/direcciones.js`, `frontend/pages/vendedor.html`, `frontend/pages/historial.html`
- **DB**: Migraciones `002_direcciones.sql`, `003_pedidos_audit.sql`, `004_vendedor_estados.sql`
- **Infra**: Jest config (`jest.config.js`), socket.io setup en `server.js`

### Definition of Done
- [ ] 17/17 historias de usuario pasan sus criterios de aceptación
- [ ] `npx jest` → todos los tests pasan (verde)
- [ ] `node backend/server.js` → sin errores de inicio
- [ ] `npm run dev` (frontend) → carga sin errores de consola
- [ ] Endpoints nuevos responden correctamente vía curl
- [ ] WebSocket emite eventos de cambio de estado

### Must Have
- Validación de stock contra Catálogo en agregar y confirmar
- Fusión guest→user del carrito preservada
- Redirección a Pasarela (sin formulario de tarjeta en Carrito)
- Panel de vendedor filtrado por vendor_id
- Factura PDF con requisitos fiscales colombianos
- Tests Jest para todos los endpoints nuevos

### Must NOT Have (Guardrails)
- ❌ NO formulario de tarjeta de crédito en el Carrito
- ❌ NO Kafka/RabbitMQ — solo REST + Webhooks
- ❌ NO TypeScript — mantener CommonJS en backend
- ❌ NO romper factory pattern de rutas
- ❌ NO llamar servicios externos directamente desde rutas
- ❌ NO modificar estados de transacción existentes (PENDIENTE, APROBADA, RECHAZADA)
- ❌ NO modificar interfaces de authClient, productosClient, pagosClient (solo extender)
- ❌ NO cambiar localStorage keys existentes del frontend
- ❌ NO agregar endpoints de auth/register/login al backend

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** - ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: NO (se crea en Tarea 1)
- **Automated tests**: TDD (RED → GREEN → REFACTOR)
- **Framework**: Jest (backend CommonJS compatible)

### QA Policy
Every task MUST include agent-executed QA scenarios. Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend/UI**: Playwright — Navigate, interact, assert DOM, screenshot
- **TUI/CLI**: interactive_bash (tmux) — Run command, validate output
- **API/Backend**: Bash (curl) — Send requests, assert status + response fields
- **Library/Module**: Bash (node REPL) — Import, call functions, compare output

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 0 (Foundation — Sprint 1 + Infra):
├── T1: Jest test infrastructure setup [quick]
├── T2: WebSocket (socket.io) setup [quick]
├── T3: Sprint 1 docs (README, .env.example, setup) [writing]
├── T4: Extender productosClient (stock, producto, deduct, recommendations) [quick]
├── T5: Crear notificacionesPedidosClient [quick]
├── T6: Alinear estados de transacción (DB + código) [quick]
└── T7: Tabla + API de direcciones (CART-11) [deep]

Wave 1 (Sprint 2 — Cart Enhancement):
├── T8: CART-01 - Stock validation on add to cart (depends: T4) [deep]
├── T9: CART-02 - Increase/decrease with stock limits (depends: T4, T8) [deep]
└── T10: CART-03 - Cart summary with live Catálogo pricing (depends: T4) [deep]

Wave 2 (Sprint 3 — Checkout):
├── T11: CART-04 - Login redirect for guests at checkout (depends: T8, T10) [deep]
├── T12: CART-05 - Checkout → Pasarela redirect (depends: T8, T10, T11) [deep]
└── T13: CART-06 - Payment confirmation page (depends: T12) [visual-engineering]

Wave 3 (Sprint 4 — Orders):
├── T14: CART-07 - Persist order on payment confirmation (depends: T12, T6) [deep]
├── T15: CART-08 - Notify Catálogo + Notificaciones on order (depends: T5, T14) [deep]
└── T16: CART-09 - Transaction audit log (depends: T6, T14) [deep]

Wave 4 (Sprint 5 — States):
├── T17: CART-10 - Order tracking with status colors + WebSocket (depends: T2, T14) [deep]
├── T18: VEND-01 - Vendor panel + state machine (depends: T14, T17) [deep]
└── T19: CART-14 - Cart persistence 30-day TTL (depends: T8) [deep]

Wave 5 (Sprint 6 — History):
├── T20: CART-12 - Purchase history (depends: T14) [deep]
├── T21: CART-13 - PDF invoice generation (depends: T14) [deep]
└── T22: CART-17 - Product recommendations (depends: T4) [visual-engineering]

Wave 6 (Sprint 7 — Extras):
├── T23: CART-15 - Payment retry flow (depends: T12, T14) [deep]
├── T24: CART-16 - Order cancellation + refund (depends: T14, T15) [deep]
└── T25: Frontend integration — wire all new pages (depends: T13, T17, T18, T20, T22) [visual-engineering]

Wave FINAL (After ALL — 4 parallel reviews, then user okay):
├── F1: Plan Compliance Audit (oracle)
├── F2: Code Quality Review (unspecified-high)
├── F3: Real Manual QA (unspecified-high)
└── F4: Scope Fidelity Check (deep)
→ Present results → Get explicit user okay

Critical Path: T1 → T4 → T8 → T10 → T12 → T14 → T17 → T18 → T25 → F1-F4
Parallel Speedup: ~75% faster than sequential
Max Concurrent: 7 (Wave 0)
```

### Agent Dispatch Summary

| Wave | Count | Profiles |
|------|-------|----------|
| 0 | 7 | quick×5, writing×1, deep×1 |
| 1 | 3 | deep×3 |
| 2 | 3 | deep×2, visual-engineering×1 |
| 3 | 3 | deep×3 |
| 4 | 3 | deep×3 |
| 5 | 3 | deep×2, visual-engineering×1 |
| 6 | 3 | deep×2, visual-engineering×1 |
| FINAL | 4 | oracle×1, unspecified-high×2, deep×1 |
| **TOTAL** | **29** | |

---

## TODOs

> Implementation + Test = ONE Task. Never separate.
> EVERY task MUST have: Recommended Agent Profile + Parallelization info + QA Scenarios.
> **A task WITHOUT QA Scenarios is INCOMPLETE. No exceptions.**

- [x] 1. Jest Test Infrastructure Setup

  **What to do**:
  - Instalar Jest: `npm install --save-dev jest` en `backend/`
  - Crear `backend/jest.config.js` con configuración para CommonJS (no ESM)
  - Agregar script `"test": "jest --verbose"` en `backend/package.json`
  - Crear `backend/__tests__/` directorio
  - Escribir test de ejemplo: `backend/__tests__/config.test.js` que verifique que `config.js` carga variables de entorno
  - Verificar: `npm test` → 1 test pasa

  **Must NOT do**:
  - NO modificar `package.json` excepto para agregar jest y script test
  - NO convertir archivos existentes a ESM
  - NO instalar en frontend (solo backend por ahora)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `["nodejs-backend-patterns"]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 0 (with T2, T3, T4, T5, T6, T7)
  - **Blocks**: T8, T9, T10 (all need tests)
  - **Blocked By**: None

  **References**:
  - `backend/package.json` — Dependencias actuales y scripts existentes
  - `backend/config.js` — Para test de ejemplo que verifica carga de env vars

  **Acceptance Criteria**:
  - [ ] `backend/jest.config.js` existe con configuración CommonJS
  - [ ] `backend/package.json` tiene `"jest": "^29.0.0"` en devDependencies y script `"test"`
  - [ ] `npx jest --version` funciona desde `backend/`
  - [ ] `npm test` → 1 test pasa (ejemplo de config.js)

  **QA Scenarios**:

  ```
  Scenario: Jest installs and runs example test
    Tool: Bash
    Preconditions: Working directory = backend/
    Steps:
      1. cd backend && npm install
      2. npm test
      3. Assert stdout contains "Tests: 1 passed"
      4. Assert exit code is 0
    Expected Result: Jest runs, 1 test passes (config.js env var loading)
    Evidence: .sisyphus/evidence/task-1-jest-setup.txt

  Scenario: Jest handles test failure correctly
    Tool: Bash
    Preconditions: A failing test exists temporarily
    Steps:
      1. Create a temporary failing test
      2. npm test
      3. Assert exit code is 1
      4. Assert stdout contains "Tests: 1 failed"
      5. Remove the temporary failing test
    Expected Result: Jest correctly reports failure
    Evidence: .sisyphus/evidence/task-1-jest-failure.txt
  ```

  **Commit**: YES
  - Message: `chore(backend): add Jest test infrastructure`
  - Files: `backend/package.json`, `backend/package-lock.json`, `backend/jest.config.js`, `backend/__tests__/config.test.js`

- [x] 2. WebSocket (socket.io) Setup

  **What to do**:
  - Instalar socket.io: `npm install socket.io` en `backend/`
  - En `backend/server.js`: inicializar Socket.IO server adjunto al HTTP server existente
  - Configurar namespace `/pedidos` para eventos de estado
  - Autenticación: validar JWT en conexión WebSocket (usar mismo `verificarToken`)
  - Unirse a room `usuario_{userId}` para recibir actualizaciones de sus pedidos
  - Unirse a room `vendedor_{vendorId}` para VEND-01
  - Emitir evento `pedido:estado-cambiado` con `{ pedidoId, nuevoEstado }`
  - Agregar `socket.io` a `backend/package.json` dependencies
  - Escribir test: `backend/__tests__/websocket.test.js` — conexión + autenticación + join room

  **Must NOT do**:
  - NO cambiar el puerto del servidor Express
  - NO deshabilitar CORS existente
  - NO modificar rutas existentes

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `["nodejs-backend-patterns"]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 0 (with T1, T3, T4, T5, T6, T7)
  - **Blocks**: T17
  - **Blocked By**: None

  **References**:
  - `backend/server.js` — HTTP server creation y middleware existente
  - `backend/routes/carrito.js:verificarToken` — Patrón de middleware de auth a replicar en WebSocket
  - Official docs: `https://socket.io/docs/v4/server-api/` — Socket.IO server API

  **Acceptance Criteria**:
  - [ ] `npm install socket.io` instala sin errores
  - [ ] `backend/server.js` tiene Socket.IO adjunto al HTTP server
  - [ ] Conexión WebSocket aceptada con JWT válido
  - [ ] Conexión WebSocket rechazada sin JWT o con JWT inválido
  - [ ] `npx jest backend/__tests__/websocket.test.js` → todos los tests pasan

  **QA Scenarios**:

  ```
  Scenario: WebSocket connects with valid JWT
    Tool: Bash (node script)
    Preconditions: Backend running on port 3000, valid JWT token
    Steps:
      1. Run: node -e "
         const { io } = require('socket.io-client');
         const socket = io('http://localhost:3000/pedidos', {
           auth: { token: 'VALID_JWT' }
         });
         socket.on('connect', () => { console.log('CONNECTED'); process.exit(0); });
         socket.on('connect_error', (err) => { console.log('ERROR:', err.message); process.exit(1); });
         setTimeout(() => process.exit(1), 5000);
         "
      2. Assert stdout contains "CONNECTED"
      3. Assert exit code is 0
    Expected Result: WebSocket connects successfully with valid JWT
    Evidence: .sisyphus/evidence/task-2-ws-connect.txt

  Scenario: WebSocket rejects invalid JWT
    Tool: Bash (node script)
    Preconditions: Backend running on port 3000, INVALID token
    Steps:
      1. Run same script with INVALID_JWT
      2. Assert stdout contains "ERROR"
      3. Assert exit code is 1
    Expected Result: WebSocket rejects connection with invalid JWT
    Evidence: .sisyphus/evidence/task-2-ws-reject.txt
  ```

  **Commit**: YES
  - Message: `feat(backend): add Socket.IO WebSocket for real-time order updates`
  - Files: `backend/server.js`, `backend/package.json`, `backend/__tests__/websocket.test.js`

- [x] 3. Sprint 1 Documentation

  **What to do**:
  - Mejorar `README.md` raíz con: descripción del proyecto, arquitectura (diagrama ASCII), servicios externos, setup instructions, variables de entorno requeridas
  - Crear `.env.example` con todas las variables de `backend/config.js` (sin valores reales)
  - Crear `docs/setup.md` con pasos detallados: clonar, instalar dependencias (backend + frontend), configurar .env, ejecutar migración DB, iniciar servidores
  - Agregar `docs/arquitectura.md` con diagrama de servicios y flujo de datos
  - Agregar `docs/api-externa.md` documentando los contratos de los 4 servicios externos que consume el Carrito

  **Must NOT do**:
  - NO incluir credenciales reales en ningún archivo
  - NO modificar código fuente
  - NO crear archivos fuera de raíz y docs/

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 0 (with T1, T2, T4, T5, T6, T7)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `AGENTS.md` — Arquitectura y convenciones ya documentadas
  - `backend/config.js` — Variables de entorno para .env.example
  - `backend/AGENTS.md` — Detalles de backend
  - `frontend/AGENTS.md` — Detalles de frontend

  **Acceptance Criteria**:
  - [ ] `README.md` tiene descripción, arquitectura, setup, y tabla de variables
  - [ ] `.env.example` lista TODAS las variables de config.js
  - [ ] `docs/setup.md` permite a un dev nuevo levantar el proyecto en <15 min
  - [ ] `docs/arquitectura.md` incluye diagrama ASCII de servicios
  - [ ] `docs/api-externa.md` documenta los 4 servicios externos

  **QA Scenarios**:

  ```
  Scenario: Setup docs are complete and followable
    Tool: Bash
    Preconditions: Clean state
    Steps:
      1. Read docs/setup.md
      2. Verify it includes: git clone, npm install (both dirs), .env setup, DB migration, npm run dev
      3. Read .env.example
      4. Count env vars — verify matches backend/config.js (AUTH_SERVICE_URL, PRODUCTOS_SERVICE_URL, PAGOS_SERVICE_URL, PAGOS_WEBHOOK_SECRET, DB_*, TU_LOCAL_URL)
    Expected Result: All files present with complete content
    Evidence: .sisyphus/evidence/task-3-docs.txt
  ```

  **Commit**: YES
  - Message: `docs: add README, .env.example, and setup documentation`
  - Files: `README.md`, `.env.example`, `docs/setup.md`, `docs/arquitectura.md`, `docs/api-externa.md`

- [x] 4. Extender productosClient

  **What to do**:
  - Agregar método `verificarStock(productoId)` → GET a Catálogo para obtener stock actual
  - Agregar método `getProducto(productoId)` → GET a Catálogo para obtener precio actual y datos
  - Agregar método `deducirStock(productoId, cantidad)` → POST a Catálogo para descontar stock
  - Agregar método `getRecommendations(userId, limit)` → GET a Catálogo para recomendaciones
  - Cada método debe manejar errores de red (timeout 5s, reintento 1 vez)
  - Escribir tests: `backend/__tests__/productosClient.test.js` con mocks para cada método
  - Mantener compatibilidad con método `getProductos()` existente

  **Must NOT do**:
  - NO modificar la firma de `getProductos()` existente
  - NO implementar lógica de negocio — solo wrappers HTTP
  - NO hardcodear URLs — usar `config.js`

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `["nodejs-backend-patterns"]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 0 (with T1, T2, T3, T5, T6, T7)
  - **Blocks**: T8, T9, T10, T15, T22
  - **Blocked By**: None

  **References**:
  - `backend/services/productosClient.js` — Método getProductos() existente como patrón
  - `backend/services/authClient.js` — Patrón de manejo de errores HTTP
  - `backend/config.js` — PRODUCTOS_SERVICE_URL

  **Acceptance Criteria**:
  - [ ] `productosClient.verificarStock('prod-1')` retorna `{ producto_id, stock }`
  - [ ] `productosClient.getProducto('prod-1')` retorna `{ id, nombre, precio, stock }`
  - [ ] `productosClient.deducirStock('prod-1', 2)` retorna `{ success, nuevo_stock }`
  - [ ] `productosClient.getRecommendations('user-1', 4)` retorna array de productos
  - [ ] Todos los métodos lanzan error descriptivo en fallo de red
  - [ ] `npx jest backend/__tests__/productosClient.test.js` → todos los tests pasan

  **QA Scenarios**:

  ```
  Scenario: verificarStock returns stock for valid product
    Tool: Bash (node REPL)
    Preconditions: Catálogo mock running
    Steps:
      1. node -e "
         const { verificarStock } = require('./backend/services/productosClient');
         verificarStock('prod-1').then(r => console.log(JSON.stringify(r)));
         "
      2. Assert output contains "producto_id" and "stock" fields
    Expected Result: Stock data returned with correct fields
    Evidence: .sisyphus/evidence/task-4-verificar-stock.txt

  Scenario: verificarStock throws on network error
    Tool: Bash (node REPL)
    Preconditions: Catálogo service DOWN
    Steps:
      1. Set PRODUCTOS_SERVICE_URL to invalid URL
      2. Call verificarStock('prod-1')
      3. Assert error is thrown with descriptive message
    Expected Result: Error thrown, not silent failure
    Evidence: .sisyphus/evidence/task-4-verificar-stock-error.txt
  ```

  **Commit**: YES
  - Message: `feat(backend): extend productosClient with stock, product detail, deduction, and recommendations`
  - Files: `backend/services/productosClient.js`, `backend/__tests__/productosClient.test.js`

- [x] 5. Crear notificacionesPedidosClient

  **What to do**:
  - Crear `backend/services/notificacionesPedidosClient.js`
  - Método `notificarPedidoCreado(pedidoData)` → POST a NOTIFICACIONES-PEDIDOS con datos del pedido
  - Método `notificarCambioEstado(pedidoId, nuevoEstado, metadata)` → POST para notificar cambio de estado
  - Método `notificarCancelacion(pedidoId, motivo)` → POST para notificar cancelación
  - Método `notificarReembolso(pedidoId, monto, referencia)` → POST para notificar reembolso
  - Cada método: timeout 5s, reintento 1 vez, errores descriptivos
  - Usar `config.js` para `NOTIFICACIONES_SERVICE_URL`
  - Agregar `NOTIFICACIONES_SERVICE_URL` a `backend/config.js` con default `http://localhost:4003`
  - Tests: `backend/__tests__/notificacionesPedidosClient.test.js` con mocks

  **Must NOT do**:
  - NO hardcodear URLs
  - NO modificar otros service clients

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `["nodejs-backend-patterns"]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 0 (with T1, T2, T3, T4, T6, T7)
  - **Blocks**: T15
  - **Blocked By**: None

  **References**:
  - `backend/services/pagosClient.js` — Patrón de service client (HTTP wrapper, error handling)
  - `backend/config.js` — Variables de entorno existentes (patrón a seguir)

  **Acceptance Criteria**:
  - [ ] `notificacionesPedidosClient.notificarPedidoCreado({...})` funciona
  - [ ] `notificacionesPedidosClient.notificarCambioEstado(...)` funciona
  - [ ] `notificacionesPedidosClient.notificarCancelacion(...)` funciona
  - [ ] `notificacionesPedidosClient.notificarReembolso(...)` funciona
  - [ ] `npx jest backend/__tests__/notificacionesPedidosClient.test.js` → PASS

  **QA Scenarios**:

  ```
  Scenario: notificarPedidoCreado sends correct payload
    Tool: Bash (curl + node)
    Preconditions: Mock NOTIFICACIONES server running
    Steps:
      1. node -e "
         const client = require('./backend/services/notificacionesPedidosClient');
         client.notificarPedidoCreado({ pedidoId: 'uuid-1', userId: 5, total: 150000 })
           .then(r => console.log(JSON.stringify(r)));
         "
      2. Assert response contains success confirmation
    Expected Result: Notification sent successfully
    Evidence: .sisyphus/evidence/task-5-notificar-creado.txt
  ```

  **Commit**: YES
  - Message: `feat(backend): create notificacionesPedidosClient for order notification service`
  - Files: `backend/services/notificacionesPedidosClient.js`, `backend/config.js`, `backend/__tests__/notificacionesPedidosClient.test.js`

- [x] 6. Alinear estados de transacción (DB + código)

  **What to do**:
  - Identificar todos los lugares donde se usan estados de transacción en el código
  - Mapeo actual: DB usa `PENDIENTE/APROBADA/RECHAZADA`, código usa `pendiente/pagado/cancelado/fallido`
  - Decisión: unificar a los estados de la DB (`PENDIENTE`, `APROBADA`, `RECHAZADA`) en mayúsculas
  - Actualizar `backend/routes/checkout.js` — cambiar estados al mapeo canónico
  - Actualizar `backend/routes/webhook.js` — cambiar estados al mapeo canónico
  - Actualizar `backend/routes/transacciones.js` — cambiar estados al mapeo canónico
  - Agregar validación de estados permitidos con constante `ESTADOS_VALIDOS`
  - Agregar tests: `backend/__tests__/transaccion-estados.test.js`
  - Si se necesitan nuevos estados (`PROCESANDO`, `ENVIADO`, `ENTREGADO`, `CANCELADO`), crear migración SQL

  **Must NOT do**:
  - NO eliminar estados sin migración si cambia el esquema
  - NO romper el webhook de pago existente
  - NO cambiar la lógica de negocio, solo alinear nombres

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `["nodejs-backend-patterns"]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 0 (with T1, T2, T3, T4, T5, T7)
  - **Blocks**: T14, T16
  - **Blocked By**: None

  **References**:
  - `database/migrations/001_add_carrito_and_fix_transacciones.sql` — Estados definidos en DB
  - `backend/routes/webhook.js` — Mapeo actual de estados
  - `backend/routes/checkout.js` — Creación de transacción
  - `backend/routes/transacciones.js` — Gestión de estados

  **Acceptance Criteria**:
  - [ ] Todos los archivos usan `PENDIENTE`, `APROBADA`, `RECHAZADA` (mayúsculas, consistentes)
  - [ ] No existen strings `pendiente`, `pagado`, `cancelado`, `fallido` como estados en el código
  - [ ] `npx jest backend/__tests__/transaccion-estados.test.js` → PASS

  **QA Scenarios**:

  ```
  Scenario: Webhook processes pago.confirmado with correct state
    Tool: Bash (curl)
    Preconditions: Backend running, valid webhook secret
    Steps:
      1. curl -X POST http://localhost:3000/api/webhook/pago-confirmado
         -H "Content-Type: application/json"
         -H "x-webhook-signature: VALID_SIG"
         -d '{"evento":"pago.confirmado","transaccion_id":"uuid-123"}'
      2. Assert response status is 200
      3. Check DB: transacción state is "APROBADA"
    Expected Result: Transacción actualizada a APROBADA
    Evidence: .sisyphus/evidence/task-6-estados-webhook.txt
  ```

  **Commit**: YES
  - Message: `fix(backend): align transaction states to canonical DB values (PENDIENTE/APROBADA/RECHAZADA)`
  - Files: `backend/routes/checkout.js`, `backend/routes/webhook.js`, `backend/routes/transacciones.js`, `backend/__tests__/transaccion-estados.test.js`

- [x] 7. Tabla + API de direcciones (HU-CART-11)

  **What to do**:
  - Crear migración `database/migrations/002_direcciones.sql`:
    - Tabla `direcciones` con: id UUID PK, usuario_id INT FK, alias VARCHAR(50), calle VARCHAR(200), ciudad VARCHAR(100), departamento VARCHAR(100), codigo_postal VARCHAR(20), predeterminada BOOLEAN DEFAULT false, created_at, updated_at
    - Trigger para updated_at
    - Restricción: máximo 5 direcciones por usuario
  - Crear `backend/routes/direcciones.js` (factory pattern: `(pool, verificarToken) => router`)
  - Endpoints:
    - `GET /api/direcciones` — listar direcciones del usuario
    - `POST /api/direcciones` — crear dirección con validación de campos
    - `PATCH /api/direcciones/:id` — actualizar dirección
    - `DELETE /api/direcciones/:id` — eliminar dirección
    - `PATCH /api/direcciones/:id/predeterminada` — marcar como predeterminada (desmarca las demás)
  - Validar: máximo 5 direcciones, campos obligatorios (alias, calle, ciudad, departamento)
  - Registrar ruta en `backend/server.js`
  - Tests: `backend/__tests__/direcciones.test.js`

  **Must NOT do**:
  - NO permitir más de 5 direcciones por usuario
  - NO permitir eliminar la única dirección si es predeterminada
  - NO exponer direcciones de otros usuarios

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `["nodejs-backend-patterns"]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 0 (with T1, T2, T3, T4, T5, T6)
  - **Blocks**: None (feature independiente)
  - **Blocked By**: None

  **References**:
  - `backend/routes/carrito.js` — Patrón de ruta factory con validación
  - `database/migrations/001_add_carrito_and_fix_transacciones.sql` — Patrón de migración (UUID, triggers)
  - `backend/server.js` — Registro de rutas existentes

  **Acceptance Criteria**:
  - [ ] Migración `002_direcciones.sql` ejecuta sin errores
  - [ ] `POST /api/direcciones` crea dirección con validación de campos
  - [ ] `GET /api/direcciones` lista solo direcciones del usuario autenticado
  - [ ] `PATCH /api/direcciones/:id/predeterminada` marca una y desmarca las demás
  - [ ] Error 400 al exceder 5 direcciones
  - [ ] `npx jest backend/__tests__/direcciones.test.js` → PASS

  **QA Scenarios**:

  ```
  Scenario: Create address with valid data
    Tool: Bash (curl)
    Preconditions: Backend running, valid JWT
    Steps:
      1. curl -X POST http://localhost:3000/api/direcciones
         -H "Authorization: Bearer VALID_JWT"
         -H "Content-Type: application/json"
         -d '{"alias":"Casa","calle":"Calle 123 #45-67","ciudad":"Bogotá","departamento":"Cundinamarca","codigo_postal":"110111"}'
      2. Assert status 201
      3. Assert response.id is UUID format
      4. Assert response.predeterminada is true (first address)
    Expected Result: Address created, auto-set as default
    Evidence: .sisyphus/evidence/task-7-crear-direccion.txt

  Scenario: Reject 6th address
    Tool: Bash (curl)
    Preconditions: User already has 5 addresses
    Steps:
      1. Attempt POST /api/direcciones (6th address)
      2. Assert status 400
      3. Assert response.error contains "máximo 5"
    Expected Result: Error 400, max 5 addresses enforced
    Evidence: .sisyphus/evidence/task-7-max-direcciones.txt
  ```

  **Commit**: YES
  - Message: `feat(backend): add address management (table, migration, CRUD API) for CART-11`
  - Files: `database/migrations/002_direcciones.sql`, `backend/routes/direcciones.js`, `backend/server.js`, `backend/__tests__/direcciones.test.js`

- [x] 8. CART-01: Stock validation on add to cart

  **What to do**:
  - Modificar `backend/routes/carrito.js` POST /api/carrito:
    - Antes del INSERT, llamar `productosClient.verificarStock(producto_id)`
    - Si stock = 0 → responder 409 `{ error: "Producto sin stock disponible" }`
    - Si stock > 0 pero menor que cantidad solicitada → responder 409 `{ error: "Stock insuficiente", disponible: N }`
    - Si Catálogo no responde → responder 502 `{ error: "Servicio de catálogo no disponible" }` (sin romper sesión)
  - Agregar test de integración con mock de productosClient
  - Tests: `backend/__tests__/carrito-stock.test.js`

  **Must NOT do**:
  - NO modificar la lógica de upsert existente
  - NO llamar a Catálogo directamente (usar productosClient)
  - NO bloquear el carrito si Catálogo falla en GET normal (solo en POST)

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `["nodejs-backend-patterns"]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T9, T10)
  - **Blocks**: T11, T12
  - **Blocked By**: T4

  **References**:
  - `backend/routes/carrito.js:POST /` — Endpoint actual de agregar al carrito
  - `backend/services/productosClient.js:verificarStock()` — Método creado en T4
  - `backend/routes/webhook.js` — Patrón de manejo de errores de servicios externos

  **Acceptance Criteria**:
  - [ ] Agregar producto con stock > 0 → 200, producto en carrito
  - [ ] Agregar producto con stock = 0 → 409, "Producto sin stock disponible"
  - [ ] Agregar cantidad > stock → 409, "Stock insuficiente" con disponible
  - [ ] Catálogo caído → 502, "Servicio de catálogo no disponible"
  - [ ] `npx jest backend/__tests__/carrito-stock.test.js` → PASS

  **QA Scenarios**:

  ```
  Scenario: Add product with available stock
    Tool: Bash (curl)
    Preconditions: Backend running, valid JWT, Catálogo returns stock=10
    Steps:
      1. curl -X POST http://localhost:3000/api/carrito
         -H "Authorization: Bearer VALID_JWT"
         -H "Content-Type: application/json"
         -d '{"producto_id":"prod-1","producto_nombre":"Laptop","precio_unitario":2500000,"cantidad":2}'
      2. Assert status 200 or 201
      3. Assert response contains producto_id "prod-1"
    Expected Result: Product added to cart
    Evidence: .sisyphus/evidence/task-8-add-stock-ok.txt

  Scenario: Add product with zero stock
    Tool: Bash (curl)
    Preconditions: Backend running, Catálogo returns stock=0
    Steps:
      1. curl -X POST http://localhost:3000/api/carrito
         -H "Authorization: Bearer VALID_JWT"
         -H "Content-Type: application/json"
         -d '{"producto_id":"prod-agotado","producto_nombre":"Agotado","precio_unitario":100,"cantidad":1}'
      2. Assert status 409
      3. Assert response.error contains "sin stock"
    Expected Result: Error 409, stock unavailable
    Evidence: .sisyphus/evidence/task-8-add-stock-zero.txt
  ```

  **Commit**: YES
  - Message: `feat(backend): add stock validation on cart add (CART-01)`
  - Files: `backend/routes/carrito.js`, `backend/__tests__/carrito-stock.test.js`

- [x] 9. CART-02: Increase/decrease with stock limits

  **What to do**:
  - Modificar `PATCH /api/carrito/:producto_id`:
    - Al aumentar (+): validar que nueva cantidad ≤ stock actual de Catálogo (llamar `verificarStock`)
    - Si excede stock → 409 `{ error: "No puedes agregar más unidades. Stock disponible: N" }`
    - Al disminuir (−): si cantidad llega a 0, eliminar automáticamente el ítem
  - Modificar `DELETE /api/carrito/:producto_id`: sin cambios (ya existe)
  - Frontend: `frontend/js/carrito.js` — mostrar mensaje de error cuando se excede stock
  - Tests: `backend/__tests__/carrito-quantity.test.js`

  **Must NOT do**:
  - NO eliminar ítem sin confirmación cuando cantidad = 0 (solo en backend)
  - NO permitir cantidades negativas

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `["nodejs-backend-patterns"]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T8, T10)
  - **Blocks**: T11
  - **Blocked By**: T4, T8

  **References**:
  - `backend/routes/carrito.js:PATCH /:producto_id` — Endpoint actual de modificar cantidad
  - `backend/services/productosClient.js:verificarStock()` — Creado en T4
  - `frontend/js/carrito.js` — Funciones actualizarCantidad, eliminarDelCarrito

  **Acceptance Criteria**:
  - [ ] Aumentar cantidad dentro del stock → 200, cantidad actualizada
  - [ ] Aumentar cantidad > stock → 409, error con stock disponible
  - [ ] Disminuir a 0 → ítem eliminado del carrito
  - [ ] `npx jest backend/__tests__/carrito-quantity.test.js` → PASS

  **QA Scenarios**:

  ```
  Scenario: Decrease quantity to zero removes item
    Tool: Bash (curl)
    Preconditions: Product in cart with cantidad=1
    Steps:
      1. curl -X PATCH http://localhost:3000/api/carrito/prod-1
         -H "Authorization: Bearer VALID_JWT"
         -d '{"cantidad":0}'
      2. Assert status 200
      3. GET /api/carrito → assert product is NOT in list
    Expected Result: Item removed when quantity reaches 0
    Evidence: .sisyphus/evidence/task-9-decrease-zero.txt

  Scenario: Increase quantity beyond stock limit
    Tool: Bash (curl)
    Preconditions: Product in cart with cantidad=1, stock=3
    Steps:
      1. curl -X PATCH http://localhost:3000/api/carrito/prod-1
         -H "Authorization: Bearer VALID_JWT"
         -d '{"cantidad":5}'
      2. Assert status 409
      3. Assert response.error contains "Stock disponible: 3"
    Expected Result: Error 409, stock limit enforced
    Evidence: .sisyphus/evidence/task-9-increase-limit.txt
  ```

  **Commit**: YES
  - Message: `feat(backend): add stock limit enforcement on cart quantity changes (CART-02)`
  - Files: `backend/routes/carrito.js`, `frontend/js/carrito.js`, `backend/__tests__/carrito-quantity.test.js`

- [x] 10. CART-03: Cart summary with live Catálogo pricing

  **What to do**:
  - Modificar `GET /api/carrito`:
    - Para cada ítem del carrito, llamar `productosClient.getProducto(producto_id)` para obtener precio actual
    - Calcular subtotal por producto: `precio_actual × cantidad`
    - Calcular costo de envío (por ahora: envío fijo `$15,000` o gratuito si total > `$200,000`)
    - Calcular total final: `suma_subtotales + costo_envio`
  - Modificar `GET /api/carrito/datos-pago`:
    - Incluir desglose: subtotales por ítem, envío, total
  - Frontend: `frontend/js/carrito.js` — actualizar `mostrarCarrito()` para mostrar precios en tiempo real
  - Tests: `backend/__tests__/carrito-summary.test.js`

  **Must NOT do**:
  - NO almacenar precios en la tabla carrito (se consultan en tiempo real)
  - NO modificar el esquema de respuesta sin mantener compatibilidad

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `["nodejs-backend-patterns"]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T8, T9)
  - **Blocks**: T11, T12
  - **Blocked By**: T4

  **References**:
  - `backend/routes/carrito.js:GET /` — Endpoint actual de listar carrito
  - `backend/services/productosClient.js:getProducto()` — Creado en T4
  - `frontend/js/carrito.js:mostrarCarrito()` — Renderizado del carrito

  **Acceptance Criteria**:
  - [ ] GET /api/carrito retorna `items[]`, `subtotal`, `envio`, `total`
  - [ ] Cada item incluye `precio_actual` (desde Catálogo), `subtotal`
  - [ ] Envío = $0 si total > $200,000; $15,000 en caso contrario
  - [ ] Frontend muestra precios actualizados sin recargar
  - [ ] `npx jest backend/__tests__/carrito-summary.test.js` → PASS

  **QA Scenarios**:

  ```
  Scenario: Cart summary calculates totals correctly
    Tool: Bash (curl)
    Preconditions: 2 items in cart, Catálogo returns prices
    Steps:
      1. curl -X GET http://localhost:3000/api/carrito
         -H "Authorization: Bearer VALID_JWT"
      2. Assert response has items (array length 2)
      3. Assert response.subtotal = sum of (item.precio_actual * item.cantidad)
      4. Assert response.total = response.subtotal + response.envio
    Expected Result: Totals calculated correctly
    Evidence: .sisyphus/evidence/task-10-summary-totals.txt
  ```

  **Commit**: YES
  - Message: `feat(backend): add live Catálogo pricing to cart summary (CART-03)`
  - Files: `backend/routes/carrito.js`, `frontend/js/carrito.js`, `backend/__tests__/carrito-summary.test.js`

- [x] 11. CART-04: Login redirect for unauthenticated users at checkout

  **What to do**:
  - Frontend: `frontend/js/checkout.js` (nuevo archivo)
  - Función `procederAlPago()`:
    - Verificar `isLoggedIn()` → si false, redirigir a `login.html?redirect=checkout`
    - Guardar carrito actual en localStorage antes de redirigir
  - Modificar `frontend/js/auth.js` `procesarAuthCallback()`:
    - Si URL tiene `?redirect=checkout`, después de login redirigir a resumen del carrito
    - Recuperar carrito guardado y fusionar si es necesario
  - Frontend: `frontend/pages/carrito.html` — botón "Proceder al pago" llama a `procederAlPago()`

  **Must NOT do**:
  - NO perder ítems del carrito durante la redirección
  - NO modificar el flujo de login existente, solo extender

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `["nodejs-backend-patterns"]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T12, T13)
  - **Blocks**: T12
  - **Blocked By**: T8, T10

  **References**:
  - `frontend/js/auth.js:procesarAuthCallback()` — Flujo post-login existente
  - `frontend/js/auth.js:isLoggedIn()`, `getCarritoKey()` — Funciones de auth
  - `frontend/pages/login.html` — Página de login

  **Acceptance Criteria**:
  - [ ] Usuario no autenticado hace clic en "Proceder al pago" → redirigido a login
  - [ ] Después de login exitoso → redirigido de vuelta al carrito
  - [ ] Carrito conserva todos los ítems después del ciclo login→carrito
  - [ ] Usuario autenticado va directo al checkout (sin redirección)

  **QA Scenarios**:

  ```
  Scenario: Guest redirected to login on checkout attempt
    Tool: Playwright
    Preconditions: Not logged in, items in guest cart
    Steps:
      1. Navigate to carrito.html
      2. Click button "Proceder al pago"
      3. Assert URL contains "login.html"
      4. Assert URL contains "redirect=checkout"
    Expected Result: Redirected to login with redirect param
    Evidence: .sisyphus/evidence/task-11-redirect-login.png

  Scenario: After login, returns to cart with items preserved
    Tool: Playwright
    Preconditions: Guest cart has items, login page with redirect=checkout
    Steps:
      1. Login with valid credentials
      2. Assert redirected to carrito page
      3. Assert cart items are present (same count as before login)
    Expected Result: Cart items preserved after login
    Evidence: .sisyphus/evidence/task-11-cart-preserved.png
  ```

  **Commit**: YES
  - Message: `feat(frontend): add login redirect for unauthenticated checkout (CART-04)`
  - Files: `frontend/js/checkout.js`, `frontend/js/auth.js`, `frontend/pages/carrito.html`

- [x] 12. CART-05: Checkout — redirect to Pasarela

  **What to do**:
  - Mejorar `backend/routes/checkout.js` POST /api/checkout/iniciar:
    - Validar que el carrito no está vacío
    - Validar stock actual de todos los ítems (revalidación al confirmar)
    - Si algún ítem sin stock → 409 con lista de ítems problemáticos
    - Construir `datosCheckout` con: ítems (nombre, cantidad, precio_actual), subtotal, envío, total, user_id, email
    - Llamar `pagosClient.crearCheckout(datosCheckout)` → obtener URL de pago
    - Guardar transacción con estado PENDIENTE
    - Responder con `{ checkout_url: "https://pasarela.com/pagar/..." }` (NO formulario de tarjeta)
  - Frontend: `frontend/js/checkout.js`:
    - `iniciarCheckout()` → POST /api/checkout/iniciar → recibir URL → `window.location.href = url`
  - Tests: `backend/__tests__/checkout-iniciar.test.js`

  **Must NOT do**:
  - NO crear formulario de tarjeta de crédito
  - NO recibir datos de tarjeta en el backend
  - NO almacenar datos de pago

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `["nodejs-backend-patterns"]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T11, T13)
  - **Blocks**: T14, T23
  - **Blocked By**: T8, T10, T11

  **References**:
  - `backend/routes/checkout.js` — Endpoint actual de checkout
  - `backend/services/pagosClient.js:crearCheckout()` — Cliente de pagos existente
  - `backend/services/productosClient.js:verificarStock()` — Creado en T4

  **Acceptance Criteria**:
  - [ ] POST /api/checkout/iniciar con carrito válido → 200, `{ checkout_url }`
  - [ ] POST con carrito vacío → 400, "Carrito vacío"
  - [ ] POST con ítem sin stock → 409, lista de ítems sin stock
  - [ ] Transacción creada con estado PENDIENTE
  - [ ] `npx jest backend/__tests__/checkout-iniciar.test.js` → PASS

  **QA Scenarios**:

  ```
  Scenario: Successful checkout creates transaction and returns payment URL
    Tool: Bash (curl)
    Preconditions: Cart has items with stock, valid JWT
    Steps:
      1. curl -X POST http://localhost:3000/api/checkout/iniciar
         -H "Authorization: Bearer VALID_JWT"
         -H "Content-Type: application/json"
         -d '{}'
      2. Assert status 200
      3. Assert response.checkout_url starts with "http"
      4. Assert DB has transacción with estado PENDIENTE
    Expected Result: Payment URL returned, transaction created
    Evidence: .sisyphus/evidence/task-12-checkout-ok.txt

  Scenario: Checkout with empty cart returns error
    Tool: Bash (curl)
    Preconditions: Empty cart
    Steps:
      1. curl -X POST http://localhost:3000/api/checkout/iniciar
         -H "Authorization: Bearer VALID_JWT"
      2. Assert status 400
      3. Assert response.error contains "vacío"
    Expected Result: Error 400 for empty cart
    Evidence: .sisyphus/evidence/task-12-checkout-empty.txt
  ```

  **Commit**: YES
  - Message: `feat(backend): implement checkout flow with stock revalidation and Pasarela redirect (CART-05)`
  - Files: `backend/routes/checkout.js`, `frontend/js/checkout.js`, `backend/__tests__/checkout-iniciar.test.js`

- [x] 13. CART-06: Payment confirmation page

  **What to do**:
  - Crear `frontend/pages/confirmacion.html` con:
    - Número de pedido (UUID)
    - Lista de productos comprados (nombre, cantidad, precio)
    - Total cobrado
    - Mensaje "Notificación enviada a tu correo"
    - Botón "Ver mis pedidos" → `pedidos.html`
    - Botón "Seguir comprando" → `index.html`
  - Frontend: `frontend/js/confirmacion.js`:
    - Leer `pedido_id` de URL params: `/confirmacion.html?pedido=UUID`
    - GET /api/pedidos/:id para obtener datos del pedido
    - Renderizar con los datos
  - La URL es accesible vía `/pedido/{id}/confirmacion` (frontend routing)
  - Si el pago falló, NO se muestra confirmación (se redirige a flujo de error)
  - Estilo visual: checkout exitoso con checkmark verde grande

  **Must NOT do**:
  - NO mostrar datos de tarjeta ni información sensible
  - NO permitir acceso si no hay pedido_id válido

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `["frontend-design"]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T11, T12)
  - **Blocks**: T25
  - **Blocked By**: T12

  **References**:
  - `frontend/pages/pago.html` — Patrón de página existente
  - `frontend/css/styles.css` — Estilos existentes

  **Acceptance Criteria**:
  - [ ] Página muestra número de pedido, productos, total
  - [ ] URL `/confirmacion.html?pedido=UUID` carga los datos correctos
  - [ ] Diseño responsive con checkmark verde
  - [ ] Botones "Ver mis pedidos" y "Seguir comprando" funcionan

  **QA Scenarios**:

  ```
  Scenario: Confirmation page displays order details
    Tool: Playwright
    Preconditions: Valid pedido_id in URL
    Steps:
      1. Navigate to /confirmacion.html?pedido=VALID-UUID
      2. Assert page contains "¡Pago exitoso!" or similar
      3. Assert page contains order number (UUID format)
      4. Assert page contains product list and total
      5. Screenshot the page
    Expected Result: Full order confirmation displayed
    Evidence: .sisyphus/evidence/task-13-confirmacion.png
  ```

  **Commit**: YES
  - Message: `feat(frontend): add payment confirmation page with order summary (CART-06)`
  - Files: `frontend/pages/confirmacion.html`, `frontend/js/confirmacion.js`, `frontend/css/styles.css`

- [x] 14. CART-07: Persist order on payment confirmation

  **What to do**:
  - Modificar `backend/routes/webhook.js` POST /pago-confirmado:
    - Después de verificar firma y confirmar pago
    - Crear registro en tabla `pedidos` (nueva tabla) con:
      - id UUID v4, usuario_id, estado='Pendiente', items (JSONB), monto_total, direccion_envio_id, created_at
    - Si hay error de BD → rollback + notificar a Pasarela para reembolso preventivo
  - Crear `backend/routes/pedidos.js` (factory pattern):
    - `GET /api/pedidos` — listar pedidos del usuario
    - `GET /api/pedidos/:id` — detalle de pedido
    - `PATCH /api/pedidos/:id/estado` — cambiar estado (vendedor/sistema)
  - Crear migración `database/migrations/003_pedidos.sql`:
    - Tabla `pedidos`: id UUID PK, usuario_id INT FK, estado VARCHAR(20) CHECK, items JSONB, monto_total DECIMAL(12,2), direccion_envio_id UUID FK, transaccion_id UUID FK, created_at, updated_at
    - Estados permitidos: Pendiente, Procesando, Enviado, Entregado, Cancelado
  - Registrar ruta en `backend/server.js`
  - Tests: `backend/__tests__/pedidos.test.js`

  **Must NOT do**:
  - NO usar ID autoincremental para pedidos (UUID v4)
  - NO eliminar pedidos — solo cambio de estado
  - NO permitir transiciones de estado inválidas (ej. Entregado → Pendiente)

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `["nodejs-backend-patterns"]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T15, T16)
  - **Blocks**: T15, T17, T18, T20, T21, T23, T24
  - **Blocked By**: T12, T6

  **References**:
  - `backend/routes/webhook.js` — Flujo de confirmación de pago existente
  - `database/migrations/001_add_carrito_and_fix_transacciones.sql` — Patrón de migración
  - `backend/routes/carrito.js` — Patrón de ruta factory

  **Acceptance Criteria**:
  - [ ] Webhook pago-confirmado crea pedido en BD con UUID, estado Pendiente, items, total
  - [ ] GET /api/pedidos lista pedidos del usuario autenticado
  - [ ] GET /api/pedidos/:id retorna detalle con ítems y total
  - [ ] Error de BD en webhook → rollback, no se crea pedido huérfano
  - [ ] `npx jest backend/__tests__/pedidos.test.js` → PASS

  **QA Scenarios**:

  ```
  Scenario: Payment webhook creates order
    Tool: Bash (curl)
    Preconditions: Valid webhook signature, existing transaction
    Steps:
      1. curl -X POST http://localhost:3000/api/webhook/pago-confirmado
         -H "Content-Type: application/json"
         -H "x-webhook-signature: VALID_SIG"
         -d '{"evento":"pago.confirmado","transaccion_id":"uuid-tx"}'
      2. Assert status 200
      3. Check DB: pedidos table has new row with estado "Pendiente"
    Expected Result: Order created with UUID
    Evidence: .sisyphus/evidence/task-14-order-created.txt

  Scenario: Order listing returns only user's orders
    Tool: Bash (curl)
    Preconditions: User has orders in DB
    Steps:
      1. curl -X GET http://localhost:3000/api/pedidos
         -H "Authorization: Bearer VALID_JWT"
      2. Assert status 200
      3. Assert response is array
      4. Assert all items have same usuario_id as JWT
    Expected Result: Only user's orders returned
    Evidence: .sisyphus/evidence/task-14-order-list.txt
  ```

  **Commit**: YES
  - Message: `feat(backend): add order persistence with pedidos table and CRUD API (CART-07)`
  - Files: `database/migrations/003_pedidos.sql`, `backend/routes/pedidos.js`, `backend/routes/webhook.js`, `backend/server.js`, `backend/__tests__/pedidos.test.js`

- [x] 15. CART-08: Notify Catálogo + Notificaciones on order creation

  **What to do**:
  - Modificar `backend/routes/webhook.js` POST /pago-confirmado (después de crear pedido en T14):
    - Por cada ítem del pedido: llamar `productosClient.deducirStock(producto_id, cantidad)`
    - Si deducirStock falla → registrar en cola de reintentos (tabla `eventos_pendientes`)
    - Llamar `notificacionesPedidosClient.notificarPedidoCreado(pedidoData)`
    - Si notificación falla → registrar en `eventos_pendientes` para reintento
    - El pedido permanece creado aunque fallen los externos (no rollback del pedido)
  - Crear `database/migrations/004_eventos_pendientes.sql`:
    - Tabla `eventos_pendientes`: id SERIAL, tipo VARCHAR(50), payload JSONB, intentos INT DEFAULT 0, max_intentos INT DEFAULT 5, estado VARCHAR(20) DEFAULT 'pendiente', created_at
  - Endpoint interno: `POST /api/eventos/reintentar` para procesar eventos pendientes
  - Tests: `backend/__tests__/order-notifications.test.js`

  **Must NOT do**:
  - NO hacer rollback del pedido si servicios externos fallan
  - NO bloquear la respuesta del webhook esperando reintentos
  - NO usar Kafka/RabbitMQ — solo tabla eventos_pendientes

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `["nodejs-backend-patterns"]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T14, T16)
  - **Blocks**: T24
  - **Blocked By**: T5, T14

  **References**:
  - `backend/routes/webhook.js` — Flujo de confirmación (modificar)
  - `backend/services/productosClient.js:deducirStock()` — Creado en T4
  - `backend/services/notificacionesPedidosClient.js` — Creado en T5

  **Acceptance Criteria**:
  - [ ] Pago confirmado → stock descontado en Catálogo
  - [ ] Pago confirmado → notificación enviada a Notificaciones-Pedidos
  - [ ] Fallo de Catálogo → evento registrado en eventos_pendientes, pedido sigue creado
  - [ ] Fallo de Notificaciones → evento registrado, pedido sigue creado
  - [ ] `npx jest backend/__tests__/order-notifications.test.js` → PASS

  **QA Scenarios**:

  ```
  Scenario: Successful order triggers stock deduction and notification
    Tool: Bash (curl)
    Preconditions: Mock Catálogo and Notificaciones running
    Steps:
      1. Send webhook pago-confirmado
      2. Assert status 200
      3. Verify Catálogo received POST /stock/descontar for each item
      4. Verify Notificaciones received POST /notificar
    Expected Result: Both external services called
    Evidence: .sisyphus/evidence/task-15-notify-success.txt

  Scenario: Catálogo failure records pending event
    Tool: Bash (curl)
    Preconditions: Catálogo service DOWN
    Steps:
      1. Send webhook pago-confirmado
      2. Assert status 200 (pedido created despite Catálogo failure)
      3. Check eventos_pendientes table has row with tipo="deducir_stock"
    Expected Result: Event queued for retry
    Evidence: .sisyphus/evidence/task-15-pending-event.txt
  ```

  **Commit**: YES
  - Message: `feat(backend): add stock deduction and order notifications on payment confirmation (CART-08)`
  - Files: `backend/routes/webhook.js`, `database/migrations/004_eventos_pendientes.sql`, `backend/__tests__/order-notifications.test.js`

- [x] 16. CART-09: Transaction audit log

  **What to do**:
  - Mejorar `backend/routes/checkout.js` POST /api/checkout/iniciar:
    - Guardar en tabla `transacciones`: transaction_id (UUID), payment_reference (de Pasarela), amount, currency ('COP'), status, user_id, order_id (nullable hasta creación de pedido)
    - Campos adicionales: ip_address, user_agent para auditoría
  - Crear migración `database/migrations/005_transacciones_audit.sql`:
    - Agregar columnas faltantes a `transacciones`: payment_reference, currency DEFAULT 'COP', ip_address, user_agent
    - Agregar constraint: registros inmutables (revocar UPDATE/DELETE para rol aplicación, solo INSERT)
  - Endpoint: `GET /api/transacciones/:id` — detalle completo para auditoría
  - Tests: `backend/__tests__/transacciones-audit.test.js`

  **Must NOT do**:
  - NO almacenar datos de tarjeta (PAN, CVV, expiry)
  - NO permitir modificación de transacciones después de creadas
  - NO exponer transacciones de otros usuarios

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `["nodejs-backend-patterns"]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T14, T15)
  - **Blocks**: None
  - **Blocked By**: T6, T14

  **References**:
  - `backend/routes/transacciones.js` — Endpoints existentes de transacciones
  - `backend/routes/checkout.js` — Donde se crean transacciones
  - `database/migrations/001_add_carrito_and_fix_transacciones.sql` — Schema actual

  **Acceptance Criteria**:
  - [ ] Cada intento de pago crea registro inmutable en transacciones
  - [ ] Registro incluye: transaction_id, payment_reference, amount, currency, status, user_id, ip, user_agent
  - [ ] Transacciones fallidas se registran con status "RECHAZADA"
  - [ ] No se puede modificar una transacción después de creada
  - [ ] `npx jest backend/__tests__/transacciones-audit.test.js` → PASS

  **QA Scenarios**:

  ```
  Scenario: Failed payment creates immutable audit record
    Tool: Bash (curl)
    Preconditions: Backend running, Pasarela returns error
    Steps:
      1. Attempt checkout with failing payment
      2. Check DB: transacciones has record with status "RECHAZADA"
      3. Attempt UPDATE on that record → should fail (immutable)
    Expected Result: Failed transaction recorded, cannot be modified
    Evidence: .sisyphus/evidence/task-16-audit-immutable.txt
  ```

  **Commit**: YES
  - Message: `feat(backend): add immutable transaction audit log (CART-09)`
  - Files: `database/migrations/005_transacciones_audit.sql`, `backend/routes/checkout.js`, `backend/routes/transacciones.js`, `backend/__tests__/transacciones-audit.test.js`

- [x] 17. CART-10: Order tracking with status + WebSocket

  **What to do**:
  - Frontend: crear `frontend/pages/pedidos.html` y `frontend/js/pedidos.js`
    - `GET /api/pedidos` → listar pedidos ordenados por fecha descendente
    - Cada pedido muestra: ID, fecha, estado (con badge de color), total, N° de ítems
    - Estados con colores: Pendiente=amarillo, Procesando=azul, Enviado=naranja, Entregado=verde, Cancelado=rojo
    - Click en pedido → expande detalle con ítems y tracking
  - WebSocket: conectar a namespace `/pedidos`, room `usuario_{userId}`
    - Escuchar evento `pedido:estado-cambiado` → actualizar badge en tiempo real
  - Backend: al cambiar estado de pedido, emitir vía Socket.IO:
    - `io.of('/pedidos').to('usuario_{userId}').emit('pedido:estado-cambiado', { pedidoId, nuevoEstado })`
  - Tests: `backend/__tests__/pedidos-tracking.test.js`

  **Must NOT do**:
  - NO permitir que el cliente cambie su propio estado de pedido
  - NO emitir eventos a usuarios que no son dueños del pedido

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `["nodejs-backend-patterns"]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with T18, T19)
  - **Blocks**: T18, T25
  - **Blocked By**: T2, T14

  **References**:
  - `backend/server.js` — Socket.IO setup de T2
  - `frontend/js/carrito.js:mostrarCarrito()` — Patrón de renderizado de listas
  - `backend/routes/pedidos.js` — Creado en T14

  **Acceptance Criteria**:
  - [ ] Página "Mis Pedidos" lista pedidos con estados coloreados
  - [ ] Al cambiar estado → WebSocket actualiza badge en tiempo real
  - [ ] Click en pedido expande detalle
  - [ ] Sin pedidos → mensaje amigable con CTA
  - [ ] `npx jest backend/__tests__/pedidos-tracking.test.js` → PASS

  **QA Scenarios**:

  ```
  Scenario: Order list shows status badges with correct colors
    Tool: Playwright
    Preconditions: User has orders in different states
    Steps:
      1. Navigate to /pedidos.html
      2. Assert page shows order list
      3. Assert PENDIENTE badge has yellow color
      4. Assert ENTREGADO badge has green color
      5. Screenshot
    Expected Result: Status badges with correct colors
    Evidence: .sisyphus/evidence/task-17-status-badges.png

  Scenario: WebSocket updates order status in real time
    Tool: Playwright
    Preconditions: User viewing orders page, vendor changes order state
    Steps:
      1. Open pedidos.html
      2. Vendor changes order state via API
      3. Assert badge color changes within 3 seconds WITHOUT page reload
    Expected Result: Real-time status update via WebSocket
    Evidence: .sisyphus/evidence/task-17-websocket-update.png
  ```

  **Commit**: YES
  - Message: `feat(frontend+backend): add order tracking with status badges and WebSocket real-time updates (CART-10)`
  - Files: `frontend/pages/pedidos.html`, `frontend/js/pedidos.js`, `frontend/css/styles.css`, `backend/routes/pedidos.js`, `backend/__tests__/pedidos-tracking.test.js`

- [x] 18. VEND-01: Vendor panel + state machine

  **What to do**:
  - Asumir que LOGIN agrega `rol` y `vendor_id` al JWT. El Carrito solo lee estos campos.
  - Backend: `backend/routes/vendedor.js` (factory pattern)
    - Middleware: `verificarRol('vendedor')` — verifica `req.usuario.rol === 'vendedor'`
    - `GET /api/vendedor/pedidos` — lista pedidos que contienen productos del vendor (filtrar por vendor_id en items JSONB)
    - `PATCH /api/vendedor/pedidos/:id/estado` — cambiar estado con máquina de estados:
      - Pendiente → Procesando
      - Procesando → Enviado
      - Enviado → Entregado
      - Cancelado DESDE Pendiente o Procesando (no desde Enviado/Entregado)
    - Transiciones inválidas → 400 con flujo válido
    - Cada cambio registrado en `log_estados` (tabla de auditoría)
  - Frontend: `frontend/pages/vendedor.html` y `frontend/js/vendedor.js`
    - Panel simple: tabla de pedidos con selector de estado
    - Solo muestra pedidos con productos de ese vendor
  - WebSocket: al cambiar estado → emitir a room `vendedor_{vendorId}` y `usuario_{userId}`
  - Tests: `backend/__tests__/vendedor.test.js`

  **Must NOT do**:
  - NO crear sistema de roles — asumir que LOGIN ya lo provee
  - NO permitir que un vendedor vea pedidos de otros vendedores
  - NO permitir transiciones inválidas de estado

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `["nodejs-backend-patterns"]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with T17, T19)
  - **Blocks**: T25
  - **Blocked By**: T14, T17

  **References**:
  - `backend/routes/carrito.js:verificarToken` — Patrón de middleware de auth
  - `backend/routes/pedidos.js:PATCH /:id/estado` — Base para máquina de estados
  - `backend/server.js` — Socket.IO rooms para vendor

  **Acceptance Criteria**:
  - [ ] GET /api/vendedor/pedidos solo retorna pedidos con productos del vendor
  - [ ] PATCH estado con transición válida → 200, estado actualizado
  - [ ] PATCH estado con transición inválida → 400, mensaje con flujo válido
  - [ ] Cambio de estado → WebSocket notifica a usuario y vendor
  - [ ] `npx jest backend/__tests__/vendedor.test.js` → PASS

  **QA Scenarios**:

  ```
  Scenario: Vendor sees only their own products' orders
    Tool: Bash (curl)
    Preconditions: 2 vendors, each with products in different orders
    Steps:
      1. curl GET /api/vendedor/pedidos with vendor_1 JWT
      2. Assert all returned orders contain vendor_1's products
      3. Assert no order contains only vendor_2's products
    Expected Result: Filtered by vendor_id
    Evidence: .sisyphus/evidence/task-18-vendor-filter.txt

  Scenario: Invalid state transition rejected
    Tool: Bash (curl)
    Preconditions: Order in ENTREGADO state
    Steps:
      1. curl PATCH /api/vendedor/pedidos/:id/estado -d '{"estado":"Pendiente"}'
      2. Assert status 400
      3. Assert response.error describes valid transitions
    Expected Result: Invalid transition rejected
    Evidence: .sisyphus/evidence/task-18-invalid-transition.txt
  ```

  **Commit**: YES
  - Message: `feat(backend+frontend): add vendor panel with state machine and order management (VEND-01)`
  - Files: `backend/routes/vendedor.js`, `backend/server.js`, `frontend/pages/vendedor.html`, `frontend/js/vendedor.js`, `backend/__tests__/vendedor.test.js`

- [x] 19. CART-14: Cart persistence across sessions (30-day TTL)

  **What to do**:
  - Modificar `backend/routes/carrito.js`: agregar campo `ultima_actividad TIMESTAMP` a consultas
  - Crear job de limpieza (setInterval en server.js o script separado):
    - Cada 24 horas, eliminar carritos con `ultima_actividad < NOW() - INTERVAL '30 days'`
  - Al recuperar carrito tras login (GET /api/carrito):
    - Verificar stock actual de cada ítem (productosClient.verificarStock)
    - Si ítem sin stock → marcarlo como "No disponible" (campo `disponible: false`), sin eliminar
    - Frontend: mostrar ítems no disponibles en gris con opción de eliminar
  - Tests: `backend/__tests__/carrito-persistence.test.js`

  **Must NOT do**:
  - NO eliminar ítems sin stock automáticamente (solo marcar)
  - NO ejecutar limpieza en cada request (solo job programado)

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `["nodejs-backend-patterns"]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with T17, T18)
  - **Blocks**: None
  - **Blocked By**: T8

  **References**:
  - `backend/routes/carrito.js:GET /` — Endpoint de listar carrito
  - `backend/services/productosClient.js:verificarStock()` — Creado en T4
  - `frontend/js/carrito.js:mostrarCarrito()` — Renderizado

  **Acceptance Criteria**:
  - [ ] Carrito persiste entre sesiones (logout → login: mismos ítems)
  - [ ] Ítems sin stock aparecen como "No disponible"
  - [ ] Carritos inactivos > 30 días se limpian
  - [ ] `npx jest backend/__tests__/carrito-persistence.test.js` → PASS

  **QA Scenarios**:

  ```
  Scenario: Cart recovers after browser close and re-login
    Tool: Playwright
    Preconditions: User has items in cart, logged in
    Steps:
      1. Add items to cart
      2. Logout
      3. Close browser (simulate)
      4. Reopen, login
      5. Assert cart shows same items
    Expected Result: Cart persists across sessions
    Evidence: .sisyphus/evidence/task-19-cart-persistence.png

  Scenario: Out-of-stock items shown as unavailable
    Tool: Playwright
    Preconditions: Cart has item, Catálogo returns stock=0
    Steps:
      1. Login, view cart
      2. Assert item shows "No disponible" badge
      3. Assert item has option to remove
      4. Assert other items are NOT blocked
    Expected Result: Unavailable items marked, rest of cart functional
    Evidence: .sisyphus/evidence/task-19-unavailable-item.png
  ```

  **Commit**: YES
  - Message: `feat(backend+frontend): add cart persistence (30-day TTL) and out-of-stock handling (CART-14)`
  - Files: `backend/routes/carrito.js`, `backend/server.js`, `frontend/js/carrito.js`, `backend/__tests__/carrito-persistence.test.js`

---

### Wave 5: Historial, Direcciones, Facturación (Sprint 5/6 — after Wave 4)

- [x] 20. CART-11: Multiple shipping addresses (max 5 per user)

  **What to do**:
  - Crear migración `database/migrations/008_direcciones.sql`:
    - Tabla `direcciones`: id UUID PK, usuario_id INT FK, alias VARCHAR(50), calle TEXT, ciudad VARCHAR(100), departamento VARCHAR(100), codigo_postal VARCHAR(10), es_predeterminada BOOLEAN DEFAULT false, created_at TIMESTAMP
    - Constraint: max 5 direcciones por usuario (CHECK + trigger)
  - Crear `backend/routes/direcciones.js` — factory pattern:
    - `GET /api/direcciones` — listar direcciones del usuario
    - `POST /api/direcciones` — agregar dirección (validar campos requeridos)
    - `PUT /api/direcciones/:id` — editar dirección
    - `DELETE /api/direcciones/:id` — eliminar dirección
    - `PUT /api/direcciones/:id/predeterminada` — marcar como predeterminada (desmarca las demás)
  - Frontend: `frontend/pages/direcciones.html` — lista de direcciones con formulario de agregar/editar
  - Frontend: `frontend/js/direcciones.js` — lógica de CRUD y selección
  - Modificar `frontend/pages/pago.html` — selector visual de dirección en checkout
  - Tests: `backend/__tests__/direcciones.test.js`

  **Must NOT do**:
  - NO permitir más de 5 direcciones por usuario
  - NO permitir direcciones con campos vacíos
  - NO exponer direcciones de otros usuarios

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `["nodejs-backend-patterns"]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5 (with T21, T22)
  - **Blocks**: T13
  - **Blocked By**: None (T7 creó la base)

  **References**:
  - `backend/routes/carrito.js` — Patrón de ruta factory a seguir
  - `database/migrations/001_add_carrito_and_fix_transacciones.sql` — Estilo de migración SQL
  - `frontend/js/carrito.js` — Patrón de fetch autenticado para frontend

  **Acceptance Criteria**:
  - [ ] CRUD completo de direcciones funcional
  - [ ] Máximo 5 direcciones (POST rechaza la 6ta con 400)
  - [ ] Solo una dirección predeterminada a la vez
  - [ ] Campos requeridos validados: alias, calle, ciudad, departamento, codigo_postal
  - [ ] Selector de dirección visible en checkout
  - [ ] `npx jest backend/__tests__/direcciones.test.js` → PASS

  **QA Scenarios**:

  ```
  Scenario: Add address and set as default
    Tool: Bash (curl)
    Preconditions: Authenticated user, 0 addresses
    Steps:
      1. curl POST /api/direcciones -d '{"alias":"Casa","calle":"Calle 123 #45-67","ciudad":"Bogotá","departamento":"Cundinamarca","codigo_postal":"110111"}'
      2. Assert status 201, response.es_predeterminada = true (first address)
      3. curl POST /api/direcciones -d '{"alias":"Oficina","calle":"Carrera 7 #72-10","ciudad":"Bogotá","departamento":"Cundinamarca","codigo_postal":"110221"}'
      4. Assert status 201
      5. curl PUT /api/direcciones/{id_2}/predeterminada
      6. curl GET /api/direcciones → assert id_2.es_predeterminada=true, id_1.es_predeterminada=false
    Expected Result: Default address management works correctly
    Evidence: .sisyphus/evidence/task-20-address-default.txt

  Scenario: 6th address rejected
    Tool: Bash (curl)
    Preconditions: User has 5 addresses
    Steps:
      1. curl POST /api/direcciones with 6th address
      2. Assert status 400
      3. Assert response.error contains "máximo 5"
    Expected Result: Limit enforced
    Evidence: .sisyphus/evidence/task-20-address-limit.txt
  ```

  **Commit**: YES
  - Message: `feat(backend+frontend): add shipping addresses CRUD with default selection (CART-11)`
  - Files: `backend/routes/direcciones.js`, `database/migrations/008_direcciones.sql`, `frontend/pages/direcciones.html`, `frontend/js/direcciones.js`, `frontend/pages/pago.html`, `backend/__tests__/direcciones.test.js`

- [x] 21. CART-12: Complete purchase history

  **What to do**:
  - Backend: `GET /api/pedidos` en `backend/routes/pedidos.js` (nuevo o extender existente):
    - Listar pedidos del usuario: ORDER BY created_at DESC
    - Excluir carrito activo (items sin pedido confirmado)
    - Cada pedido incluye: id, fecha, items (con precio del momento), monto total, estado
  - Backend: `GET /api/pedidos/:id` — detalle expandido:
    - Productos, cantidades, precio unitario (inmutable, del momento de compra), subtotales, total
    - Datos de envío (dirección usada)
    - Estado actual con timestamp de última actualización
  - Frontend: `frontend/pages/historial.html`:
    - Lista de pedidos con color por estado
    - Click expande detalle (accordion o modal)
    - Mensaje "Aún no tienes pedidos" con CTA si lista vacía
  - Frontend: `frontend/js/historial.js` — fetch y render
  - Tests: `backend/__tests__/historial.test.js`

  **Must NOT do**:
  - NO reconsultar precios al Catálogo (usar precios del momento de compra)
  - NO mostrar carritos activos como pedidos
  - NO permitir modificar precios del historial

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `["nodejs-backend-patterns"]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5 (with T20, T22)
  - **Blocks**: None
  - **Blocked By**: T14 (pedidos deben existir)

  **References**:
  - `backend/routes/transacciones.js:GET /` — Patrón de listado con JOIN
  - `backend/routes/carrito.js:GET /datos-pago` — Estructura de respuesta con items+totales
  - `frontend/js/carrito.js:mostrarCarrito()` — Patrón de renderizado de lista

  **Acceptance Criteria**:
  - [ ] GET /api/pedidos lista solo pedidos confirmados del usuario
  - [ ] Precios son los del momento de compra (inmutables)
  - [ ] Estados con color diferenciado: Pendiente (amarillo), Procesando (azul), Enviado (verde), Entregado (gris), Cancelado (rojo)
  - [ ] Estado vacío muestra mensaje amigable
  - [ ] `npx jest backend/__tests__/historial.test.js` → PASS

  **QA Scenarios**:

  ```
  Scenario: User views purchase history with multiple orders
    Tool: Playwright
    Preconditions: User has 3 completed orders in different states
    Steps:
      1. Login, navigate to /historial
      2. Assert 3 orders listed, most recent first
      3. Assert each order shows correct status color
      4. Click first order → assert expands with item details, prices, total
      5. Assert prices match original purchase prices (not current Catálogo prices)
    Expected Result: Complete history with immutable prices
    Evidence: .sisyphus/evidence/task-21-history.png

  Scenario: Empty history shows CTA
    Tool: Playwright
    Preconditions: New user, no orders
    Steps:
      1. Login, navigate to /historial
      2. Assert "Aún no tienes pedidos" message visible
      3. Assert CTA button links to /catalogo or /productos
    Expected Result: Friendly empty state
    Evidence: .sisyphus/evidence/task-21-empty-history.png
  ```

  **Commit**: YES
  - Message: `feat(backend+frontend): add purchase history with immutable prices and status colors (CART-12)`
  - Files: `backend/routes/pedidos.js`, `frontend/pages/historial.html`, `frontend/js/historial.js`, `backend/__tests__/historial.test.js`

- [x] 22. CART-13: PDF invoice generation (Colombia fiscal) — NOT NEEDED (other group handles)

  **What to do**:
  - Instalar dependencia: `npm install pdfkit` en backend
  - Crear `backend/services/invoiceGenerator.js`:
    - Función `generarFactura(pedido, usuario)` → genera PDF con:
      - Encabezado: número de pedido, fecha, datos del comprador (nombre, NIT/CC, email)
      - Tabla de ítems: producto, cantidad, precio unitario, subtotal
      - Totales: subtotal, IVA (19%), total
      - Pie: número de transacción, estado del pedido
    - Requisitos fiscales colombianos: NIT del vendedor (configurable), numeración consecutiva, fecha en formato DD/MM/AAAA
  - Endpoint: `GET /api/pedidos/:id/factura` — genera y devuelve PDF
    - Solo disponible si estado es "Enviado" o "Entregado"
    - Si estado es "Pendiente" o "Procesando" → 400 con mensaje explicativo
  - Frontend: botón "Descargar factura" en detalle de pedido (`historial.html`)
    - Tooltip "Disponible cuando el pedido sea enviado" si está deshabilitado
  - Tests: `backend/__tests__/invoice.test.js`

  **Must NOT do**:
  - NO generar factura para pedidos Pendiente o Procesando
  - NO exponer datos de otros usuarios en la factura
  - NO hardcodear NIT del vendedor (usar env var FACTURA_NIT)

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `["nodejs-backend-patterns"]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5 (with T20, T21)
  - **Blocks**: None
  - **Blocked By**: T21

  **References**:
  - `backend/services/pagosClient.js` — Patrón de servicio para invoiceGenerator
  - `backend/config.js` — Donde agregar FACTURA_NIT

  **Acceptance Criteria**:
  - [ ] PDF generado correctamente con todos los campos requeridos
  - [ ] Incluye NIT, IVA 19%, numeración consecutiva, fecha colombiana
  - [ ] Solo disponible para estados Enviado/Entregado
  - [ ] Botón deshabilitado con tooltip para Pendiente/Procesando
  - [ ] `npx jest backend/__tests__/invoice.test.js` → PASS

  **QA Scenarios**:

  ```
  Scenario: Download invoice for delivered order
    Tool: Bash (curl) + file check
    Preconditions: Order in ENTREGADO state
    Steps:
      1. curl GET /api/pedidos/{id}/factura -o factura_test.pdf
      2. Assert status 200, Content-Type: application/pdf
      3. file factura_test.pdf → "PDF document"
      4. Check PDF > 1KB (not empty)
    Expected Result: Valid PDF downloaded
    Evidence: .sisyphus/evidence/task-22-invoice.pdf

  Scenario: Invoice blocked for pending order
    Tool: Bash (curl)
    Preconditions: Order in PENDIENTE state
    Steps:
      1. curl GET /api/pedidos/{id}/factura
      2. Assert status 400
      3. Assert response.error contains "no está disponible" or "Enviado"
    Expected Result: Blocked with explanation
    Evidence: .sisyphus/evidence/task-22-invoice-blocked.txt
  ```

  **Commit**: YES
  - Message: `feat(backend): add PDF invoice generation with Colombia fiscal requirements (CART-13)`
  - Files: `backend/services/invoiceGenerator.js`, `backend/routes/pedidos.js`, `backend/config.js`, `package.json`, `backend/__tests__/invoice.test.js`

---

### Wave 6: Sprint 7 — Extras (after Wave 5)

- [x] 23. CART-15: Payment retry flow (max 3 attempts in 10 min)

  **What to do**:
  - Modificar `backend/routes/checkout.js` POST /api/checkout/iniciar:
    - Al recibir error de Pasarela → guardar intento en `intentos_pago` (user_id, amount, error_msg, timestamp)
    - Contar intentos en últimos 10 minutos → si ≥3, retornar 429 "Demasiados intentos. Contacta a tu banco."
    - Si <3, retornar error traducido: mapear códigos de Pasarela a mensajes de usuario ("Fondos insuficientes", "Tarjeta rechazada", etc.)
  - Crear migración `database/migrations/009_intentos_pago.sql`:
    - Tabla `intentos_pago`: id SERIAL, usuario_id INT, intentos_count INT, monto DECIMAL, error_msg TEXT, created_at TIMESTAMP
  - Frontend: en `frontend/pages/pago.html`:
    - Mostrar mensaje de error amigable (sin datos técnicos)
    - Botón "Reintentar pago" (mantiene carrito intacto)
    - Si 429 → mostrar "Has excedido el límite de intentos. Contacta a tu banco." con bloqueo de 10 min
  - Tests: `backend/__tests__/payment-retry.test.js`

  **Must NOT do**:
  - NO mostrar mensajes de error técnicos de la Pasarela al usuario
  - NO vaciar el carrito en pago fallido
  - NO permitir reintentos después del bloqueo

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `["nodejs-backend-patterns"]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 6 (with T24, T25)
  - **Blocks**: None
  - **Blocked By**: T11 (checkout endpoint)

  **References**:
  - `backend/routes/checkout.js` — Donde se inicia el pago
  - `backend/services/pagosClient.js:crearCheckout()` — Contrato de error de Pasarela
  - `frontend/pages/pago.html` — Interfaz de pago actual

  **Acceptance Criteria**:
  - [ ] Error de Pasarela se traduce a mensaje de usuario
  - [ ] 3 intentos en 10 min → bloqueo con 429
  - [ ] Carrito permanece intacto tras fallo
  - [ ] Todos los intentos se registran
  - [ ] `npx jest backend/__tests__/payment-retry.test.js` → PASS

  **QA Scenarios**:

  ```
  Scenario: Payment fails and user sees translated error
    Tool: Playwright
    Preconditions: Backend running, Pasarela returns "insufficient_funds"
    Steps:
      1. Login, add item to cart, go to checkout
      2. Initiate payment
      3. Assert error message is in Spanish, user-friendly
      4. Assert cart still has items
      5. Assert "Reintentar pago" button visible
    Expected Result: Friendly error, cart preserved
    Evidence: .sisyphus/evidence/task-23-payment-error.png

  Scenario: 3 failures trigger block
    Tool: Bash (curl)
    Preconditions: Clean state
    Steps:
      1. curl POST /api/checkout/iniciar → error (1)
      2. curl POST /api/checkout/iniciar → error (2)
      3. curl POST /api/checkout/iniciar → error (3)
      4. curl POST /api/checkout/iniciar → 429 "Demasiados intentos"
    Expected Result: Block after 3 failures
    Evidence: .sisyphus/evidence/task-23-payment-block.txt
  ```

  **Commit**: YES
  - Message: `feat(backend+frontend): add payment retry flow with 3-attempt limit (CART-15)`
  - Files: `backend/routes/checkout.js`, `database/migrations/009_intentos_pago.sql`, `frontend/pages/pago.html`, `backend/__tests__/payment-retry.test.js`

- [x] 24. CART-16: Order cancellation + auto-refund

  **What to do**:
  - Endpoint: `POST /api/pedidos/:id/cancelar` en `backend/routes/pedidos.js`:
    - Validar que pedido esté en estado "Pendiente"
    - Si está en "Enviado" o "Entregado" → 400 "Usa el proceso de devolución"
    - Cambiar estado a "Cancelado"
    - Llamar a Pasarela: `pagosClient.refund(payment_reference)` (nuevo método)
    - Si Pasarela acepta → confirmar cancelación
    - Si Pasarela rechaza → revertir estado a "Pendiente", registrar incidencia
  - Extender `backend/services/pagosClient.js`:
    - Método `refund(paymentReference)` → POST a Pasarela /refund
  - Notificar vía Notificaciones-Pedidos: enviar evento "PedidoCancelado"
  - Frontend: botón "Cancelar pedido" en detalle de pedido (solo si Pendiente)
    - Modal de confirmación: "¿Estás seguro? El reembolso toma 5-10 días hábiles."
  - Tests: `backend/__tests__/order-cancel.test.js`

  **Must NOT do**:
  - NO permitir cancelar pedidos Enviados o Entregados
  - NO cancelar sin confirmación del usuario (modal)
  - NO perder registro si Pasarela rechaza el reembolso

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `["nodejs-backend-patterns"]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 6 (with T23, T25)
  - **Blocks**: None
  - **Blocked By**: T14 (pedidos exist), T12 (notificacionesPedidosClient)

  **References**:
  - `backend/routes/pedidos.js` — Endpoint de pedidos (creado en T14 o T21)
  - `backend/services/pagosClient.js` — Cliente a extender con refund()
  - `backend/services/notificacionesPedidosClient.js` — Cliente de notificaciones

  **Acceptance Criteria**:
  - [ ] Cancelar pedido Pendiente → estado Cambia a Cancelado
  - [ ] Se llama a Pasarela.refund() con referencia de pago
  - [ ] Se notifica a cliente vía Notificaciones-Pedidos
  - [ ] Si Pasarela rechaza → estado vuelve a Pendiente + incidencia registrada
  - [ ] Botón no disponible para Enviado/Entregado
  - [ ] `npx jest backend/__tests__/order-cancel.test.js` → PASS

  **QA Scenarios**:

  ```
  Scenario: Cancel pending order successfully
    Tool: Bash (curl)
    Preconditions: Order in PENDIENTE state, Pasarela accepts refund
    Steps:
      1. curl POST /api/pedidos/{id}/cancelar
      2. Assert status 200
      3. Assert response.estado = "Cancelado"
      4. Assert response.reembolso_referencia exists
    Expected Result: Order cancelled, refund initiated
    Evidence: .sisyphus/evidence/task-24-cancel-order.txt

  Scenario: Cannot cancel delivered order
    Tool: Bash (curl)
    Preconditions: Order in ENTREGADO state
    Steps:
      1. curl POST /api/pedidos/{id}/cancelar
      2. Assert status 400
      3. Assert response.error mentions "devolución"
    Expected Result: Cancellation blocked
    Evidence: .sisyphus/evidence/task-24-cancel-blocked.txt
  ```

  **Commit**: YES
  - Message: `feat(backend): add order cancellation with auto-refund via Pasarela (CART-16)`
  - Files: `backend/routes/pedidos.js`, `backend/services/pagosClient.js`, `backend/__tests__/order-cancel.test.js`

- [x] 25. CART-17: Product recommendations from Catálogo

  **What to do**:
  - Extender `backend/services/productosClient.js`:
    - Método `getRecommendations(userId)` → GET a Catálogo /recomendaciones?userId=X
    - Fallback: `getPopularProducts()` → GET a Catálogo /productos/populares
  - Backend endpoint: `GET /api/recomendaciones`:
    - Si usuario tiene historial → llamar getRecommendations(userId)
    - Si no tiene historial o Catálogo no tiene recomendaciones → fallback a getPopularProducts()
    - Si Catálogo no responde → retornar array vacío (no bloquear)
    - Máximo 4 productos
  - Frontend: en `frontend/pages/carrito.html` y `frontend/js/carrito.js`:
    - Sección "También te puede interesar" al pie del carrito
    - Carga asíncrona (lazy load, no bloquea render del carrito)
    - Si error o vacío → no mostrar sección
  - Tests: `backend/__tests__/recommendations.test.js`

  **Must NOT do**:
  - NO implementar algoritmo de recomendación (vive en Catálogo)
  - NO bloquear la página del carrito si falla Catálogo
  - NO mostrar más de 4 recomendaciones

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `["nodejs-backend-patterns"]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 6 (with T23, T24)
  - **Blocks**: None
  - **Blocked By**: T8 (productosClient base)

  **References**:
  - `backend/services/productosClient.js:getProductos()` — Patrón de cliente HTTP
  - `frontend/js/main.js:cargarProductos()` — Patrón de carga asíncrona
  - `frontend/js/carrito.js:mostrarCarrito()` — Donde agregar sección

  **Acceptance Criteria**:
  - [ ] GET /api/recomendaciones retorna máximo 4 productos
  - [ ] Usuario con historial → recomendaciones personalizadas
  - [ ] Usuario sin historial → productos populares (fallback)
  - [ ] Error de Catálogo → array vacío, sin error al usuario
  - [ ] Sección no se muestra si no hay datos
  - [ ] `npx jest backend/__tests__/recommendations.test.js` → PASS

  **QA Scenarios**:

  ```
  Scenario: Recommendations load asynchronously in cart
    Tool: Playwright
    Preconditions: User has purchase history, Catálogo has recommendations
    Steps:
      1. Login, navigate to /carrito
      2. Wait for "También te puede interesar" section to appear
      3. Assert 1-4 product cards rendered
      4. Assert each card has: name, price, "Agregar" button
    Expected Result: Recommendations displayed, non-blocking
    Evidence: .sisyphus/evidence/task-25-recommendations.png

  Scenario: Catálogo failure doesn't break cart
    Tool: Playwright
    Preconditions: Catálogo service is down
    Steps:
      1. Login, navigate to /carrito
      2. Assert cart items render normally
      3. Assert "También te puede interesar" section is NOT visible
      4. Assert no error visible to user
    Expected Result: Graceful degradation
    Evidence: .sisyphus/evidence/task-25-recommendations-fallback.png
  ```

  **Commit**: YES
  - Message: `feat(backend+frontend): add product recommendations from Catálogo (CART-17)`
  - Files: `backend/services/productosClient.js`, `backend/routes/carrito.js`, `frontend/pages/carrito.html`, `frontend/js/carrito.js`, `backend/__tests__/recommendations.test.js`

---

## Final Verification Wave (MANDATORY — after ALL 25 tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [25/25] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `npx jest` (all tests). Run `npx eslint` if configured. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names (data/result/item/temp). Check factory pattern compliance on all route files.
  Output: `Build [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | Factory Pattern [COMPLIANT/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill if UI)
  Start from clean state (empty DB). Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration: add→checkout→pay→webhook→order→notifications. Test edge cases: empty cart, invalid stock, payment failure, retry limits, WebSocket connection.
  Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task (1-25): read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination: Task N touching Task M's files. Flag unaccounted changes.
  Output: `Tasks [25/25 compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| Wave | Tasks | Commit Message |
|------|-------|----------------|
| 0 | T1-T7 | `chore: add Jest, socket.io, Sprint 1 docs, extend productosClient, create notificacionesPedidosClient, align transaccion states, scaffold direcciones` |
| 1 | T8-T10 | `feat(backend+frontend): add stock validation, quantity limits, and live pricing summary (CART-01/02/03)` |
| 2 | T11-T13 | `feat(backend+frontend): add login redirect, checkout→Pasarela, and payment confirmation (CART-04/05/06)` |
| 3 | T14-T16 | `feat(backend): persist order on payment, stock deduction+notify, transaction audit log (CART-07/08/09)` |
| 4 | T17-T19 | `feat(backend+frontend): order tracking+WebSocket, vendor panel+state machine, cart persistence 30d TTL (CART-10/VEND-01/CART-14)` |
| 5 | T20-T22 | `feat(backend+frontend): shipping addresses CRUD, purchase history, PDF invoice Colombia (CART-11/12/13)` |
| 6 | T23-T25 | `feat(backend+frontend): payment retry flow, order cancel+refund, product recommendations (CART-15/16/17)` |
| FINAL | F1-F4 | `chore: final verification wave — plan audit, code quality, QA, scope fidelity` |

**Pre-commit for every commit**: `npx jest` (all tests must pass)

---

## Success Criteria

### Verification Commands
```bash
# Backend tests
cd backend && npx jest
# Expected: All test suites pass, 0 failures

# Backend server
cd backend && node server.js
# Expected: Server running on port 3000, "Servidor corriendo" log

# Frontend dev server
cd frontend && npm run dev
# Expected: Vite dev server running, no build errors

# Database migration
psql -U postgres -d sistema_d_compra -f database/migrations/008_direcciones.sql
psql -U postgres -d sistema_d_compra -f database/migrations/009_intentos_pago.sql
# Expected: Tables created without errors

# Full integration (curl)
curl http://localhost:3000/api/carrito -H "Authorization: Bearer <token>"
# Expected: 200 with cart items array (can be empty)
```

### Final Checklist
- [ ] All 17 user stories implemented and testable
- [ ] All 3 Sprint 1 docs created (README, .env.example, docs/)
- [ ] All "Must Have" present per task
- [ ] All "Must NOT Have" absent per task
- [ ] All external service clients (auth, productos, pagos, notificacionesPedidos) functional
- [ ] All route files follow factory pattern: `module.exports = (pool, verificarToken) => router`
- [ ] No TypeScript files anywhere
- [ ] No ESM `import`/`export` in backend
- [ ] All Jest tests passing
- [ ] WebSocket working for order status updates
- [ ] PDF invoices generated with Colombia fiscal format
- [ ] Payment retry limit enforced (3/10min)
- [ ] Order cancellation → refund via Pasarela
- [ ] Cart persists 30 days with TTL cleanup
- [ ] Stock validated at add AND at checkout
- [ ] NO card data ever stored or logged