# Plan: Carrito de Compras - Microservicio Mejorado

## TL;DR

> **Resumen**: Mejorar el backend Express existente que funciona como servicio de carrito de compras. Se agrega persistencia en PostgreSQL (tabla `carrito`), endpoints REST para CRUD del carrito, fusión de carrito guest→user al autenticarse, detalle de items en transacciones, y formalización de contratos con servicios externos (auth, productos, pagos).
>
> **Entregables**:
> - Tabla `carrito` en PostgreSQL con migración
> - API REST completa para carrito (GET, POST, PATCH, DELETE)
> - Endpoint de fusión guest→user que preserva el carrito
> - Schema actualizado con columnas faltantes en `transacciones`
> - Contrato formalizado con servicios externos
> - Integración frontend para sincronizar localStorage ↔ DB
> - Lógica de vaciar carrito al confirmar pago
>
> **Esfuerzo estimado**: Medium
> **Ejecución paralela**: SÍ - 4 waves
> **Ruta crítica**: Schema → Carrito API → Guest Fusion → Frontend Sync

---

## Contexto

### Petición Original
El usuario describió 5 historias de usuario para el servicio de carrito: guardar productos del catálogo, verificar autenticación (redirigir a microservicio login externo), preservar carrito guest al registrarse, enviar datos a pasarela de pagos, y vaciar carrito al pagar.

### Resumen de Entrevista
**Decisiones clave**:
- El backend actual ES el servicio de carrito (no se crea proyecto nuevo)
- Persistencia híbrida: localStorage para guests, DB para autenticados
- Fusión guest→user: conservar (asociar guest cart al usuario, sin combinar)
- Datos para pasarela: solo lo básico (id usuario, ids productos, monto)
- Sin tests automatizados, solo verificación manual

**Hallazgos de investigación**:
- Auth YA delegado a servicio externo (authClient.js → localhost:4000)
- Pagos YA delegado a servicio externo (pagosClient.js → localhost:4003)
- Productos YA consumido via productosClient (localhost:4002)
- Carrito es 100% localStorage - NO hay tabla en DB
- Webhook de confirmación YA existe y funciona
- **CRÍTICO**: Schema DB no coincide con código - faltan columnas (`items`, `usuario_email`, `total`, `moneda`, `referencia_pago_externa`)

### Revisión Metis
**Gaps identificados y resueltos**:
- **Schema/Code mismatch (CRÍTICO)**: Código usa 5 columnas que no están en schema_transacciones.sql → Se agregará tarea de migration para sincronizar
- **Politica de expiración de carrito**: Default 30 días para guests, sin expiración para autenticados
- **Producto eliminado del catálogo**: Carrito no valida existencia de producto (responsabilidad del servicio de productos) → Documentado como limitación
- **Webhook idempotente**: Se agregará verificación de estado antes de actualizar transacción
- **Precio snapshot**: Carrito almacenará precio al momento de agregar, no re-validar al checkout

---

## Objetivos de Trabajo

### Objetivo Central
Completa el servicio de carrito de compras con persistencia server-side, fusión de carrito guest→user, y contratos formalizados con servicios externos.

### Entregables Concretos
- `database/migrations/001_add_carrito_and_fix_transacciones.sql` - Nueva tabla + columnas faltantes
- `backend/routes/carrito.js` - API REST de carrito (CRUD)
- `backend/routes/fusion.js` - Endpoint de fusión guest→user
- `frontend/js/carrito.js` (modificado) - Sync localStorage ↔ DB
- `frontend/js/auth.js` (modificado) - Trigger de fusión al login
- `frontend/js/main.js` (modificado) - Sync al agregar al carrito
- Contratos formalizados en `backend/contracts/`

### Definición de Done
- [ ] `psql -c "\d carrito"` muestra tabla con columnas esperadas
- [ ] `curl POST /api/carrito` con token agrega item → 201 con carrito actualizado
- [ ] `curl GET /api/carrito` con token retorna items del usuario
- [ ] Login de guest preserva items del carrito guest en el carrito del usuario
- [ ] Webhook de pago confirmado vacía carrito del usuario
- [ ] Frontend sincroniza localStorage ↔ DB correctamente

