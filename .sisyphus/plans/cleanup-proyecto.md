# Plan: Limpieza de Basura del Proyecto

## TL;DR

> **Quick Summary**: Eliminar ~50 archivos basura (tests, logs, scripts temporales, outputs de QA, planes obsoletos) que ensucian el proyecto. Conservar solo el código de producción del microservicio carrito de compras.
> 
> **Deliverables**:
> - Proyecto limpio: solo archivos de producción (backend, frontend, DB, docs)
> - ~50 archivos basura eliminados (~150KB liberados)
> - `.gitignore` actualizado si es necesario
> 
> **Estimated Effort**: Quick
> **Parallel Execution**: YES — 1 wave
> **Critical Path**: Ninguno (todos los deletes son independientes)

---

## Context

### Original Request
El usuario pide eliminar toda la basura de código, txt, test que esté dentro del proyecto y que no sirva para la API de conexiones o que no afecte al microservicio carrito de compras. Conservar lo relacionado a historias de usuario y lo ya implementado.

### Inventario del Proyecto
Se realizó inventario completo del proyecto. Total: 110 archivos (excluyendo `node_modules/` y `.git/`).

De esos, ~50 son basura identificable.

---

## Work Objectives

### Core Objective
Eliminar todos los archivos que no son código de producción del microservicio carrito de compras.

### Archivos que se CONSERVAN (~61 archivos esenciales)

| Categoría | Archivos |
|---|---|
| **Root** | `.env`, `.gitignore`, `AGENTS.md`, `README.md` |
| **Backend** | `.env`, `AGENTS.md`, `config.js`, `server.js`, `package.json`, `package-lock.json` |
| **Backend/routes** | `carrito.js`, `checkout.js`, `direcciones.js`, `eventos.js`, `pedidos.js`, `productos.js`, `transacciones.js`, `vendedor.js`, `vendedorMiddleware.js`, `webhook.js` |
| **Backend/services** | `authClient.js`, `notificacionesPedidosClient.js`, `pagosClient.js`, `productosClient.js` |
| **Database** | `migrations/001-008*.sql` (8 archivos) |
| **Frontend** | `AGENTS.md`, `index.html`, `css/styles.css` |
| **Frontend/js** | `auth.js`, `carrito.js`, `checkout.js`, `main.js`, `pedidos.js`, `recomendaciones.js`, `vendedor.js` |
| **Frontend/pages** | `carrito.html`, `checkout.html`, `confirmacion.html`, `login.html`, `pago.html`, `pedidos.html`, `recomendaciones.html`, `vendedor.html` |
| **Frontend config** | `package.json`, `package-lock.json` |
| **Docs** | `docs/api-externa.md`, `docs/arquitectura.md`, `docs/setup.md` |
| **.sisyphus** | `boulder.json`, `plans/carrito-backlog-completo.md`, `notepads/carrito-backlog-completo/*.md` (3 archivos) |

### Must NOT Delete (Guardrails)
- ❌ No tocar `node_modules/` — se regenera con `npm install`
- ❌ No tocar `.git/` — historial de git
- ❌ No tocar archivos de producción: backend/routes, backend/services, frontend/js, frontend/pages
- ❌ No tocar migraciones SQL
- ❌ No tocar `boulder.json` (estado activo de trabajo)
- ❌ No tocar plan activo: `carrito-backlog-completo.md`

---

## Verification Strategy

> Sin tests automatizados. Verificación por conteo de archivos y `git status`.

