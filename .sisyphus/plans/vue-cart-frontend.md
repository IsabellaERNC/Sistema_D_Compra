# Vue 3 Cart-Focused Frontend

## TL;DR

> **Quick Summary**: Migrate from vanilla HTML/CSS/JS to Vue 3 SPA, focusing exclusively on the shopping cart flow (cart → checkout → payment → orders). Remove demo pages for external services (auth, catalog). Apply premium visual design system.

> **Deliverables**: 
> - Vue 3 SPA with 7 routes (/, /carrito, /checkout, /pago, /confirmacion, /pedidos, /vendedor)
> - Pinia stores for auth, cart, and products
> - Fresh CSS design system (~350 lines, cart-optimized)
> - Reusable Vue components (AppHeader, CartItem, OrderCard)
> - Legacy code cleanup (delete pages/*.html and js/*.js)

> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: T1 → T5 → T7 → T12 → T14

---

## Context

### Original Request
User: "analiza todo el frontend y vas a cambiarlo a en vez de usar puro html y css hazlo en vue... centrate en el carrito y en lo que si cumple mi microservicio como carrito de compras"

Follow-up: "lo de frontend de auth y catalogo es algo de los otros microservicios solo era para demostrar que si sirve asi que no hace parte de mi frontend... quiero que hagas todo el frontend de carrito mas lindo"

### Interview Summary
**Key Discussions**:
- **Stack**: Vue 3 Composition API (`<script setup>`), Vue Router 4, Pinia — already installed in package.json
- **Scope**: Only cart-related views. Auth login/callback and product catalog are external services — NOT included
- **Design**: Premium visual design for cart experience. Clean, modern, Indigo primary palette
- **Redirect**: Root `/` redirects to `/carrito` since cart is the core experience

**Research Findings**:
- Vue ecosystem dependencies already installed (vue, pinia, vue-router, @vitejs/plugin-vue)
- Vite config already has vue plugin
- Backend API has 28+ endpoints, factory pattern compliant
- Cart endpoints: GET/POST/PUT/DELETE /api/carrito/*, POST /api/checkout/iniciar, GET/PATCH /api/pedidos/*
- Legacy code in `frontend/pages/*.html` and `frontend/js/*.js` needs removal

### Metis Review
**Identified Gaps** (addressed):
- Home page behavior: Redirect to `/carrito` since no product catalog
- Guest→user cart: Auto-fusionar on login (existing backend endpoint `/api/carrito/fusionar`)
- Error states: Alert-based for now, consistent with existing approach
- WebSocket: Client connects for real-time order status updates
- Payment redirect: Handled via URL query params (`?status=`)
- Responsive: Mobile-first with breakpoint at 640px
- Loading states: Spinner + empty state patterns
- Vendor panel: Protected by store-level role check, redirect non-vendors

---

## Work Objectives

### Core Objective
Build a beautiful, Vue 3 SPA for the shopping cart microservice — managing cart items, checkout, payment status, order tracking, and vendor order management.

### Concrete Deliverables
- `frontend/src/main.js` — App entry with Pinia + Router
- `frontend/src/App.vue` — Root layout
- `frontend/src/router/index.js` — 7 routes
- `frontend/src/stores/auth.js` — Auth state (token, user, isVendedor)
- `frontend/src/stores/cart.js` — Cart state (items, CRUD, totals, backend sync)
- `frontend/public/css/styles.css` — Cart-focused design system
- `frontend/src/components/AppHeader.vue` — Nav + cart badge + profile dropdown
- `frontend/src/views/CartView.vue` — Main cart view
- `frontend/src/views/CheckoutView.vue` — Order summary + payment initiation
- `frontend/src/views/PaymentView.vue` — Payment status display
- `frontend/src/views/ConfirmationView.vue` — Purchase confirmation
- `frontend/src/views/OrdersView.vue` — Order history with expandable cards
- `frontend/src/views/VendorView.vue` — Vendor panel with state transitions
- Legacy cleanup: delete `frontend/pages/`, `frontend/js/`, old backups

### Definition of Done
- [ ] `npm run build` completes with 0 errors
- [ ] Cart flow: add item → view cart → change qty → checkout → payment redirect

### Must Have
- Vue 3 Composition API with `<script setup>`
- Pinia stores for global state
- Lazy-loaded routes (code splitting)
- Mobile-responsive layout
- Cart badging in header (real-time count)
- Guest cart (localStorage) + authenticated cart (backend API) support
- Backend cart API calls authenticated with Bearer token

### Must NOT Have (Guardrails)
- ❌ Product catalog view — external microservice
- ❌ Auth login/register pages — external microservice (only callback handler)
- ❌ Test files — no test infrastructure needed
- ❌ TypeScript — plain JavaScript per project conventions
- ❌ New npm dependencies beyond what's already installed
- ❌ Emojis as icons — use text/CSS only
- ❌ Inline `<style>` blocks in components — use the global CSS

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** - ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: NO
- **Automated tests**: None
- **Framework**: N/A
- **Agent-Executed QA**: MANDATORY for all tasks

### QA Policy
Every task includes agent-executed QA scenarios.
- **CLI/API**: Use bash (curl) — Send requests, assert status + response fields
- **Build**: Run `npm run build` and verify dist/ output exists

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately - foundation):
├── T1: Clean legacy files [quick]
├── T2: Write CSS design system [visual-engineering]
├── T3: Create auth store [quick]
├── T4: Create cart store [unspecified-high]
├── T5: Create router [quick]
└── T6: Create App entry + App.vue + AppHeader [visual-engineering]

Wave 2 (After Wave 1 - all views, MAX PARALLEL):
├── T7: CartView.vue [visual-engineering]
├── T8: CheckoutView.vue [quick]
├── T9: PaymentView.vue [quick]
├── T10: ConfirmationView.vue [quick]
├── T11: OrdersView.vue [unspecified-high]
└── T12: VendorView.vue [unspecified-high]

Wave 3 (After Wave 2 - verification):
├── T13: Build verification + QA [quick]
├── T14: Functional QA (curl-based cart flow E2E) [unspecified-high]
└── T15: Visual verification (responsive, states) [visual-engineering]

Critical Path: T1 → T5 → T7 → T12 → T14
Parallel Speedup: ~65% faster than sequential
Max Concurrent: 6 (Wave 2)
```

### Agent Dispatch Summary
- **Wave 1**: 6 tasks — T1→quick, T2→visual-engineering, T3→quick, T4→unspecified-high, T5→quick, T6→visual-engineering
- **Wave 2**: 6 tasks — T7→visual-engineering, T8→quick, T9→quick, T10→quick, T11→unspecified-high, T12→unspecified-high
- **Wave 3**: 3 tasks — T13→quick, T14→unspecified-high, T15→visual-engineering

---

## TODOs

- [x] 1. **Clean legacy files**

  **What to do**:
  - Delete `frontend/pages/` directory and all contents
  - Delete `frontend/js/` directory and all contents
  - Delete `frontend/css/styles_backup.css` and `frontend/css/styles_part1.txt`
  - Delete `frontend/AGENTS.md`
  - Keep `frontend/css/` for now (will be replaced by public/css)

  **Must NOT do**:
  - Don't touch `frontend/node_modules/`
  - Don't touch `frontend/package.json` or `frontend/vite.config.js`
  - Don't delete `frontend/src/` directory

  **Recommended Agent Profile**: `quick`
  - **Category**: quick — trivial file deletions, no logic involved

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T2-T6)
  - **Blocks**: T7-T12 (views need clean structure)
  - **Blocked By**: None

  **Acceptance Criteria**:
  - [ ] `frontend/pages/` directory does not exist
  - [ ] `frontend/js/` directory does not exist
  - [ ] `frontend/css/styles_backup.css` does not exist
  - [ ] `frontend/AGENTS.md` does not exist

  **QA Scenarios**:
  ```
  Scenario: Verify legacy files are deleted
    Tool: Bash
    Steps:
      1. Get-ChildItem frontend/pages -ErrorAction SilentlyContinue
      2. Get-ChildItem frontend/js -ErrorAction SilentlyContinue
    Expected Result: Both commands return empty (directories don't exist)
    Evidence: .sisyphus/evidence/task-1-cleanup.txt
  ```

  **Commit**: YES
  - Message: `chore(frontend): remove legacy HTML/JS files`
  - Files: `frontend/pages/*`, `frontend/js/*`, `frontend/css/styles_backup.css`, `frontend/AGENTS.md`

- [x] 2. **Write cart-focused CSS design system**

  **What to do**:
  - Move `frontend/css/styles.css` to `frontend/public/css/styles.css` (create directories)
  - Replace entire content with new cart-optimized design system
  - Use CSS variables: Inter font, Indigo primary (#6366f1), slate grays, semantic tokens
  - Include styles for: header (gradient), cart items (.cart-item), quantity controls (.qty-btn), cart summary (.cart-summary), checkout (.checkout-totals), payment card (.payment-card), confirmation card (.confirm-card), order cards (.order-card), vendor cards (.vendor-card), badges (.badge-*), buttons (.btn-*), alerts (.alert-*), spinner, dropdown, empty state (.empty-cart), responsive (@media max-width:640px)
  - Target: ~350 lines (compact, no comments, no redundancy)

  **Must NOT do**:
  - Don't use emoji characters
  - Don't include product grid/catalog styles (not needed)
  - Don't create duplicate selectors

  **Recommended Agent Profile**: `visual-engineering`
  - **Category**: visual-engineering — CSS design system creation
  - **Skills**: [`industrial-brutalist-ui`, `minimalist-ui`] — modern cart UI design

  **References**:
  - `frontend/css/styles.css` — current CSS for variable reference and existing patterns
  - Design tokens map: primary=#6366f1, success=#10b981, danger=#ef4444, warning=#f59e0b, bg=#fafafa

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T1, T3-T6)
  - **Blocks**: T7-T12 (all views depend on CSS)
  - **Blocked By**: T1 (clean structure first)

  **Acceptance Criteria**:
  - [ ] `frontend/public/css/styles.css` exists and is ~300-400 lines
  - [ ] Contains root variables with Inter font and semantic color tokens
  - [ ] No duplicate selectors (run duplicate checker script)
  - [ ] Contains responsive @media query at 640px breakpoint
  - [ ] Contains styles for: header, .cart-item, .qty-controls, .cart-summary, .checkout-totals, .payment-card, .confirm-card, .order-card, .vendor-card, .badge-*, .btn-*, .alert-*, .spinner, .dropdown, .empty-cart

  **QA Scenarios**:
  ```
  Scenario: CSS file exists and loads without errors
    Tool: Bash
    Steps:
      1. Test-Path frontend/public/css/styles.css
      2. npm run build (should include CSS in dist/)
    Expected Result: File exists, build succeeds with CSS in dist/css/styles.css
    Evidence: .sisyphus/evidence/task-2-css.txt

  Scenario: No duplicate selectors
    Tool: Bash (PowerShell)
    Steps:
      1. Run duplicate checker script on styles.css
    Expected Result: Zero exact duplicate declarations
    Evidence: .sisyphus/evidence/task-2-nodupes.txt
  ```

  **Commit**: YES
  - Message: `style(frontend): cart-focused CSS design system`
  - Files: `frontend/public/css/styles.css`

- [x] 3. **Create auth Pinia store**

  **What to do**:
  - Write `frontend/src/stores/auth.js`
  - Use Composition API (`defineStore` with setup function)
  - State: `token` (ref from localStorage), `usuario` (ref from localStorage)
  - Getters: `isLoggedIn`, `isVendedor` (rol === 'vendedor'), `nombre` (first name)
  - Actions: `setToken(t)`, `setUsuario(u)`, `logout()` (clear storage + reload), `initFromUrl()` (read ?token= from URL)
  - Remove existing file first

  **Must NOT do**:
  - Don't call external auth service directly (auth is external)
  - Don't store sensitive data beyond token + user JSON

  **Recommended Agent Profile**: `quick`
  - **Category**: quick — simple store, straightforward logic

  **References**:
  - `frontend/js/auth.js:1-29` — existing isLoggedIn(), getUsuario(), logout() logic to replicate
  - `frontend/js/auth.js:67-73` — getCarritoKey() logic (carrito_${id} vs carrito_guest)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T1-T2, T4-T6)
  - **Blocks**: T4 (cart store depends on auth), T6 (AppHeader), T7-T12 (all views)
  - **Blocked By**: None

  **Acceptance Criteria**:
  - [ ] `frontend/src/stores/auth.js` exists
  - [ ] Exports `useAuthStore`
  - [ ] `isLoggedIn` computed returns true when token + usuario.id exist
  - [ ] `isVendedor` computed returns true when rol === 'vendedor' and vendor_id exists
  - [ ] `logout()` clears localStorage and reloads

  **QA Scenarios**:
  ```
  Scenario: Store initializes from localStorage
    Tool: Bash (Node REPL via bundled build)
    Steps:
      1. Build project with npm run build
      2. Verify dist output contains auth store chunk
    Expected Result: auth store bundled into dist/assets/auth-*.js
    Evidence: .sisyphus/evidence/task-3-auth-store.txt
  ```

  **Commit**: YES
  - Message: `feat(frontend): auth Pinia store`
  - Files: `frontend/src/stores/auth.js`

- [x] 4. **Create cart Pinia store**

  **What to do**:
  - Write `frontend/src/stores/cart.js`
  - Use Composition API (`defineStore` with setup function)
  - Import `useAuthStore` for user context
  - State: `items` (ref, loaded from localStorage)
  - Helper: `getStorageKey()` returns `carrito_${id}` or `carrito_guest`
  - Getters: `totalItems`, `subtotal`, `envio` (50 if subtotal < 500 else 0), `total`, `isEmpty`
  - Actions: `loadFromStorage()`, `save()`, `add(producto)`, `remove(index)`, `increase(index)`, `decrease(index)`, `clear()`, `fetchBackendCart()` (GET /api/carrito), `updateQuantity(productId, cantidad)` (PATCH /api/carrito/:id), `syncOnLogin()` (POST /api/carrito/fusionar)
  - API calls use fetch with Bearer token header when logged in
  - After add/remove/increase/decrease: call save() + syncBackend()

  **Must NOT do**:
  - Don't call external auth services directly
  - Don't hardcode API URLs — use 'http://localhost:3000'
  - Don't lose guest cart on login without fusion

  **Recommended Agent Profile**: `unspecified-high`
  - **Category**: unspecified-high — complex state management with backend sync, fusion logic

  **References**:
  - `frontend/js/carrito.js:3-33` — existing mostrarCarrito() and localStorage pattern
  - `frontend/js/carrito.js:35-64` — actualizarCantidad() PATCH pattern
  - `frontend/js/carrito.js:66-119` — mostrarCarritoBackend() GET pattern
  - `frontend/js/auth.js:67-73` — getCarritoKey() for storage key logic
  - Backend: POST /api/carrito/fusionar merges guest→user cart

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T1-T3, T5-T6)
  - **Blocks**: T7 (CartView depends on cart store), T8 (CheckoutView), T9 (PaymentView)
  - **Blocked By**: T3 (auth store)

  **Acceptance Criteria**:
  - [ ] `frontend/src/stores/cart.js` exists
  - [ ] Exports `useCartStore`
  - [ ] `add()` adds item and persists to localStorage
  - [ ] `totalItems` computed returns correct count
  - [ ] `subtotal` computed returns sum of price * quantity
  - [ ] `envio` returns 50 when subtotal < 500, else 0
  - [ ] `fetchBackendCart()` calls GET /api/carrito with auth header
  - [ ] `updateQuantity()` calls PATCH /api/carrito/:id
  - [ ] Guest cart key is 'carrito_guest', authenticated key is 'carrito_{userId}'

  **QA Scenarios**:
  ```
  Scenario: Cart store computes totals correctly
    Tool: Bash (verify built output exists)
    Steps:
      1. npm run build
      2. Verify cart store chunk in dist/assets/
    Expected Result: Build succeeds, cart store bundled
    Evidence: .sisyphus/evidence/task-4-cart-store.txt

  Scenario: Cart store handles guest and authenticated keys
    Tool: Bash
    Steps:
      1. grep for 'carrito_guest' and 'carrito_${' in store code
    Expected Result: Both storage key patterns found
    Evidence: .sisyphus/evidence/task-4-cart-keys.txt
  ```

  **Commit**: YES
  - Message: `feat(frontend): cart Pinia store with backend sync`
  - Files: `frontend/src/stores/cart.js`

- [x] 5. **Create Vue Router**

  **What to do**:
  - Write `frontend/src/router/index.js`
  - Use `createRouter` with `createWebHistory`
  - Routes (all lazy-loaded via dynamic import):
    - `/` → redirect to `/carrito`
    - `/carrito` → CartView
    - `/checkout` → CheckoutView
    - `/pago` → PaymentView (receives ?status=)
    - `/confirmacion` → ConfirmationView
    - `/pedidos` → OrdersView
    - `/vendedor` → VendorView

  **Must NOT do**:
  - Don't create routes for auth login or product catalog
  - Don't use hash mode (#) — use HTML5 history mode

  **Recommended Agent Profile**: `quick`
  - **Category**: quick — simple router setup with lazy imports

  **References**:
  - Vue Router 4 docs: `createRouter`, `createWebHistory`, `component: () => import(...)`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T1-T4, T6)
  - **Blocks**: T6 (App needs router), T7-T12 (all views)
  - **Blocked By**: None

  **Acceptance Criteria**:
  - [ ] `frontend/src/router/index.js` exists
  - [ ] 7 routes defined (1 redirect + 6 views)
  - [ ] All view components are lazy-loaded
  - [ ] Root `/` redirects to `/carrito`

  **QA Scenarios**:
  ```
  Scenario: Router exports valid configuration
    Tool: Bash
    Steps:
      1. npm run build
      2. Verify route chunks in dist/assets/ (CartView-*.js, CheckoutView-*.js, etc.)
    Expected Result: Build succeeds with 6+ view chunks
    Evidence: .sisyphus/evidence/task-5-router.txt
  ```

  **Commit**: YES
  - Message: `feat(frontend): Vue Router with cart-focused routes`
  - Files: `frontend/src/router/index.js`

- [x] 6. **Create App entry point, App.vue, and AppHeader component**

  **What to do**:
  - Write `frontend/src/main.js`: createApp, use Pinia, use Router, mount #app
  - Write `frontend/src/App.vue`: `<script setup>` with `<RouterView />`, import AppHeader
  - Write `frontend/src/components/AppHeader.vue`:
    - Sticky header with purple gradient
    - Left: "Sistema de Compras" linking to /
    - Right: Cart link with badge (totalItems count), profile dropdown (if logged in) or login button (if not)
    - Profile dropdown: email, links to /pedidos and /vendedor (if vendor), logout button
    - Dropdown toggle via click, close on outside click (document listener)
    - Cart badge: red circle with item count, only shows when > 0

  **Must NOT do**:
  - Don't use v-click-outside directive (not installed) — use document event listener
  - Don't include product links or catalog navigation

  **Recommended Agent Profile**: `visual-engineering`
  - **Category**: visual-engineering — layout, styling, interaction
  - **Skills**: [`industrial-brutalist-ui`] — premium header with gradient

  **References**:
  - `frontend/js/auth.js:22-51` — renderAuthNav() pattern for auth state UI
  - `frontend/index.html` — current header structure to replicate

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T1-T5)
  - **Blocks**: T7-T12 (all views use AppHeader)
  - **Blocked By**: T3 (auth store), T4 (cart store), T5 (router)

  **Acceptance Criteria**:
  - [ ] `frontend/src/main.js` exists and boots app correctly
  - [ ] `frontend/src/App.vue` exists with `<RouterView />`
  - [ ] `frontend/src/components/AppHeader.vue` exists
  - [ ] Header shows cart link with item count badge
  - [ ] Header shows profile dropdown when logged in
  - [ ] Header shows "Iniciar sesión" button when logged out
  - [ ] Dropdown closes when clicking outside

  **QA Scenarios**:
  ```
  Scenario: Build succeeds with App components
    Tool: Bash
    Steps:
      1. npm run build
      2. Verify dist/index.html references bundled JS
    Expected Result: Build succeeds, index.html in dist loads app
    Evidence: .sisyphus/evidence/task-6-app-shell.txt
  ```

  **Commit**: YES
  - Message: `feat(frontend): App shell with header and router`
  - Files: `frontend/src/main.js`, `frontend/src/App.vue`, `frontend/src/components/AppHeader.vue`

- [x] 7. **CartView — Main cart page**

  **What to do**:
  - Write `frontend/src/views/CartView.vue`
  - `<script setup>`: import useCartStore, useAuthStore
  - On mount: load cart from storage, if logged in fetch backend cart
  - Template:
    - Empty state: icon + "Tu carrito está vacío" + "Ver productos" link
    - Cart items: for each item in cart.items, render `.cart-item` with:
      - Product image placeholder (gradient square with first letter)
      - Item name, unit price
      - Quantity controls (- / count / +)
      - Subtotal
      - Remove button (×)
    - Cart summary: subtotal, envio (free or $50), total
    - Actions: "Seguir comprando" link, "Vaciar carrito" btn, "Proceder al pago" btn
  - Wire actions to cart store methods

  **Recommended Agent Profile**: `visual-engineering`
  - **Category**: visual-engineering — primary cart UI with quantity controls and summary
  - **Skills**: [`minimalist-ui`] — clean cart layout

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T8-T12)
  - **Blocks**: T14 (functional QA)
  - **Blocked By**: T2 (CSS), T4 (cart store), T5 (router), T6 (App layout)

  **Acceptance Criteria**:
  - [ ] `frontend/src/views/CartView.vue` exists
  - [ ] Shows empty state when cart.items is empty
  - [ ] Shows cart items with quantity controls
  - [ ] Quantity +/- updates item count and totals in real-time
  - [ ] Remove button deletes item
  - [ ] "Vaciar carrito" clears all items
  - [ ] "Proceder al pago" navigates to /checkout

  **QA Scenarios**:
  ```
  Scenario: Empty cart shows empty state
    Tool: Bash (verify build output)
    Steps:
      1. npm run build
      2. grep for "carrito está vacío" in dist CartView chunk
    Expected Result: Empty state text found in compiled code
    Evidence: .sisyphus/evidence/task-7-cart-empty.txt

  Scenario: Cart with items renders correctly
    Tool: Bash
    Steps:
      1. Verify CartView chunk exists in dist/assets/
      2. Verify template includes .cart-item, .qty-controls, .cart-summary classes
    Expected Result: All cart classes present in template
    Evidence: .sisyphus/evidence/task-7-cart-items.txt
  ```

  **Commit**: YES
  - Message: `feat(frontend): CartView with quantity controls and summary`
  - Files: `frontend/src/views/CartView.vue`

- [x] 8. **CheckoutView — Order summary + payment initiation**

  **What to do**:
  - Write `frontend/src/views/CheckoutView.vue`
  - On mount: redirect to /login?redirect=checkout if not logged in
  - Template:
    - Title: "Resumen de Compra"
    - Item list: name, qty × unit price, line total
    - Totals: subtotal, envio (GRATIS or $50), total
    - "Confirmar y pagar" button (disabled while processing)
    - "Volver al carrito" link
  - On confirm: POST /api/checkout/iniciar with items + total
    - On success with url_pago → redirect to that URL
    - On 409 (stock) → show alert with details
    - On error → show alert

  **Recommended Agent Profile**: `quick`
  - **Category**: quick — straightforward checkout form with API call

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T7, T9-T12)
  - **Blocks**: None directly
  - **Blocked By**: T2 (CSS), T4 (cart store), T5 (router), T6 (App layout)

  **Acceptance Criteria**:
  - [ ] `frontend/src/views/CheckoutView.vue` exists
  - [ ] Redirects to login if not authenticated
  - [ ] Shows cart items and totals
  - [ ] "Confirmar y pagar" calls POST /api/checkout/iniciar
  - [ ] Handles 409 stock error gracefully

  **QA Scenarios**:
  ```
  Scenario: Checkout view renders with totals
    Tool: Bash
    Steps:
      1. npm run build
      2. Verify CheckoutView chunk exists
    Expected Result: Build succeeds with checkout view
    Evidence: .sisyphus/evidence/task-8-checkout.txt
  ```

  **Commit**: YES
  - Message: `feat(frontend): CheckoutView with payment initiation`
  - Files: `frontend/src/views/CheckoutView.vue`

- [x] 9. **PaymentView — Payment status display**

  **What to do**:
  - Write `frontend/src/views/PaymentView.vue`
  - Read `?status=` and `?payment_id=` from route query
  - Handle 4 states:
    - **approved**: green check, "Pago aprobado", clear cart, show transaction detail (fetch GET /api/transacciones/reciente), buttons: "Ver mis pedidos" + "Volver al catálogo"
    - **pending**: yellow clock, "Pago pendiente", "Volver al carrito"
    - **rejected/failure**: red X, "Pago rechazado", "Reintentar pago" + "Volver al carrito"
    - **unknown**: info, "Estado del pago", "Volver al carrito"
  - Show spinner while loading
  - Show transaction detail card if available (id, total, items count)

  **Recommended Agent Profile**: `quick`
  - **Category**: quick — status display with conditional rendering

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T7-T8, T10-T12)
  - **Blocks**: None
  - **Blocked By**: T2 (CSS), T4 (cart store), T5 (router), T6 (App layout)

  **Acceptance Criteria**:
  - [ ] `frontend/src/views/PaymentView.vue` exists
  - [ ] Handles all 4 payment states
  - [ ] Clears cart on approved status
  - [ ] Fetches transaction details on approved
  - [ ] Redirects to /carrito if no status param

  **QA Scenarios**:
  ```
  Scenario: Payment view handles approved status
    Tool: Bash
    Steps:
      1. npm run build
      2. grep for "Pago aprobado" in PaymentView chunk
    Expected Result: Approved state text found
    Evidence: .sisyphus/evidence/task-9-payment.txt
  ```

  **Commit**: YES
  - Message: `feat(frontend): PaymentView with status handling`
  - Files: `frontend/src/views/PaymentView.vue`

- [x] 10. **ConfirmationView — Purchase confirmation**

  **What to do**:
  - Write `frontend/src/views/ConfirmationView.vue`
  - On mount: redirect to /carrito if not logged in
  - Template:
    - Green checkmark circle icon
    - "¡Compra confirmada!" heading
    - "Gracias, [nombre]. Tu pedido ha sido procesado exitosamente."
    - "Volver al catálogo" link to /
  - Display user name from auth store

  **Recommended Agent Profile**: `quick`
  - **Category**: quick — simple confirmation page

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T7-T9, T11-T12)
  - **Blocks**: None
  - **Blocked By**: T2 (CSS), T3 (auth store), T5 (router), T6 (App layout)

  **Acceptance Criteria**:
  - [ ] `frontend/src/views/ConfirmationView.vue` exists
  - [ ] Shows user's name from auth store
  - [ ] Has "Volver al catálogo" link

  **QA Scenarios**:
  ```
  Scenario: Confirmation view renders
    Tool: Bash
    Steps:
      1. npm run build
      2. Verify ConfirmationView chunk exists
    Expected Result: Build succeeds
    Evidence: .sisyphus/evidence/task-10-confirmation.txt
  ```

  **Commit**: YES
  - Message: `feat(frontend): ConfirmationView`
  - Files: `frontend/src/views/ConfirmationView.vue`

- [x] 11. **OrdersView — Order history with expandable cards**

  **What to do**:
  - Write `frontend/src/views/OrdersView.vue`
  - On mount: redirect to /login?redirect=pedidos if not logged in, fetch GET /api/pedidos
  - Template:
    - Title: "Mis Pedidos"
    - Loading state: spinner
    - Empty state: "Aún no tienes pedidos" + link to /
    - Order cards: for each pedido, render `.order-card` with:
      - Header (clickable to expand): order ID (first 8 chars), date, status badge, total amount, expand arrow
      - Detail (conditional): items list (nombre × cantidad, subtotal)
    - Badge colors by estado: Pendiente=yellow, Procesando=blue, Enviado=orange, Entregado=green, Cancelado=red
  - WebSocket: connect to Socket.IO on mount, update pedidos on 'estado_actualizado' event

  **Must NOT do**:
  - Don't require WebSocket — work without it (polling fallback not needed, static data is fine)

  **Recommended Agent Profile**: `unspecified-high`
  - **Category**: unspecified-high — order cards with expand/collapse, WebSocket, status badges

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T7-T10, T12)
  - **Blocks**: None
  - **Blocked By**: T2 (CSS), T3 (auth store), T5 (router), T6 (App layout)

  **Acceptance Criteria**:
  - [ ] `frontend/src/views/OrdersView.vue` exists
  - [ ] Fetches pedidos from GET /api/pedidos
  - [ ] Shows expandable order cards with status badges
  - [ ] Each card shows items when expanded
  - [ ] Empty state when no orders
  - [ ] Loading state while fetching

  **QA Scenarios**:
  ```
  Scenario: Orders view handles empty state
    Tool: Bash
    Steps:
      1. npm run build
      2. grep for "Aún no tienes pedidos" in OrdersView chunk
    Expected Result: Empty state text found
    Evidence: .sisyphus/evidence/task-11-orders.txt
  ```

  **Commit**: YES
  - Message: `feat(frontend): OrdersView with expandable cards`
  - Files: `frontend/src/views/OrdersView.vue`

- [x] 12. **VendorView — Vendor panel with state transitions**

  **What to do**:
  - Write `frontend/src/views/VendorView.vue`
  - On mount: redirect to / if not vendor, fetch GET /api/vendedor/pedidos
  - Template:
    - Title: "Panel de Vendedor"
    - Loading state: spinner
    - Empty state: "No tienes pedidos con productos tuyos"
    - Vendor cards: for each pedido, render `.vendor-card` with:
      - Header: order ID, date, status badge, total
      - Body: items list
      - State transition select (if applicable): dropdown with valid next states, auto-submit on change
    - State machine (backend-validated): Pendiente→{Procesando, Cancelado}, Procesando→{Enviado, Cancelado}, Enviado→{Entregado}, Entregado→{}, Cancelado→{}
  - On state change: PATCH /api/vendedor/pedidos/:id/estado, reload list on success

  **Must NOT do**:
  - Don't allow transitions not in the state machine

  **Recommended Agent Profile**: `unspecified-high`
  - **Category**: unspecified-high — complex state machine logic, role-based access

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T7-T11)
  - **Blocks**: None
  - **Blocked By**: T2 (CSS), T3 (auth store), T5 (router), T6 (App layout)

  **Acceptance Criteria**:
  - [ ] `frontend/src/views/VendorView.vue` exists
  - [ ] Redirects non-vendors to /
  - [ ] Fetches pedidos from GET /api/vendedor/pedidos
  - [ ] Shows state transition dropdowns per order
  - [ ] Calls PATCH on state change
  - [ ] Reloads list after successful transition

  **QA Scenarios**:
  ```
  Scenario: Vendor view enforces role check
    Tool: Bash
    Steps:
      1. npm run build
      2. grep for "isVendedor" or "rol" in VendorView chunk
    Expected Result: Role check logic found
    Evidence: .sisyphus/evidence/task-12-vendor.txt
  ```

  **Commit**: YES
  - Message: `feat(frontend): VendorView with state transitions`
  - Files: `frontend/src/views/VendorView.vue`

- [x] 13. **Build verification**

  **What to do**:
  - Run `cd frontend && npm run build`
  - Verify dist/ output:
    - dist/index.html exists and references bundled JS/CSS
    - dist/css/styles.css exists (~22KB)
    - dist/assets/ contains chunk files for each route (CartView-*.js, CheckoutView-*.js, etc.)
    - Zero build errors
  - Run `node --check` equivalent on any standalone JS files

  **Recommended Agent Profile**: `quick`
  - **Category**: quick — build verification

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T14-T15)
  - **Blocks**: None
  - **Blocked By**: T1-T12 (all implementation tasks)

  **Acceptance Criteria**:
  - [ ] `npm run build` exits with code 0
  - [ ] dist/index.html exists
  - [ ] dist/css/styles.css exists
  - [ ] At least 6 route chunks in dist/assets/
  - [ ] Zero console errors in build output

  **QA Scenarios**:
  ```
  Scenario: Production build succeeds
    Tool: Bash
    Steps:
      1. cd frontend
      2. npm run build
      3. Get-ChildItem dist -Recurse | Measure-Object
    Expected Result: Build succeeds, dist/ has 10+ files
    Evidence: .sisyphus/evidence/task-13-build.txt
  ```

  **Commit**: NO (verification only)

- [x] 14. **Functional QA — Cart flow E2E via curl**

  **What to do**:
  - Verify backend API is running (port 3000)
  - Test cart flow end-to-end:
    1. GET /api/productos → verify products exist
    2. POST /api/carrito/agregar → add item (needs auth token first)
    3. GET /api/carrito → verify item in cart
    4. PUT /api/carrito/actualizar → change quantity
    5. DELETE /api/carrito/eliminar → remove item
    6. POST /api/checkout/iniciar → verify checkout creates transaction
    7. GET /api/pedidos → verify order appears
  - Verify frontend build output maps to these flows

  **Recommended Agent Profile**: `unspecified-high`
  - **Category**: unspecified-high — multi-step API testing

  **Parallelization**:
  - **Can Run In Parallel**: NO (sequential API flow)
  - **Parallel Group**: Wave 3
  - **Blocks**: None
  - **Blocked By**: T13 (build must pass first)

  **Acceptance Criteria**:
  - [ ] All 7 API endpoints respond correctly
  - [ ] Cart add → get → update → delete flow works
  - [ ] Checkout creates transaction and returns payment URL
  - [ ] Orders list returns after checkout

  **QA Scenarios**:
  ```
  Scenario: Complete cart lifecycle via API
    Tool: Bash (curl)
    Preconditions: Backend running on port 3000
    Steps:
      1. curl localhost:3000/api/productos → should return array
      2. curl localhost:3000/api/carrito (with auth) → should return items or empty
    Expected Result: All endpoints return valid JSON
    Evidence: .sisyphus/evidence/task-14-api-qa.txt
  ```

  **Commit**: NO (verification only)

- [x] 15. **Visual verification — CSS and responsive check**

  **What to do**:
  - Verify CSS file is complete:
    - All required classes present (.cart-item, .qty-btn, .cart-summary, .checkout-totals, .payment-card, .confirm-card, .order-card, .vendor-card, .badge-*, .btn-*, .alert-*, .spinner, .dropdown, .empty-cart)
    - Responsive @media query at 640px
    - No duplicate selectors
    - CSS variables defined in :root
  - Verify component templates use CSS classes correctly
  - Count CSS lines (target: 300-400)

  **Recommended Agent Profile**: `visual-engineering`
  - **Category**: visual-engineering — CSS audit and verification

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T13)
  - **Blocks**: None
  - **Blocked By**: T2 (CSS), T7-T12 (views using CSS)

  **Acceptance Criteria**:
  - [ ] CSS file is 300-400 lines
  - [ ] All 20+ class patterns present
  - [ ] @media query at max-width:640px
  - [ ] Zero duplicate selectors
  - [ ] All views reference correct CSS classes

  **QA Scenarios**:
  ```
  Scenario: CSS is complete and optimized
    Tool: Bash
    Steps:
      1. Measure-Object -Line frontend/public/css/styles.css
      2. grep for key classes
    Expected Result: 300-400 lines, all required classes present
    Evidence: .sisyphus/evidence/task-15-visual.txt
  ```

  **Commit**: NO (verification only)

---

## Final Verification Wave

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists. For each "Must NOT Have": search for forbidden patterns. Check evidence files exist in .sisyphus/evidence/.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `npm run build`. Check all Vue SFCs use `<script setup>`. Verify no TypeScript, no emojis, no console.log in production code. Check stores follow Pinia patterns.
  Output: `Build [PASS/FAIL] | Components [N] | Stores [N] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high`
  Start backend on port 3000. Execute backend API tests (curl). Verify build output structure. Test cart flow API calls.
  Output: `Scenarios [N/N pass] | API [N endpoints] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", verify implementation exists. Verify nothing beyond scope was built. Check "Must NOT do" compliance.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | VERDICT`

---

## Final Verification Wave

---

## Commit Strategy

- **T1**: `chore(frontend): remove legacy HTML/JS files`
- **T2**: `style(frontend): cart-focused CSS design system`
- **T3**: `feat(frontend): auth Pinia store`
- **T4**: `feat(frontend): cart Pinia store with backend sync`
- **T5**: `feat(frontend): Vue Router with cart-focused routes`
- **T6**: `feat(frontend): App shell with header and router`
- **T7**: `feat(frontend): CartView with quantity controls and summary`
- **T8**: `feat(frontend): CheckoutView with payment initiation`
- **T9**: `feat(frontend): PaymentView with status handling`
- **T10**: `feat(frontend): ConfirmationView`
- **T11**: `feat(frontend): OrdersView with expandable cards`
- **T12**: `feat(frontend): VendorView with state transitions`

## Success Criteria

### Verification Commands
```bash
cd frontend && npm run build
ls dist/assets/CartView-*.js
ls dist/assets/CheckoutView-*.js
ls dist/css/styles.css
```

### Final Checklist
- [ ] All 12 implementation tasks complete with evidence
- [ ] Build succeeds with 0 errors
- [ ] 6+ route chunks in dist/assets/
- [ ] CSS in dist/css/styles.css (~300-400 lines)
- [ ] Legacy code deleted (pages/, js/)
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] Cart flow verified via API (add → view → checkout)