### Must Have
- Tabla `carrito` en PostgreSQL
- API REST de carrito para usuarios autenticados
- Fusión guest→user al autenticarse
- Items detallados en tabla `transacciones`
- Vaciar carrito al confirmar pago
- Frontend sincronizado con backend para usuarios autenticados

### Must NOT Have (Guardrails)
- NO modificar interfaces de authClient, productosClient, pagosClient (contratos con servicios externos)
- NO agregar endpoints de auth/register/login al backend (auth es externo)
- NO introducir ORM o dependencias nuevas (mantener patrón pg queries)
- NO modificar lógica de verificación de firma del webhook (seguridad crítica)
- NO cambiar las localStorage keys existentes (`carrito_guest`, `carrito_{id}`)
- NO agregar validación de stock en carrito (responsabilidad del servicio de productos)
- NO agregar sistema de cupones/descuentos (fuera de scope)
- NO agregar soporte multi-moneda (solo MXN como está hardcoded)
- NO agregar WebSockets/sync en tiempo real (solo REST)

---

## Estrategia de Verificación

> **CERO INTERVENCIÓN HUMANA** - TODA verificación es ejecutada por el agente. Sin excepciones.

### Decisión de Tests
- **Infraestructura de tests existe**: NO
- **Tests automatizados**: Ninguno
- **Framework**: N/A (sin tests)
- **Verificación**: Agent-Executed QA con curl + psql para backend, Playwright para frontend

### Política de QA
Cada tarea DEBE incluir escenarios QA ejecutados por el agente.
Evidencia guardada en `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Backend API**: Bash (curl) - Enviar requests, assert status + response fields
- **Base de datos**: Bash (psql) - Verificar tablas, columnas, datos
- **Frontend UI**: Playwright - Navegar, interactuar, assert DOM, screenshots

---

## Estrategia de Ejecución

### Waves de Ejecución Paralela

```
Wave 1 (Inmediatamente - foundation + schema):
├── Task 1: Migration SQL - tabla carrito + fix transacciones [quick]
├── Task 2: Contratos de servicios externos [quick]
└── Task 3: Configurar estructura de rutas del carrito [quick]

Wave 2 (Después de Wave 1 - core API + data):
├── Task 4: Endpoint GET /api/carrito (obtener carrito) [unspecified-high]
├── Task 5: Endpoint POST /api/carrito (agregar item) [unspecified-high]
├── Task 6: Endpoint PATCH /api/carrito/:producto_id (actualizar cantidad) [quick]
└── Task 7: Endpoint DELETE /api/carrito/:producto_id (eliminar item) [quick]

Wave 3 (Después de Wave 2 - fusión + pago):
├── Task 8: Endpoint POST /api/carrito/fusionar (guest→user) [deep]
├── Task 9: Vaciar carrito en webhook de pago confirmado [quick]
└── Task 10: Endpoint GET /api/carrito/datos-pago (datos para pasarela) [unspecified-high]

Wave 4 (Después de Wave 3 - integración frontend):
├── Task 11: Frontend - Sync carrito al agregar (main.js) [unspecified-high]
├── Task 12: Frontend - Fusión guest→user al login (auth.js + carrito.js) [deep]
└── Task 13: Frontend - Vaciar carrito en confirmación (pago.html) [quick]

Wave FINAL (Después de TODAS las tareas — 4 revisiones paralelas):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)
→ Presentar resultados → Obtener aprobación explícita del usuario

