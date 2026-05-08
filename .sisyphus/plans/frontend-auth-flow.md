# Plan: Migración de Auth Flow (Modal → Redirect Externo)

## TL;DR

> **Quick Summary**: Eliminar el modal de login/register del frontend y reemplazar el flujo de autenticación con redirección a un servicio de auth externo. El token vuelve como query param `?token=xxx` y se captura en el checkout.

> **Deliverables**:
> - 8 archivos modificados (backend config, server.js, 3 JS frontend, 3 HTML)
> - Flujo: invitado → checkout → redirect externo → callback → continuar pago
> - login.html convertido a callback handler

> **Estimated Effort**: Medium
> **Parallel Execution**: YES — 1 wave, 8 tasks en paralelo
> **Critical Path**: Ninguna — todos los archivos son independientes

---

## Context

### Original Request
Usuario quiere CAMBIAR el flujo de auth actual (modal propio) a redirección externa. Cuando un usuario sin sesión hace clic en "Pagar", el frontend redirige al servicio de auth externo, que maneja login/register, y devuelve el token vía `?token=xxx` en la URL de redirect.

### Interview Summary
**Key Discussions**:
- **Callback page**: carrito.html captura el token al regresar del auth externo
- **External Auth URL**: `http://localhost:4000/auth` como placeholder
- **Backend endpoints**: Comentar con `/* */` (rollback seguro)
- **login.html**: Convertir a callback handler (procesa token + redirect)
- **Testing**: Sin tests automatizados — solo QA scenarios ejecutados por agente

**Research Findings**:
- 3 archivos frontend con API_URL truncado (`auth.js`, `main.js`, `carrito.js`)
- 3 HTML con modal de auth duplicado (`index.html`, `login.html`, `carrito.html`)
- `backend/config.js` tiene URLs truncadas (authServiceUrl, productosServiceUrl, etc.)
- `onLoginExitoso()` duplicado en 3 lugares
- No existe auth guard antes del checkout
- No existe callback handler para token-in-URL

### Metis Review
**Gaps Identified and Resolved**:
- **Callback location**: Resuelto → carrito.html captura token
- **External URL placeholder**: Resuelto → `http://localhost:4000/auth`
- **Backend endpoint handling**: Resuelto → comentar con `/* */`
- **login.html fate**: Resuelto → convertir a callback handler
- **Testing strategy**: Resuelto → agent-executed QA scenarios only
- **Multiple `onLoginExitoso()`**: Resuelto → eliminar todas las definiciones, la fusión de carrito se centraliza

---

## Work Objectives

### Core Objective
Migrar el flujo de autenticación del modal propio a redirección externa, arreglando las URLs truncadas y limpiando código duplicado.

### Concrete Deliverables
- `backend/config.js` — URLs completas
- `backend/server.js` — rutas `/api/auth/*` comentadas
- `frontend/js/auth.js` — API_URL fijo, sin modal, con utilidades de callback
- `frontend/js/main.js` — API_URL fijo, callback handler en page load, sin onLoginExitoso
- `frontend/js/carrito.js` — API_URL fijo, auth guard antes de checkout
- `frontend/index.html` — sin modal auth, sin onLoginExitoso
- `frontend/pages/login.html` — callback handler (procesa token, redirige)
- `frontend/pages/carrito.html` — sin modal auth, sin onLoginExitoso

### Definition of Done
- [ ] `grep -r "API_URL = 'http:" frontend/` → sin resultados (URLs completas)
- [ ] `grep -rn "abrirModal\|cerrarModal\|cambiarTab\|auth-modal" frontend/` → sin resultados (modales eliminados)
- [ ] `grep -rn "onLoginExitoso" frontend/` → sin resultados (función duplicada eliminada)
- [ ] `curl http://localhost:3000/api/auth/login` → `{}` o `Cannot POST` (ruta comentada)
- [ ] `grep -c "authServiceUrl.*http://localhost:4000" backend/config.js` → 1 (URL completa)

### Must Have
- [ ] API_URL completo en auth.js, main.js, carrito.js (no truncado)
- [ ] Sin código de modal login/register en auth.js ni HTML
- [ ] Al hacer clic "Pagar" sin token → redirect a `http://localhost:4000/auth/login?redirect=...`
- [ ] Al volver con `?token=xxx` en URL → token guardado en localStorage
- [ ] login.html procesa token y redirige