### QA Policy
- **Backend**: `node --check` en cada archivo modificado
- **Verificación**: `git status --short` después de limpiar — solo deben quedar archivos esenciales modificados
- **Servidor**: Verificar que `npm run dev` arranca sin errores después de la limpieza

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — todos independientes):
├── Task 1: Eliminar basura raíz (~20 archivos tmp/test/qa) [quick]
├── Task 2: Eliminar logs del backend (4 archivos .log + test-out.txt) [quick]
├── Task 3: Eliminar basura .sisyphus/ (logs, scripts, verify) [quick]
├── Task 4: Eliminar evidencia QA antigua (.sisyphus/evidence) [quick]
├── Task 5: Eliminar planes obsoletos (.sisyphus/plans/*.md excepto activo) [quick]
├── Task 6: Eliminar run-continuation antiguo (.sisyphus/run-continuation/*.json) [quick]
├── Task 7: Eliminar notepad antiguo (carrito-microservicio/learnings.md) [quick]
└── Task 8: Verificación final + git status [quick]
```

**Max Concurrent**: 7 (Tasks 1-7 pueden correr en paralelo)

---

## TODOs

- [x] 1. Eliminar basura raíz (~24 archivos tmp/test/qa)

  **What to do**:
  - Eliminar todos los archivos de output/QA/temp en la raíz del proyecto:
    ```
    login_result.json
    qa-curl-output.txt
    qa-debug.txt
    qa-results.txt
    test_results.json
    test_simple.txt
    test1_root.json
    test2_login.json
    test-output.txt
    test-raw.txt
    tmp_agregar.txt
    tmp_all_routes.txt
    tmp_carrito.txt
    tmp_check.txt
    tmp_fixes_verify.txt
    tmp_more_routes.txt
    tmp_post_migrate.txt
    tmp_response.txt
    tmp_response2.txt
    tmp_token2.txt
    tmp_transacciones.txt
    tmp_vendor.txt
    f3-manual-qa.js
    DEV_CHANGES.md
    ```
  - Comando PowerShell: `Remove-Item -Path "C:\Users\Angel\Sistema_D_Compra\login_result.json", "C:\Users\Angel\Sistema_D_Compra\qa-*.txt", "C:\Users\Angel\Sistema_D_Compra\test*.*", "C:\Users\Angel\Sistema_D_Compra\tmp_*.txt", "C:\Users\Angel\Sistema_D_Compra\f3-manual-qa.js", "C:\Users\Angel\Sistema_D_Compra\DEV_CHANGES.md" -Force`

  **Must NOT do**:
  - NO eliminar `.env`, `.gitignore`, `AGENTS.md`, `README.md`

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2-7)
  - **Blocks**: None
  - **Blocked By**: None

  **QA Scenarios**:
  ```
  Scenario: No quedan archivos tmp/test en raíz
    Tool: Bash (PowerShell)
    Steps:
      1. Get-ChildItem -Path "C:\Users\Angel\Sistema_D_Compra" -File | Where-Object { $_.Name -match '^(tmp_|test|qa|login_result|f3-manual|DEV_CHANGES)' }
    Expected Result: 0 archivos encontrados
    Evidence: .sisyphus/evidence/cleanup-task-1-verify.txt
  ```

  **Commit**: YES
  - Message: `chore(cleanup): eliminar archivos basura de raíz`
  - Files: 24 archivos eliminados

- [x] 2. Eliminar logs del backend (4 archivos)

  **What to do**:
  - Eliminar logs y output de test en `backend/`:
    ```
    backend/server.log
    backend/server-err.log
    backend/server-out.log
    backend/test-out.txt
    ```

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3-7)
  - **Blocks**: None
  - **Blocked By**: None

  **QA Scenarios**:
  ```
  Scenario: No quedan logs en backend/
    Tool: Bash (PowerShell)
    Steps:
      1. Get-ChildItem -Path "C:\Users\Angel\Sistema_D_Compra\backend" -File | Where-Object { $_.Name -match '\.log$|test-out' }
    Expected Result: 0 archivos encontrados
    Evidence: .sisyphus/evidence/cleanup-task-2-verify.txt
  ```

  **Commit**: YES
  - Message: `chore(cleanup): eliminar logs del backend`

- [x] 3. Eliminar basura .sisyphus/ — logs, scripts, verify

  **What to do**:
  - Eliminar archivos temporales y scripts en `.sisyphus/`:
    ```
    .sisyphus/cleanup-backup.ps1
    .sisyphus/debug.txt
    .sisyphus/test-error.log
    .sisyphus/test-output.log
    .sisyphus/verify-v2.js
    .sisyphus/file-inventory.txt
    ```

  **Must NOT do**:
  - NO eliminar `.sisyphus/boulder.json`
  - NO eliminar `.sisyphus/plans/carrito-backlog-completo.md`
  - NO eliminar `.sisyphus/notepads/`

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-2, 4-7)

  **QA Scenarios**:
  ```
  Scenario: Solo quedan boulder.json y carpetas activas en .sisyphus/
    Tool: Bash (PowerShell)
    Steps:
      1. Get-ChildItem -Path "C:\Users\Angel\Sistema_D_Compra\.sisyphus" -File | Where-Object { $_.Name -notmatch 'boulder' }
    Expected Result: 0 archivos sueltos (solo boulder.json)
    Evidence: .sisyphus/evidence/cleanup-task-3-verify.txt
  ```

  **Commit**: YES
  - Message: `chore(cleanup): eliminar scripts temporales de .sisyphus/`

- [x] 4. Eliminar evidencia QA antigua (.sisyphus/evidence/)

  **What to do**:
  - Eliminar toda la evidencia QA antigua:
    ```
    .sisyphus/evidence/final-qa/f1-plan-compliance.txt
    .sisyphus/evidence/final-qa/f2-code-quality.txt
    .sisyphus/evidence/final-qa/f4-scope-fidelity.txt
    ```
  - Si `.sisyphus/evidence/` queda vacío, eliminar también el directorio

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-3, 5-7)

  **QA Scenarios**:
  ```
  Scenario: Directorio evidence eliminado o vacío
    Tool: Bash (PowerShell)
    Steps:
      1. Test-Path "C:\Users\Angel\Sistema_D_Compra\.sisyphus\evidence"
    Expected Result: False (no existe)
    Evidence: .sisyphus/evidence/cleanup-task-4-verify.txt
  ```

  **Commit**: YES
  - Message: `chore(cleanup): eliminar evidencia QA antigua`

- [x] 5. Eliminar planes obsoletos (.sisyphus/plans/ excepto activo)

  **What to do**:
  - Conservar solo: `.sisyphus/plans/carrito-backlog-completo.md` y `.sisyphus/plans/cleanup-proyecto.md`
  - Eliminar todos los demás:
    ```
    .sisyphus/plans/fix-frontend-apierror.md
    .sisyphus/plans/fix-productos-mock.md
    .sisyphus/plans/init-deep-agents-md.md
    .sisyphus/plans/migraciones-verificacion.md
    .sisyphus/plans/mock-endpoints-dev-changes.md
    .sisyphus/plans/mock-endpoints-remaining-tasks.md
    .sisyphus/plans/mock-endpoint-tests.md
    ```

  **Must NOT do**:
  - NO eliminar `carrito-backlog-completo.md` (plan activo)
  - NO eliminar `cleanup-proyecto.md` (este plan)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-4, 6-7)

  **QA Scenarios**:
  ```
  Scenario: Solo quedan 2 planes activos
    Tool: Bash (PowerShell)
    Steps:
      1. Get-ChildItem -Path ".sisyphus/plans/*.md" | Select-Object Name
    Expected Result: carrito-backlog-completo.md, cleanup-proyecto.md
    Evidence: .sisyphus/evidence/cleanup-task-5-verify.txt
  ```

  **Commit**: YES
  - Message: `chore(cleanup): eliminar planes obsoletos`

- [x] 6. Eliminar run-continuation antiguo

  **What to do**:
  - Eliminar todos los archivos `.sisyphus/run-continuation/ses_*.json` (5 archivos)
  - Estos son datos de sesiones anteriores que ya no son necesarios

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-5, 7)

  **QA Scenarios**:
  ```
  Scenario: Directorio run-continuation vacío
    Tool: Bash (PowerShell)
    Steps:
      1. Get-ChildItem -Path ".sisyphus/run-continuation/*.json" 2>$null
    Expected Result: 0 archivos
    Evidence: .sisyphus/evidence/cleanup-task-6-verify.txt
  ```

  **Commit**: YES
  - Message: `chore(cleanup): eliminar run-continuation antiguo`

- [x] 7. Eliminar notepad antiguo (carrito-microservicio)

  **What to do**:
  - Eliminar `.sisyphus/notepads/carrito-microservicio/learnings.md` (notepad del plan viejo)
  - Conservar solo `.sisyphus/notepads/carrito-backlog-completo/` (notepad activo)

  **Must NOT do**:
  - NO eliminar `.sisyphus/notepads/carrito-backlog-completo/`

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-6)

  **QA Scenarios**:
  ```
  Scenario: Solo existe notepad activo
    Tool: Bash (PowerShell)
    Steps:
      1. Get-ChildItem -Path ".sisyphus/notepads" -Directory
    Expected Result: Solo carrito-backlog-completo
    Evidence: .sisyphus/evidence/cleanup-task-7-verify.txt
  ```

  **Commit**: YES
  - Message: `chore(cleanup): eliminar notepad antiguo`

- [x] 8. Verificación final de integridad

  **What to do**:
  - Verificar que el servidor compila: `node --check backend/server.js`
  - Verificar git status — solo archivos esenciales deben aparecer
  - Contar archivos restantes (deben ser ~61 sin node_modules)
  - Verificar estructura: backend/routes (10 files), backend/services (4 files), frontend/js (7 files), frontend/pages (8 files), migrations (8 files)
  - Eliminar `.sisyphus/evidence/` si quedó vacío
  - Eliminar `.sisyphus/file-inventory.txt` si existe

  **Must NOT do**:
  - NO modificar archivos de código
  - NO tocar node_modules

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO (depende de Tasks 1-7 completadas)
  - **Parallel Group**: Final
  - **Blocks**: None
  - **Blocked By**: Tasks 1-7

  **QA Scenarios**:
  ```
  Scenario: Servidor compila y proyecto limpio
    Tool: Bash (PowerShell)
    Steps:
      1. node --check backend/server.js
      2. node --check backend/routes/*.js
      3. git -C . status --short -- ':!node_modules'
    Expected Result: node --check PASS, git status muestra solo esenciales
    Evidence: .sisyphus/evidence/cleanup-task-8-verify.txt
  ```

  **Commit**: NO (solo verificación)

---

## Final Verification Wave

- [x] F1. **Verificación de integridad** — `quick`
  - `node --check backend/server.js` → PASS
  - `git status --short` → solo archivos esenciales modificados
  - Verificar que el servidor arranca (`npm run dev` en backend)
  - Contar archivos restantes: deben ser ~61 (esenciales)

---

## Commit Strategy

- **1**: `chore(cleanup): eliminar ~50 archivos basura del proyecto` — todos los archivos eliminados

---

## Success Criteria

### Verification Commands
```powershell
# Verificar que no hay archivos basura en raíz
Get-ChildItem -Path "." -File | Where-Object { $_.Name -like "tmp_*" -or $_.Name -like "test*" -or $_.Name -like "qa*" }

# Verificar que el servidor compila
node --check backend/server.js

# Contar archivos del proyecto
(Get-ChildItem -Recurse -File -Exclude "node_modules" | Where-Object { $_.FullName -notlike "*\.git\*" }).Count
# Expected: ~61 (sin node_modules)
```

### Final Checklist
- [ ] 0 archivos basura en raíz del proyecto
- [ ] 0 logs en backend/
- [ ] 0 scripts temporales en .sisyphus/
- [ ] Solo plan activo (carrito-backlog-completo.md) en .sisyphus/plans/
- [ ] Servidor arranca sin errores