Ruta crítica: Task 1 → Task 5 → Task 8 → Task 12 → F1-F4 → aprobación
Paralelismo: ~60% más rápido que secuencial
```

### Matriz de Dependencias

| Task | Depende De | Bloquea A |
|------|-----------|-----------|
| 1 | - | 4, 5, 6, 7, 8, 9 |
| 2 | - | 10 |
| 3 | 1 | 4, 5, 6, 7 |
| 4 | 1, 3 | 8, 10 |
| 5 | 1, 3 | 8, 10, 11 |
| 6 | 1, 3 | 10 |
| 7 | 1, 3 | 10 |
| 8 | 4, 5 | 12 |
| 9 | 1 | 13 |
| 10 | 2, 4, 5 | 12, 13 |
| 11 | 5 | - |
| 12 | 8, 10 | - |
| 13 | 9 | - |

### Resumen de Despacho de Agentes

- **Wave 1**: 3 tasks → T1 `quick`, T2 `quick`, T3 `quick`
- **Wave 2**: 4 tasks → T4 `unspecified-high`, T5 `unspecified-high`, T6 `quick`, T7 `quick`
- **Wave 3**: 3 tasks → T8 `deep`, T9 `quick`, T10 `unspecified-high`
- **Wave 4**: 3 tasks → T11 `unspecified-high`, T12 `deep`, T13 `quick`
- **FINAL**: 4 tasks → F1 `oracle`, F2 `unspecified-high`, F3 `unspecified-high`, F4 `deep`

---

## TODOs

- [x] 1. Migration SQL - tabla carrito + fix transacciones

  **What to do**:
  - Crear archivo `database/migrations/001_add_carrito_and_fix_transacciones.sql`
  - Agregar tabla `carrito` con columnas: `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`, `usuario_id INTEGER NOT NULL`, `producto_id VARCHAR(50) NOT NULL`, `producto_nombre TEXT NOT NULL`, `precio_unitario NUMERIC(12,2) NOT NULL`, `cantidad INTEGER NOT NULL DEFAULT 1 CHECK (cantidad > 0)`, `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`, `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
  - Agregar índices en `carrito(usuario_id)` y `carrito(usuario_id, producto_id)` (unique constraint para evitar duplicados)
  - Agregar trigger `actualizar_updated_at` para la tabla `carrito`
  - Agregar columnas faltantes a `transacciones`: `items JSONB`, `usuario_email VARCHAR(255)`, `total NUMERIC(12,2)`, `moneda VARCHAR(3) DEFAULT 'MXN'`, `referencia_pago_externa VARCHAR(255)`
  - Agregar índice en `transacciones(referencia_pago_externa)`
  - Ejecutar `psql -f database/migrations/001_add_carrito_and_fix_transacciones.sql` para aplicar

  **Must NOT do**:
  - NO eliminar columnas existentes de transacciones
  - NO cambiar tipos de columnas existentes
  - NO agregar ORM o dependencias
  - NO crear tabla de usuarios (auth es externo)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3)
  - **Blocks**: Tasks 4, 5, 6, 7, 8, 9
  - **Blocked By**: None (can start immediately)

  **References**:
  **Pattern References**:
  - `database/schema_transacciones.sql` - Patrón de creación de tablas, índices, triggers, convenciones de nombres
  - `backend/routes/checkout.js:62-70` - Columnas que el código espera en transacciones (items, usuario_email, total, moneda, referencia_pago_externa)

  **API/Type References**:
  - `backend/config.js` - Configuración de DB para saber los parámetros de conexión
  - `frontend/js/carrito.js:134-143` - Estructura de items que se envían al checkout (producto_id, nombre, cantidad, precio_unitario)

  **WHY Each Reference Matters**:
  - schema_transacciones.sql: Seguir el mismo patrón de SQL (snake_case, TIMESTAMPTZ, gen_random_uuid, CHECK constraints)
  - checkout.js line 62-70: Estas son las columnas que el código INSERTA pero que NO EXISTEN en el schema — agregarlas es crítico
  - carrito.js line 134-143: Define la estructura de datos del carrito que debe mapearse a la nueva tabla

  **Acceptance Criteria**:
  - [ ] `psql -c "\d carrito"` muestra todas las columnas con tipos correctos
  - [ ] `psql -c "\d transacciones"` muestra las nuevas columnas (items, usuario_email, total, moneda, referencia_pago_externa)
  - [ ] Unique constraint en carrito(usuario_id, producto_id) funciona
  - [ ] Trigger de updated_at funciona en ambas tablas

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Verificar tabla carrito creada correctamente
    Tool: Bash (psql)
    Preconditions: Base de datos PostgreSQL accesible
    Steps:
      1. Ejecutar: psql -c "\d carrito" $DATABASE_URL
      2. Verificar columnas: id (uuid), usuario_id (integer), producto_id (varchar), producto_nombre (text), precio_unitario (numeric), cantidad (integer), created_at, updated_at
      3. Ejecutar: psql -c "\d transacciones" $DATABASE_URL
      4. Verificar nuevas columnas: items, usuario_email, total, moneda, referencia_pago_externa
    Expected Result: Ambas tablas tienen todas las columnas esperadas
    Failure Indicators: Columnas faltantes, tipos incorrectos, constraints sin crear
    Evidence: .sisyphus/evidence/task-1-schema-verify.txt

  Scenario: Verificar unique constraint en carrito
    Tool: Bash (psql)
    Preconditions: Tabla carrito existe
    Steps:
      1. INSERT INTO carrito (usuario_id, producto_id, producto_nombre, precio_unitario, cantidad) VALUES (1, 'prod-1', 'Test', 100, 1)
      2. Intentar INSERT duplicado con mismo usuario_id y producto_id
    Expected Result: Segundo INSERT falla con unique violation
    Failure Indicators: Segundo INSERT exitoso (constraint no creado)
    Evidence: .sisyphus/evidence/task-1-constraint-verify.txt
  ```

  **Commit**: YES
  - Message: `feat(db): add carrito table and fix transacciones schema`
  - Files: `database/migrations/001_add_carrito_and_fix_transacciones.sql`
  - Pre-commit: `psql -c "\d carrito" && psql -c "\d transacciones"`

- [x] 2. Contratos de servicios externos

  **What to do**:
  - Crear directorio `backend/contracts/`
  - Crear `backend/contracts/auth-service.md` documentando: endpoints esperados (POST /auth/login, POST /auth/register, GET /auth/me), request/response bodies, códigos de estado, headers (Authorization: Bearer), y formato del JWT
  - Crear `backend/contracts/productos-service.md` documentando: endpoint esperado (GET /productos), query params, response body (array de productos con id, nombre, precio, stock), headers opcionales
  - Crear `backend/contracts/pagos-service.md` documentando: endpoints esperados (POST /checkout, POST /webhook/pago-confirmado), request/response bodies, formato de signature HMAC, códigos de estado
  - Cada contrato debe incluir: URL base (configurable via env), método HTTP, headers, request body, response body, errores posibles, y ejemplos

  **Must NOT do**:
  - NO implementar los servicios externos (solo documentar contratos)
  - NO cambiar el código existente de authClient/productosClient/pagosClient
  - NO asumir comportamientos no verificados en el código

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3)
  - **Blocks**: Task 10
  - **Blocked By**: None (can start immediately)

  **References**:
  **Pattern References**:
  - `backend/services/authClient.js` - Llamadas actuales al servicio de auth: POST /auth/login, POST /auth/register, GET /auth/me
  - `backend/services/productosClient.js` - Llamada actual al servicio de productos: GET /productos con Bearer opcional
  - `backend/services/pagosClient.js` - Llamadas actuales al servicio de pagos: POST /checkout, verificación HMAC

  **API/Type References**:
  - `backend/config.js` - URLs configurables para cada servicio (AUTH_SERVICE_URL, PRODUCTOS_SERVICE_URL, PAGOS_SERVICE_URL)

  **WHY Each Reference Matters**:
  - authClient.js: Define exactamente qué endpoints se consumen y qué formato de request/response se espera del servicio de auth
  - productosClient.js: Define cómo se obtienen productos y si se manda token
  - pagosClient.js: Define cómo se crea checkout, qué datos se envían, y cómo se verifica la firma del webhook
  - config.js: Muestra las variables de entorno que configuran las URLs base de cada servicio

  **Acceptance Criteria**:
  - [ ] `backend/contracts/auth-service.md` documenta todos los endpoints de auth
  - [ ] `backend/contracts/productos-service.md` documenta endpoint de productos
  - [ ] `backend/contracts/pagos-service.md` documenta endpoints de pagos
  - [ ] Cada contrato incluye: método, path, headers, request body, response body, errores

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Verificar contratos completos y consistentes con código existente
    Tool: Bash (grep)
    Preconditions: Archivos de contratos creados
    Steps:
      1. Verificar que cada endpoint en authClient.js tiene entrada en auth-service.md
      2. Verificar que endpoint en productosClient.js tiene entrada en productos-service.md
      3. Verificar que endpoints en pagosClient.js tienen entrada en pagos-service.md
      4. Verificar que cada contrato incluye method, path, headers, request, response, errors
    Expected Result: 100% de endpoints del código están documentados en contratos
    Failure Indicators: Endpoint en código sin contrato correspondiente
    Evidence: .sisyphus/evidence/task-2-contracts-verify.txt

  Scenario: Verificar formato de contratos
    Tool: Bash
    Preconditions: Archivos de contratos creados
    Steps:
      1. Cat cada archivo .md en backend/contracts/
      2. Verificar estructura: título, descripción, tabla de endpoints, detalles por endpoint
    Expected Result: Cada contrato tiene formato consistente y completo
    Failure Indicators: Contrato vacío, sin ejemplos, sin errores documentados
    Evidence: .sisyphus/evidence/task-2-contracts-format.txt
  ```

  **Commit**: YES
  - Message: `docs(contracts): add external service API contracts`
  - Files: `backend/contracts/auth-service.md`, `backend/contracts/productos-service.md`, `backend/contracts/pagos-service.md`