### Must NOT Have (Guardrails)
- [ ] NO crear archivos nuevos (excepto si es necesario para callback)
- [ ] NO modificar lógica de carrito existente (solo auth guard)
- [ ] NO cambiar estructura de base de datos
- [ ] NO introducir dependencias npm nuevas
- [ ] NO crear nuevos endpoints backend
- [ ] NO eliminar código backend — solo comentar rutas

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: NO
- **Automated tests**: None
- **Agent-Executed QA**: ALWAYS — cada tarea incluye escenarios QA específicos

### QA Policy
Every task will include agent-executed QA scenarios as the primary verification method.

- **Config/JS files**: Bash (grep, node -e "require(...)") — Verify content and exports
- **HTML files**: Bash (grep) — Verify removed elements are gone
- **Backend endpoints**: Bash (curl) — Verify commented routes return 404
- **Evidence**: Each scenario saves output to `.sisyphus/evidence/task-N-scenario.{ext}`

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (START INMEDIATELY — 8 tasks en PARALELO):
├── Task 1: Fix backend/config.js — URLs truncadas
├── Task 2: Refactor frontend/js/auth.js — API_URL + eliminar modal + utils callback
├── Task 3: Fix frontend/js/main.js — API_URL + callback handler
├── Task 4: Fix frontend/js/carrito.js — API_URL + auth guard
├── Task 5: Clean frontend/index.html — eliminar modal + onLoginExitoso
├── Task 6: Convert frontend/pages/login.html — callback handler
├── Task 7: Clean frontend/pages/carrito.html — eliminar modal + onLoginExitoso
└── Task 8: Comment out backend/server.js — /api/auth/* routes

Wave FINAL (después de TODAS las tareas):
├── Task F1: Plan Compliance Audit (oracle)
├── Task F2: Code Quality Review (unspecified-high)
├── Task F3: Real Manual QA (unspecified-high + playwright)
└── Task F4: Scope Fidelity Check (deep)
```

**Critical Path**: Ninguno — 100% paralelo en Wave 1
**Parallel Speedup**: ~8x más rápido que secuencial
**Max Concurrent**: 8 (Wave 1 completa)

---

## TODOs

- [x] 1. Fix URLs truncadas en `backend/config.js`

  **What to do**:
  - Completar las 4 URLs truncadas en el objeto `module.exports`:
    - `authServiceUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:4000'`
    - `productosServiceUrl: process.env.PRODUCTOS_SERVICE_URL || 'http://localhost:4001'`
    - `pagosServiceUrl: process.env.PAGOS_SERVICE_URL || 'http://localhost:4002'`
    - `tuLocalUrl: process.env.TU_LOCAL_URL || 'http://localhost:3000'`
  - Verificar que el archivo termina con `};` correctamente
  - No modificar ninguna otra propiedad (db, authApiKey, etc.)

  **Must NOT do**:
  - NO cambiar el nombre del archivo o moverlo
  - NO modificar la estructura de exportación
  - NO tocar las propiedades de `db`

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Cambio trivial de strings en un solo archivo
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**: Ninguna necesaria

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (Tasks 1-8)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `backend/config.js:19-48` — Archivo completo a modificar (leer primero para ver estado actual)
  - `backend/services/authClient.js:8` — `const BASE_URL = config.authServiceUrl` — confirma que authServiceUrl es el usado por authClient

  **Acceptance Criteria**:
  - [ ] `node -e "const c = require('./backend/config'); console.log(c.authServiceUrl)"` → `http://localhost:4000`
  - [ ] `node -e "const c = require('./backend/config'); console.log(c.productosServiceUrl)"` → `http://localhost:4001`
  - [ ] `node -e "const c = require('./backend/config'); console.log(c.pagosServiceUrl)"` → `http://localhost:4002`
  - [ ] `node -e "const c = require('./backend/config'); console.log(c.tuLocalUrl)"` → `http://localhost:3000`
  - [ ] `grep -c "'http:" backend/config.js` → 0 (ninguna URL truncada)

  **QA Scenarios**:

  ```
  Scenario: Verificar URLs completas en config.js
    Tool: Bash
    Preconditions: backend/config.js existe
    Steps:
      1. Ejecutar: node -e "const c = require('./backend/config'); console.log('auth:', c.authServiceUrl, 'productos:', c.productosServiceUrl, 'pagos:', c.pagosServiceUrl, 'tuLocal:', c.tuLocalUrl)"
      2. Verificar que las 4 URLs son completas (contienen 'http://' y el puerto completo)
    Expected Result: Ninguna URL contiene el valor truncado 'http:' — todas tienen puerto completo
    Failure Indicators: Cualquier URL que termine en 'http:' o no tenga puerto completo
    Evidence: .sisyphus/evidence/task-1-urls-verification.txt

  Scenario: require no lanza error
    Tool: Bash
    Preconditions: backend/config.js existe
    Steps:
      1. Ejecutar: node -e "require('./backend/config')"
    Expected Result: No lanza error, el módulo se carga correctamente
    Failure Indicators: Error de sintaxis o módulo no encontrado
    Evidence: .sisyphus/evidence/task-1-require-ok.txt
  ```

  **Evidence to Capture**:
  - [ ] task-1-urls-verification.txt
  - [ ] task-1-require-ok.txt

  **Commit**: YES
  - Message: `fix(config): complete truncated service URLs in config.js`
  - Files: `backend/config.js`

- [x] 2. Refactor `frontend/js/auth.js` — API_URL fijo, sin modal, con utils callback

  **What to do**:
  - **Arreglar API_URL**: línea 1, cambiar `'http:` → `'http://localhost:3000'`
  - **Eliminar funciones del modal**: `abrirModal()`, `cerrarModal()`, `cambiarTab()`, `handleLogin()`, `handleRegister()`
  - **Eliminar event listeners del modal**: cualquier `document.getElementById('btnLogin')?.addEventListener`, `document.getElementById('btnRegister')?.addEventListener`, `document.getElementById('cerrarModal')?.addEventListener`, etc.
  - **Eliminar variables DOM del modal**: `const modal`, `const loginForm`, etc.
  - **MANTENER**: `isLoggedIn()`, `getToken()`, `getUsuario()`, `logout()`, `renderAuthNav()`
  - **AGREGAR al final (después de module.exports pero antes si es script inline)**:
    - `const AUTH_LOGIN_URL = 'http://localhost:4000/auth/login?redirect=';`
    - `function guardarToken(token) { localStorage.setItem('token', token); }`
    - `function redirectToAuth() { window.location.href = AUTH_LOGIN_URL + encodeURIComponent(window.location.href); }`
  - Asegurar que `guardarToken()` y `redirectToAuth()` están accesibles globalmente (window)

  **Must NOT do**:
  - NO eliminar isLoggedIn, getToken, getUsuario, logout, renderAuthNav
  - NO cambiar el nombre del archivo
  - NO agregar imports externos (fetch, librerías)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Refactor moderado — mezcla de eliminar código y agregar nuevas funciones en un archivo existente
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (Tasks 1-8)
  - **Blocks**: None
  - **Blocked By**: None (los otros archivos JS no importan funciones del modal, solo usan isLoggedIn/getToken/getUsuario que se mantienen)

  **References**:
  - `frontend/js/auth.js:1-278` — Archivo completo a modificar (leer primero para entender estructura actual)
  - `frontend/js/main.js:4` — `const API_URL = 'http:...'` — mismo patrón de URL truncada
  - `frontend/js/carrito.js:113` — mismo patrón de URL truncada

  **Acceptance Criteria**:
  - [ ] `grep -n "abrirModal\|cerrarModal\|cambiarTab\|handleLogin\|handleRegister" frontend/js/auth.js` → 0 matches (funciones eliminadas)
  - [ ] `grep "API_URL = 'http://localhost:3000'" frontend/js/auth.js` → 1 match (URL completa)
  - [ ] `grep "AUTH_LOGIN_URL" frontend/js/auth.js` → 1 match (constante agregada)
  - [ ] `grep "redirectToAuth" frontend/js/auth.js` → 1 match (función agregada)
  - [ ] `grep "guardarToken" frontend/js/auth.js` → 1 match (función agregada)
  - [ ] `grep -n "isLoggedIn\|getToken\|getUsuario\|logout\|renderAuthNav" frontend/js/auth.js` → al menos 1 match cada una (funciones preservadas)

  **QA Scenarios**:

  ```
  Scenario: Funciones de modal eliminadas
    Tool: Bash
    Preconditions: auth.js modificado
    Steps:
      1. grep -n "abrirModal\|cerrarModal\|cambiarTab" frontend/js/auth.js
    Expected Result: Sin resultados (0 matches)
    Failure Indicators: Alguna función de modal aún existe
    Evidence: .sisyphus/evidence/task-2-modal-removed.txt

  Scenario: Funciones de callback agregadas
    Tool: Bash
    Preconditions: auth.js modificado
    Steps:
      1. grep "AUTH_LOGIN_URL\|guardarToken\|redirectToAuth" frontend/js/auth.js
    Expected Result: 3 matches (una por cada símbolo agregado)
    Failure Indicators: Alguna función no se agregó
    Evidence: .sisyphus/evidence/task-2-callback-added.txt

  Scenario: Funciones core preservadas
    Tool: Bash
    Preconditions: auth.js modificado
    Steps:
      1. grep "isLoggedIn\|getToken\|getUsuario" frontend/js/auth.js
    Expected Result: Al menos 1 match cada una
    Failure Indicators: Falta alguna función core
    Evidence: .sisyphus/evidence/task-2-core-preserved.txt
  ```

  **Evidence to Capture**:
  - [ ] task-2-modal-removed.txt
  - [ ] task-2-callback-added.txt
  - [ ] task-2-core-preserved.txt

  **Commit**: YES (agrupar con Tasks 3-4)
  - Message: `fix(frontend): fix API_URL, remove modal code, add auth redirect utils`
  - Files: `frontend/js/auth.js`

- [x] 3. Fix `frontend/js/main.js` — API_URL + callback handler en page load

  **What to do**:
  - **Arreglar API_URL**: línea 4, cambiar `'http:` → `'http://localhost:3000'` (o donde esté la línea exacta)
  - **Eliminar `onLoginExitoso()`**: remover completamente esta función y su lógica de cart merge
  - **Agregar al inicio del script** (después de API_URL):
    ```javascript
    // Callback handler para token de auth externo
    (function() {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      if (token) {
        localStorage.setItem('token', token);
        // Limpiar URL del token
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    })();
    ```
  - O mantén la lógica de cart merge pero invocada desde el callback handler en lugar de onLoginExitoso

  **Must NOT do**:
  - NO modificar `cargarProductos()`, `mostrarProductos()`, `agregarAlCarrito()`
  - NO cambiar lógica de carrito existente

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Cambios localizados — fix de string + agregar bloque IIFE
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (Tasks 1-8)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `frontend/js/main.js:1-125` — Archivo completo a modificar
  - `frontend/js/main.js:4` — Línea actual de API_URL (confirmar línea exacta al leer archivo)

  **Acceptance Criteria**:
  - [ ] `grep "API_URL = 'http://localhost:3000'" frontend/js/main.js` → 1 match
  - [ ] `grep "onLoginExitoso" frontend/js/main.js` → 0 matches
  - [ ] `grep "URLSearchParams\|window.location.search" frontend/js/main.js` → 1 match (callback handler)

  **QA Scenarios**:

  ```
  Scenario: API_URL completo
    Tool: Bash
    Preconditions: main.js modificado
    Steps:
      1. grep "API_URL" frontend/js/main.js | grep -v "//"
    Expected Result: Línea con `'http://localhost:3000'` (completo)
    Failure Indicators: URL truncada 'http:' o línea no encontrada
    Evidence: .sisyphus/evidence/task-3-api-url.txt

  Scenario: onLoginExitoso eliminado
    Tool: Bash
    Preconditions: main.js modificado
    Steps:
      1. grep "onLoginExitoso" frontend/js/main.js
    Expected Result: 0 matches
    Failure Indicators: La función aún existe
    Evidence: .sisyphus/evidence/task-3-onLoginExitoso-removed.txt

  Scenario: Token callback handler presente
    Tool: Bash
    Preconditions: main.js modificado
    Steps:
      1. grep "token\|URLSearchParams" frontend/js/main.js
    Expected Result: Lógica de callback handler presente (procesa ?token= de la URL)
    Failure Indicators: No hay código que procese el token de la URL
    Evidence: .sisyphus/evidence/task-3-callback.txt
  ```

  **Evidence to Capture**:
  - [ ] task-3-api-url.txt
  - [ ] task-3-onLoginExitoso-removed.txt
  - [ ] task-3-callback.txt

  **Commit**: YES (agrupar con Tasks 2, 4)
  - Message: `fix(frontend): fix API_URL and add token callback handler`
  - Files: `frontend/js/main.js`

- [x] 4. Fix `frontend/js/carrito.js` — API_URL + auth guard antes de checkout

  **What to do**:
  - **Arreglar API_URL**: línea 113 (o donde esté), cambiar `'http:` → `'http://localhost:3000'`
  - **Agregar auth guard en checkout**: Antes de ejecutar `procesarPagoConBackend()`, verificar si hay token:
    ```javascript
    function verificarAuthYProcesarPago() {
      if (!localStorage.getItem('token')) {
        // Guardar URL actual para redirect post-login
        localStorage.setItem('redirectAfterLogin', window.location.href);
        window.location.href = 'http://localhost:4000/auth/login?redirect=' + encodeURIComponent(window.location.href);
        return;
      }
      procesarPagoConBackend();
    }
    ```
  - **Agregar callback handler al inicio** (similar a main.js):
    ```javascript
    (function() {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      if (token) {
        localStorage.setItem('token', token);
        window.history.replaceState({}, document.title, window.location.pathname);
        // Continuar checkout si venía de auth
        if (typeof procesarPagoConBackend === 'function') {
          procesarPagoConBackend();
        }
      }
    })();
    ```
  - Reemplazar la llamada a `procesarPagoConBackend()` en el HTML/botón por `verificarAuthYProcesarPago()`

  **Must NOT do**:
  - NO modificar `procesarPagoConBackend()` internamente (solo agregar guard alrededor)
  - NO cambiar lógica de carrito (renderCarrito, vaciarCarrito, etc.)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Lógica de auth guard con redirect condicional — requiere entender el flujo de checkout
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (Tasks 1-8)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `frontend/js/carrito.js:1-137` — Archivo completo (leer para entender flujo checkout)
  - `frontend/pages/carrito.html` — el botón "Pagar" que llama al checkout (para cambiar el onclick)
  - `frontend/js/auth.js:1` — API_URL truncada (mismo patrón)

  **Acceptance Criteria**:
  - [ ] `grep "API_URL = 'http://localhost:3000'" frontend/js/carrito.js` → 1 match
  - [ ] `grep "verificarAuthYProcesarPago\|redirectAfterLogin" frontend/js/carrito.js` → al menos 1 match
  - [ ] `grep "http://localhost:4000/auth/login" frontend/js/carrito.js` → 1 match (URL del auth externo)
  - [ ] El código se puede analizar y se ve que el guard de auth redirige antes de procesar pago

  **QA Scenarios**:

  ```
  Scenario: API_URL completo
    Tool: Bash
    Preconditions: carrito.js modificado
    Steps:
      1. grep "API_URL" frontend/js/carrito.js
    Expected Result: URL completa 'http://localhost:3000'
    Failure Indicators: URL truncada 'http:'
    Evidence: .sisyphus/evidence/task-4-api-url.txt

  Scenario: Auth guard presente
    Tool: Bash
    Preconditions: carrito.js modificado
    Steps:
      1. grep "verificarAuthYProcesarPago\|localStorage.getItem.*token" frontend/js/carrito.js
    Expected Result: Función de auth guard que verifica token antes de checkout
    Failure Indicators: No se encuentra el auth guard
    Evidence: .sisyphus/evidence/task-4-auth-guard.txt

  Scenario: Redirect URL del auth externo configurada
    Tool: Bash
    Preconditions: carrito.js modificado
    Steps:
      1. grep "http://localhost:4000/auth/login" frontend/js/carrito.js
    Expected Result: 1 match con la URL del auth externo y redirect param
    Failure Indicators: URL faltante o incorrecta
    Evidence: .sisyphus/evidence/task-4-redirect-url.txt
  ```

  **Evidence to Capture**:
  - [ ] task-4-api-url.txt
  - [ ] task-4-auth-guard.txt
  - [ ] task-4-redirect-url.txt

  **Commit**: YES (agrupar con Tasks 2, 3)
  - Message: `fix(frontend): add auth guard before checkout in carrito.js`
  - Files: `frontend/js/carrito.js`

- [x] 5. Eliminar modal de auth de `frontend/index.html`

  **What to do**:
  - Buscar y eliminar el bloque HTML del modal de auth login/register (típicamente un `<div id="authModal" class="modal">...</div>` o similar)
  - Buscar y eliminar cualquier `<script>` inline que llame a `onLoginExitoso()` o funciones del modal
  - Buscar y eliminar `onclick="abrirModal('login')"` o similares en botones
  - Asegurar que el HTML sigue siendo válido después de la eliminación

  **Must NOT do**:
  - NO modificar el contenido principal (catálogo de productos, header, footer)
  - NO eliminar `<script src="js/auth.js">` (sigue siendo necesario para isLoggedIn/renderAuthNav)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Eliminación de bloques HTML — búsqueda y borrado simple
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (Tasks 1-8)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `frontend/index.html` — Archivo completo a modificar
  - `frontend/pages/login.html` — mismo patrón de modal a eliminar
  - `frontend/pages/carrito.html` — mismo patrón de modal a eliminar

  **Acceptance Criteria**:
  - [ ] `grep "authModal\|auth-modal\|abrirModal\|cerrarModal" frontend/index.html` → 0 matches
  - [ ] `grep "onLoginExitoso" frontend/index.html` → 0 matches
  - [ ] `grep -c "js/auth.js" frontend/index.html` → 1 (script tag preservado)

  **QA Scenarios**:

  ```
  Scenario: Modal markup eliminado
    Tool: Bash
    Preconditions: index.html modificado
    Steps:
      1. grep -n "authModal\|id=\"auth" frontend/index.html
    Expected Result: 0 matches
    Failure Indicators: Código de modal aún presente
    Evidence: .sisyphus/evidence/task-5-modal-removed.txt

  Scenario: onLoginExitoso eliminado
    Tool: Bash
    Preconditions: index.html modificado
    Steps:
      1. grep "onLoginExitoso" frontend/index.html
    Expected Result: 0 matches
    Failure Indicators: Función aún referenciada
    Evidence: .sisyphus/evidence/task-5-onLoginExitoso.txt

  Scenario: auth.js script preservado
    Tool: Bash
    Preconditions: index.html modificado
    Steps:
      1. grep "src=.*auth\.js" frontend/index.html
    Expected Result: 1 match
    Failure Indicators: Script tag de auth.js eliminado accidentalmente
    Evidence: .sisyphus/evidence/task-5-authjs-preserved.txt
  ```

  **Evidence to Capture**:
  - [ ] task-5-modal-removed.txt
  - [ ] task-5-onLoginExitoso.txt
  - [ ] task-5-authjs-preserved.txt

  **Commit**: YES (agrupar con Tasks 6, 7)
  - Message: `refactor(frontend): remove auth modal from index.html`
  - Files: `frontend/index.html`

- [x] 6. Convertir `frontend/pages/login.html` a callback handler

  **What to do**:
  - **NO eliminar el archivo** — convertirlo en callback handler
  - Reemplazar el contenido del `<body>` con:
    ```html
    <div style="display:flex;justify-content:center;align-items:center;min-height:100vh;font-family:sans-serif;">
      <div style="text-align:center;">
        <h2>Procesando autenticación...</h2>
        <p>Espere un momento mientras verificamos su sesión.</p>
      </div>
    </div>
    ```
  - Reemplazar el `<script>` inline con:
    ```javascript
    (function() {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      if (token) {
        localStorage.setItem('token', token);
        // Redirigir al checkout o al inicio
        const redirect = params.get('redirect') || '../index.html';
        window.location.href = redirect;
      } else {
        // No hay token — redirigir al auth externo
        window.location.href = 'http://localhost:4000/auth/login?redirect=' + 
          encodeURIComponent(window.location.href);
      }
    })();
    ```
  - Mantener el `<head>` con title y charset
  - Eliminar todo el markup del login form

  **Must NOT do**:
  - NO eliminar el archivo login.html
  - NO redirigir a páginas que no existen

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Reemplazo de contenido HTML — template fijo + script corto
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (Tasks 1-8)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `frontend/pages/login.html` — Archivo completo a modificar (leer primero)
  - `frontend/js/auth.js` — token storage pattern ya definido en auth.js

  **Acceptance Criteria**:
  - [ ] `grep "form\|input\|password\|registro\|login-form\|id=\"email" frontend/pages/login.html` → 0 matches (formulario eliminado)
  - [ ] `grep "URLSearchParams.*token\|localStorage.setItem.*token" frontend/pages/login.html` → 1 match (callback handler)
  - [ ] `grep "http://localhost:4000/auth/login" frontend/pages/login.html` → 1 match (redirect externo si no hay token)

  **QA Scenarios**:

  ```
  Scenario: Formulario de login eliminado
    Tool: Bash
    Preconditions: login.html modificado
    Steps:
      1. grep -c "input\|form\|password" frontend/pages/login.html
    Expected Result: Solo tags de input/form/password del nuevo contenido de callback (título, texto simple)
    Failure Indicators: Formulario de login/register aún presente
    Evidence: .sisyphus/evidence/task-6-login-form-removed.txt

  Scenario: Token callback handler presente
    Tool: Bash
    Preconditions: login.html modificado
    Steps:
      1. grep "URLSearchParams\|localStorage.setItem.*token" frontend/pages/login.html
    Expected Result: Código que procesa token de la URL y lo guarda en localStorage
    Failure Indicators: No hay lógica de callback
    Evidence: .sisyphus/evidence/task-6-callback.txt

  Scenario: Redirección al auth externo si no hay token
    Tool: Bash
    Preconditions: login.html modificado
    Steps:
      1. grep "localhost:4000/auth/login" frontend/pages/login.html
    Expected Result: 1 match con redirect URL
    Failure Indicators: No hay fallback redirect
    Evidence: .sisyphus/evidence/task-6-redirect.txt
  ```

  **Evidence to Capture**:
  - [ ] task-6-login-form-removed.txt
  - [ ] task-6-callback.txt
  - [ ] task-6-redirect.txt

  **Commit**: YES (agrupar con Tasks 5, 7)
  - Message: `refactor(frontend): convert login.html to auth callback handler`
  - Files: `frontend/pages/login.html`

- [x] 7. Eliminar modal de auth de `frontend/pages/carrito.html`

  **What to do**:
  - Buscar y eliminar el bloque HTML del modal de auth (similar a index.html)
  - Eliminar cualquier `<script>` inline con `onLoginExitoso()`
  - Eliminar `onclick="abrirModal('login')"` del botón de pagar — reemplazar con `onclick="verificarAuthYProcesarPago()"` (la función creada en Task 4)
  - Asegurar que `<script src="../js/carrito.js">` y `<script src="../js/auth.js">` están presentes

  **Must NOT do**:
  - NO modificar la estructura del carrito (tabla, items, total)
  - NO eliminar scripts necesarios

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Eliminación de bloques HTML + cambio de onclick
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (Tasks 1-8)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `frontend/pages/carrito.html` — Archivo completo a modificar
  - `frontend/index.html` — mismo patrón de modal (usar como referencia)
  - `frontend/js/carrito.js` — Task 4 agregó `verificarAuthYProcesarPago()`

  **Acceptance Criteria**:
  - [ ] `grep "authModal\|auth-modal\|abrirModal\|cerrarModal" frontend/pages/carrito.html` → 0 matches
  - [ ] `grep "onLoginExitoso" frontend/pages/carrito.html` → 0 matches
  - [ ] `grep "verificarAuthYProcesarPago" frontend/pages/carrito.html` → al menos 1 match (botón pagar actualizado)
  - [ ] `grep -c "js/carrito.js" frontend/pages/carrito.html` → 1 (script preservado)
  - [ ] `grep -c "js/auth.js" frontend/pages/carrito.html` → 1 (script preservado)

  **QA Scenarios**:

  ```
  Scenario: Modal eliminado
    Tool: Bash
    Preconditions: carrito.html modificado
    Steps:
      1. grep "authModal\|abrirModal" frontend/pages/carrito.html
    Expected Result: 0 matches
    Failure Indicators: Modal aún presente
    Evidence: .sisyphus/evidence/task-7-modal-removed.txt

  Scenario: Botón pagar actualizado a verificarAuthYProcesarPago
    Tool: Bash
    Preconditions: carrito.html modificado
    Steps:
      1. grep "verificarAuthYProcesarPago\|onclick.*pagar\|onclick.*Pagar" frontend/pages/carrito.html
    Expected Result: Botón checkout usa verificarAuthYProcesarPago()
    Failure Indicators: Botón aún usa abrirModal() o onclick antiguo
    Evidence: .sisyphus/evidence/task-7-checkout-btn.txt

  Scenario: Scripts preservados
    Tool: Bash
    Preconditions: carrito.html modificado
    Steps:
      1. grep "src=.*auth\.js\|src=.*carrito\.js" frontend/pages/carrito.html
    Expected Result: Ambos scripts presentes
    Failure Indicators: Falta auth.js o carrito.js
    Evidence: .sisyphus/evidence/task-7-scripts-preserved.txt
  ```

  **Evidence to Capture**:
  - [ ] task-7-modal-removed.txt
  - [ ] task-7-checkout-btn.txt
  - [ ] task-7-scripts-preserved.txt

  **Commit**: YES (agrupar con Tasks 5, 6)
  - Message: `refactor(frontend): remove auth modal from carrito.html`
  - Files: `frontend/pages/carrito.html`

- [x] 8. Comentar rutas `/api/auth/*` en `backend/server.js`

  **What to do**:
  - Buscar las rutas `/api/auth/register`, `/api/auth/login`, `/api/auth/me` en server.js
  - Envolver CADA UNA con `/* ... */` para deshabilitarlas pero preservarlas para rollback
  - Si las rutas están en un bloque contiguo (ej: `// Auth Routes`), comentar todo el bloque
  - Ejemplo de resultado:
    ```javascript
    /*
    app.post('/api/auth/register', async (req, res) => {
      // ... código existente ...
    });

    app.post('/api/auth/login', async (req, res) => {
      // ... código existente ...
    });

    app.get('/api/auth/me', verificarToken, async (req, res) => {
      // ... código existente ...
    });
    */
    ```
  - Verificar que `verificarToken` middleware no sea necesario para otras rutas
  - Si `verificarToken` se usa SOLO en estas rutas, comentarlo también o dejarlo (no hace daño)

  **Must NOT do**:
  - NO eliminar el código — solo comentar
  - NO comentar otras rutas (transacciones, etc.)
  - NO modificar ninguna otra funcionalidad

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Comentar bloques de código — operación simple y reversible
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (Tasks 1-8)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `backend/server.js` — Archivo completo (buscar rutas app.post/app.get con /api/auth/)
  - `backend/routes/transacciones.js` — Verificar que verificarToken se importa y usa aquí (puede que no, si solo se usaba para auth/me)

  **Acceptance Criteria**:
  - [ ] `grep "app\.\(post\|get\).*/api/auth/" backend/server.js` → debe estar dentro de `/* */`
  - [ ] `curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/auth/register` → 404
  - [ ] `curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/auth/login` → 404
  - [ ] `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/auth/me` → 404
  - [ ] El código original sigue presente (comentado, no eliminado)

  **QA Scenarios**:

  ```
  Scenario: Rutas auth devuelven 404
    Tool: Bash
    Preconditions: Backend iniciado (cd backend && npm start)
    Steps:
      1. curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/auth/register -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"123"}'
      2. curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"123"}'
      3. curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/auth/me
    Expected Result: Las 3 rutas devuelven 404
    Failure Indicators: Cualquier ruta devuelve 200, 201, 400, 401 o 500 (indica que la ruta sigue activa)
    Evidence: .sisyphus/evidence/task-8-endpoints-404.txt

  Scenario: Código original preservado (comentado)
    Tool: Bash
    Preconditions: server.js modificado
    Steps:
      1. grep "/api/auth/register" backend/server.js
    Expected Result: La línea existe (no fue eliminada) — está dentro de un comentario /* */
    Failure Indicators: No se encuentra la ruta (fue eliminada)
    Evidence: .sisyphus/evidence/task-8-code-preserved.txt
  ```

  **Evidence to Capture**:
  - [ ] task-8-endpoints-404.txt
  - [ ] task-8-code-preserved.txt

  **Commit**: YES
  - Message: `chore(backend): comment out /api/auth/* endpoints for external auth migration`
  - Files: `backend/server.js`