- [x] 3. Estructura de rutas del carrito

  **What to do**:
  - Crear `backend/routes/carrito.js` con Router factory (mismo patrón que transacciones.js)
  - Exportar función que recibe `pool` como parámetro (igual que transaccionesRouter)
  - Definir stubs para los endpoints: GET /, POST /, PATCH /:producto_id, DELETE /:producto_id, POST /fusionar
  - Montar router en `backend/server.js` en `/api/carrito` con verificarToken middleware
  - Agregar `const carritoRouter = require('./routes/carrito');` y `app.use('/api/carrito', verificarToken, carritoRouter(pool));`

  **Must NOT do**:
  - NO implementar lógica de negocio aún (solo stubs con 501 Not Implemented)
  - NO cambiar rutas existentes (transacciones, checkout, webhook)
  - NO agregar middleware nuevo

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (but needs Task 1's schema for reference)
  - **Parallel Group**: Wave 1 (with Tasks 1, 2)
  - **Blocks**: Tasks 4, 5, 6, 7
  - **Blocked By**: None (can start immediately, uses existing patterns)

  **References**:
  **Pattern References**:
  - `backend/routes/transacciones.js` - Patrón de Router factory con pool, estructura de exports, manejo de errores
  - `backend/server.js:56-60` - Patrón de montar routers con middleware verificarToken

  **API/Type References**:
  - `backend/server.js:33-52` - Middleware verificarToken para entender cómo proteger las rutas

  **WHY Each Reference Matters**:
  - transacciones.js: Debe seguir este patrón exacto de Router factory con pool para consistencia
  - server.js: Montar el nuevo router siguiendo el mismo patrón que los routers existentes

  **Acceptance Criteria**:
  - [ ] `backend/routes/carrito.js` existe y exporta Router factory
  - [ ] `backend/server.js` monta el router en `/api/carrito` con verificarToken
  - [ ] `curl GET /api/carrito` retorna 501 o 401 (depende si hay token)
  - [ ] Server arranca sin errores

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Verificar rutas del carrito registradas
    Tool: Bash (curl)
    Preconditions: Server corriendo en puerto 3000
    Steps:
      1. curl -s http://localhost:3000/api/carrito → 401 (sin token)
      2. curl -s -X POST http://localhost:3000/api/carrito -H "Authorization: Bearer invalid" → 401/403
      3. Verificar que server arranca sin errores: npm start 2>&1 | head -5
    Expected Result: Rutas registradas, server arranca, 401 para requests sin token válido
    Failure Indicators: Server no arranca, ruta no encontrada (404 en vez de 401)
    Evidence: .sisyphus/evidence/task-3-routes-verify.txt
  ```

  **Commit**: YES
  - Message: `feat(cart): add cart route structure`
  - Files: `backend/routes/carrito.js`, `backend/server.js`

- [x] 4. Endpoint GET /api/carrito (obtener carrito)
- [x] 5. Endpoint POST /api/carrito (agregar item)
- [x] 6. Endpoint PATCH /api/carrito/:producto_id (actualizar cantidad)
- [x] 7. Endpoint DELETE /api/carrito/:producto_id (eliminar item)

  **What to do**:
  - Implementar DELETE /:producto_id en `backend/routes/carrito.js`
  - Query: `DELETE FROM carrito WHERE usuario_id = $1 AND producto_id = $2 RETURNING *`
  - Si no encuentra el item: retornar 404
  - Retornar `{ mensaje: "Producto eliminado del carrito", carrito: [...items restantes] }`

  **Must NOT do**:
  - NO implementar "vaciar carrito completo" aquí (será endpoint separado en Task 9)
  - NO eliminar items de otros usuarios

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (con Tasks 4, 5, 6)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 10
  - **Blocked By**: Tasks 1, 3

  **References**:
  **Pattern References**:
  - `backend/routes/carrito.js` (editado en Tasks 4-6) - Mismo archivo donde agregar

  **Acceptance Criteria**:
  - [ ] DELETE a producto_id existente retorna 200 con carrito restante
  - [ ] DELETE a producto_id inexistente retorna 404
  - [ ] No se eliminan items de otros usuarios

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Eliminar item existente del carrito
    Tool: Bash (curl)
    Preconditions: Usuario con prod-1 y prod-2 en carrito
    Steps:
      1. curl -s -X DELETE http://localhost:3000/api/carrito/prod-1 -H "Authorization: Bearer $TOKEN"
      2. Verificar status 200
      3. Verificar carrito restante solo tiene prod-2
    Expected Result: 200 con carrito sin prod-1
    Failure Indicators: 404, item no eliminado, ambos items eliminados
    Evidence: .sisyphus/evidence/task-7-delete-cart.json

  Scenario: Eliminar item inexistente retorna 404
    Tool: Bash (curl)
    Preconditions: Usuario autenticado
    Steps:
      1. curl -s -X DELETE http://localhost:3000/api/carrito/prod-inexistente -H "Authorization: Bearer $TOKEN"
    Expected Result: 404
    Evidence: .sisyphus/evidence/task-7-delete-404.txt
  ```

  **Commit**: YES (grouped with Task 6)
  - Message: `feat(cart): add PATCH and DELETE endpoints for cart items`
  - Files: `backend/routes/carrito.js`

- [x] 8. Endpoint POST /api/carrito/fusionar (guest→user)
- [x] 9. Vaciar carrito en webhook de pago confirmado
- [x] 10. Endpoint GET /api/carrito/datos-pago (datos para pasarela)

  **What to do**:
  - Implementar GET /datos-pago en `backend/routes/carrito.js`
  - Este endpoint reemplaza y mejora el actual endpoint en checkout.js que retorna datos de pago
  - Query carrito del usuario: `SELECT producto_id, producto_nombre, precio_unitario, cantidad FROM carrito WHERE usuario_id = $1`
  - Calcular total: `SUM(precio_unitario * cantidad)`
  - Retornar datos necesarios para la pasarela de pagos:
    ```json
    {
      "usuario_id": 5,
      "items": [
        { "producto_id": "prod-1", "nombre": "Producto 1", "precio_unitario": 100, "cantidad": 2, "subtotal": 200 }
      ],
      "total": 200,
      "moneda": "MXN"
    }
    ```
  - Agregar validación: si carrito vacío, retornar 400 con `{ error: "El carrito está vacío" }`

  **Must NOT do**:
  - NO re-validar precios contra el servicio de productos
  - NO incluir datos de tarjeta o métodos de pago
  - NO modificar el endpoint existente de checkout/iniciar (se modificará en otro contexto si necesario)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3
  - **Blocks**: Tasks 12, 13
  - **Blocked By**: Tasks 2, 4, 5

  **References**:
  **Pattern References**:
  - `backend/routes/checkout.js:36-70` - Patrón actual de datos de pago, estructura de request a pagosClient

  **API/Type References**:
  - `backend/contracts/pagos-service.md` (creado en Task 2) - Contrato del servicio de pagos: qué datos espera recibir
  - `backend/services/pagosClient.js` - Cliente actual que llama al servicio de pagos

  **WHY Each Reference Matters**:
  - checkout.js: Entender la estructura de datos que se envía actualmente al servicio de pagos para mantener compatibilidad
  - pagos-service.md: Contrato formal que define exactamente qué datos necesita la pasarela
  - pagosClient.js: Verificar qué campos se envían y en qué formato

  **Acceptance Criteria**:
  - [ ] GET /datos-pago con carrito lleno retorna usuario_id, items con subtotal, total, moneda
  - [ ] GET /datos-pago con carrito vacío retorna 400 con error apropiado
  - [ ] GET /datos-pago sin token retorna 401

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Obtener datos de pago con carrito lleno
    Tool: Bash (curl)
    Preconditions: Usuario autenticado con 2 items en carrito
    Steps:
      1. curl -s http://localhost:3000/api/carrito/datos-pago -H "Authorization: Bearer $TOKEN" | jq .
      2. Verificar respuesta tiene: usuario_id (number), items (array con subtotales), total (number), moneda ("MXN")
      3. Verificar total = suma de subtotales
    Expected Result: 200 con datos completos para pasarela
    Failure Indicators: Total incorrecto, campos faltantes, items sin subtotal
    Evidence: .sisyphus/evidence/task-10-datos-pago.json

  Scenario: Obtener datos de pago con carrito vacío
    Tool: Bash (curl)
    Preconditions: Usuario autenticado sin items en carrito
    Steps:
      1. curl -s http://localhost:3000/api/carrito/datos-pago -H "Authorization: Bearer $TOKEN"
    Expected Result: 400 con { error: "El carrito está vacío" }
    Evidence: .sisyphus/evidence/task-10-datos-pago-empty.txt
  ```

  **Commit**: YES
  - Message: `feat(cart): add payment data endpoint for checkout`
  - Files: `backend/routes/carrito.js`

- [x] 11. Frontend - Sync carrito al agregar (main.js)
- [x] 12. Frontend - Fusión guest→user al login (auth.js + carrito.js)
- [x] 13. Frontend - Vaciar carrito en confirmación (pago.html)

  **What to do**:
  - Modificar `frontend/pages/pago.html` para llamar al backend y vaciar el carrito del servidor después de pago exitoso
  - Cuando `status === 'approved'`: además de limpiar localStorage (comportamiento actual), hacer DELETE a `/api/carrito` (todos los items) para vaciar el carrito en DB
  - Agregar endpoint DELETE / (vaciar todo) en `backend/routes/carrito.js` si no existe — `DELETE FROM carrito WHERE usuario_id = $1`
  - Manejar error silenciosamente si el DELETE falla (ya se limpió localStorage, no bloquear)
  - En `frontend/pages/confirmacion.html`: también llamar al backend para limpiar carrito como doble seguro

  **Must NOT do**:
  - NO bloquear la redirección si el backend falla (localStorage ya se limpió)
  - NO vaciar carritos de otros usuarios
  - NO modificar el flujo de redirect existente

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (con Tasks 11, 12)
  - **Parallel Group**: Wave 4
  - **Blocks**: None
  - **Blocked By**: Task 9

  **References**:
  **Pattern References**:
  - `frontend/pages/pago.html` - Página que lee status y payment_id del URL, limpia localStorage
  - `frontend/pages/confirmacion.html` - Página de confirmación que también limpia localStorage
  - `backend/routes/webhook.js` (modificado en Task 9) - Backend ya vacía carrito en webhook

  **WHY Each Reference Matters**:
  - pago.html: Es donde se detecta el pago exitoso — punto donde agregar la llamada al backend
  - confirmacion.html: Página final donde llegan después del pago — doble seguro para limpiar
  - webhook.js: El backend YA vacía el carrito en el webhook — la llamada frontend es un backup en caso de que el webhook no llegue primero

  **Acceptance Criteria**:
  - [ ] Pago exitoso: localStorage se limpia Y se llama DELETE /api/carrito al backend
  - [ ] Pago fallido: NO se limpia localStorage ni se llama DELETE
  - [ ] Si DELETE falla: no afecta la experiencia del usuario (localStorage ya limpio)
  - [ ] confirmacion.html también llama DELETE como backup

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Pago exitoso vacía carrito en backend
    Tool: Playwright
    Preconditions: Usuario autenticado con items en carrito DB, redirigido desde pasarela con ?status=approved
    Steps:
      1. Navegar a pago.html?status=approved&payment_id=123
      2. Verificar localStorage('carrito_guest') y localStorage('carrito_{id}') están vacíos
      3. Verificar backend: curl /api/carrito -H "Authorization: Bearer $TOKEN" retorna { items: [], total: 0 }
    Expected Result: Carrito vacío en localStorage y en backend
    Failure Indicators: Items restantes en carrito DB
    Evidence: .sisyphus/evidence/task-13-payment-clear.json

  Scenario: Pago fallido NO vacía carrito
    Tool: Bash (curl)
    Preconditions: Usuario con items en carrito DB
    Steps:
      1. Navegar a pago.html?status=rejected
      2. Verificar localStorage aún tiene items
      3. Verificar backend aún tiene items
    Expected Result: Carrito intacto
    Evidence: .sisyphus/evidence/task-13-payment-no-clear.json
  ```

  **Commit**: YES
  - Message: `feat(front): clear cart on payment confirmation (pago.html)`
  - Files: `frontend/pages/pago.html`, `frontend/pages/confirmacion.html`, `backend/routes/carrito.js`

---

## Final Verification Wave (MANDATORY — después de TODAS las tareas de implementación)

> 4 agentes de revisión ejecutan EN PARALELO. TODOS deben APPROVE. Presentar resultados consolidados al usuario y obtener aprobación explícita antes de marcar como completo.
>
> **NO auto-proceder después de verificación. Esperar aprobación explícita del usuario.**

- [x] F1. **Plan Compliance Audit** — `oracle` ✅ APPROVE
- [x] F2. **Code Quality Review** — `unspecified-high` ✅ APPROVE
- [x] F3. **Real Manual QA** — `unspecified-high` ✅ APPROVE
- [x] F4. **Scope Fidelity Check** — `deep` ✅ APPROVE
  Por cada tarea: leer "What to do", leer diff actual (git log/diff). Verificar 1:1 — todo en spec fue construido (nada faltante), nada fuera de spec fue construido (no scope creep). Chequear cumplimiento de "Must NOT do". Detectar contaminación cross-task: Task N tocando archivos del Task M. Marcar cambios no contabilizados.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Estrategia de Commits

- **Wave 1**: `feat(db): add carrito table and fix transacciones schema` - Task 1
- **Wave 1**: `docs(contracts): add external service API contracts` - Task 2
- **Wave 1**: `feat(cart): add cart route structure` - Task 3
- **Wave 2**: `feat(cart): add GET endpoint for authenticated cart` - Task 4
- **Wave 2**: `feat(cart): add POST endpoint to add items to cart` - Task 5
- **Wave 2**: `feat(cart): add PATCH endpoint for item quantity` - Task 6
- **Wave 2**: `feat(cart): add DELETE endpoint for cart items` - Task 7
- **Wave 3**: `feat(cart): add guest-to-user cart fusion endpoint` - Task 8
- **Wave 3**: `fix(cart): clear cart on payment confirmation webhook` - Task 9
- **Wave 3**: `feat(cart): add payment data endpoint for checkout` - Task 10
- **Wave 4**: `feat(front): sync cart on add-to-cart (main.js)` - Task 11
- **Wave 4**: `feat(front): merge guest cart on login (auth.js + carrito.js)` - Task 12
- **Wave 4**: `feat(front): clear cart on payment confirmation (pago.html)` - Task 13

---

## Criterios de Éxito

### Comandos de Verificación
```bash
# Tabla carrito existe con las columnas correctas
psql -c "\d carrito"  # Expected: id, usuario_id, producto_id, producto_nombre, precio_unitario, cantidad, created_at, updated_at

# Schema transacciones tiene columnas faltantes
psql -c "\d transacciones" | grep -E "items|usuario_email|total|moneda|referencia_pago_externa"  # Expected: all found

# GET carrito retorna items del usuario autenticado
curl -s http://localhost:3000/api/carrito -H "Authorization: Bearer $TOKEN" | jq .  # Expected: { items: [...], total: N }

# POST agrega item al carrito
curl -s -X POST http://localhost:3000/api/carrito -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"producto_id":"1","nombre":"Producto X","precio_unitario":100,"cantidad":2}' | jq .  # Expected: 201

# Carrito se vacía después de pago confirmado
# After webhook, GET /api/carrito should return empty items array
```

### Checklist Final
- [ ] Todos los "Must Have" presentes
- [ ] Ningún "Must NOT Have" presente
- [ ] Todos los endpoints funcionalan (curl verificable)
- [ ] Frontend sincroniza correctamente con backend