---

## Final Verification Wave

> 4 review agents run in PARALLEL. ALL must APPROVE.

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (grep, read file). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Review all changed files for: `console.log` remnants, commented-out dead code (beyond intentional `/* */`), unused variables, inconsistent indentation. Check AI slop: excessive comments, over-abstraction, generic names.
  Output: `Files [N clean/N issues] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill if UI)
  Start frontend and backend. Execute EVERY QA scenario from EVERY task. Test cross-task integration: auth guard → redirect → callback → token saved → checkout. Test edge cases: no token, invalid token, returning with token. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | VERDICT`

---

## Commit Strategy

- **1-4**: `fix(config): complete truncated service URLs in config.js` — backend/config.js
- **5-7**: `fix(frontend): fix truncated API_URL in auth.js, main.js, carrito.js` — frontend/js/*.js
- **8-10**: `refactor(frontend): remove auth modal, add redirect, convert login.html to callback` — frontend/html + js
- **11**: `chore(backend): comment out /api/auth/* endpoints for external auth migration` — backend/server.js

---

## Success Criteria

### Verification Commands
```bash
# 1. No truncated URLs in frontend
grep -rn "API_URL = 'http:" frontend/js/
# Expected: no results

# 2. No modal code remains
grep -rn "abrirModal\|cerrarModal\|cambiarTab\|auth-modal" frontend/
# Expected: no results

# 3. Backend auth endpoints commented out
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/auth/login
# Expected: 404

# 4. External auth URL configured
node -e "console.log(require('./backend/config').authServiceUrl)"
# Expected: http://localhost:4000

# 5. Auth guard exists in carrito.js
grep -n "AUTH_LOGIN_URL\|redirect.*auth" frontend/js/carrito.js
# Expected: at least 1 match
```

### Final Checklist
- [x] All "Must Have" present
- [x] All "Must NOT Have" absent
- [x] All QA scenarios pass
