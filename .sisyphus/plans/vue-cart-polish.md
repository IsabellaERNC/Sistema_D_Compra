# Vue Cart Frontend Polish — UI/UX + Animations

## TL;DR

> **Quick Summary**: Polish the already-built Vue 3 SPA with animations, toast notifications, micro-interactions, and visual refinements. No new features.
> 
> **Deliverables**:
> - Route transition animations (fade + slide) between all 6 views
> - Toast notification system (composable + Toast component) replacing all `alert()` calls
> - CartView empty state fix (remove circular link to `/`)
> - PaymentView animated status transitions (loading→approved/rejected)
> - ConfirmationView animated checkmark + celebration
> - OrdersView CSS expand icons (replace text ▲/▼)
> - Loading states with spinner visual polish
> - App.vue `<main>` wrapper with `.page-container` + transition
> - PaymentView "Volver al catalogo" circular link fix
> 
> **Estimated Effort**: Short (1-2 hours)
> **Parallel Execution**: YES — 3 waves
> **Critical Path**: T1 (Toast system) → all views that use it

---

## Context

### Original Request
Make the frontend beautiful ("hazlo lindo") — polish UI/UX with animations, micro-interactions, and visual refinements.

### Current State
- Vue 3 SPA with 6 views (Cart, Checkout, Payment, Confirmation, Orders, Vendor)
- Pinia stores (auth, cart), Vue Router (6 routes + redirect)
- 1141-line Indigo design system CSS (CSS variables, Inter font, 8pt spacing)
- All views functional, build compiles with 0 errors, API QA: 8/8 endpoints pass

### Key Issues to Fix
1. **No route transitions** — views snap in/out with no animation
2. **`alert()` for errors** — CheckoutView uses `alert()` for stock issues, VendorView for errors
3. **Circular empty state link** — CartView "Ver productos" → `/` → redirects to `/carrito` (dead loop)
4. **PaymentView** — "Volver al catalogo" → `/` → same circular loop
5. **ConfirmationView** — plain "OK" text icon, no animation
6. **Loading states** — plain "Cargando..." text
7. **OrdersView** — expand icon uses ▲/▼ text characters
8. **App.vue** — `<main>` lacks `.page-container` wrapper
9. **PaymentView** — status changes jump with no animation

### Metis Review
- **Question asked**: External productos service URL for CartView empty state? → RESOLVED: No external productos frontend exists. Remove circular link, show informational text.
- **Question asked**: Toast position/behavior? → RESOLVED: Top-right, 3.5s auto-dismiss, pure CSS.
- **Question asked**: New npm dependencies? → RESOLVED: Pure CSS only. No new dependencies.
- **Question asked**: Celebration intensity? → RESOLVED: Subtle animated checkmark. No confetti.

---

## Work Objectives

### Core Objective
Transform the functional but plain Vue 3 SPA into a polished, animated shopping experience with smooth transitions and proper micro-interactions.

### Concrete Deliverables
- `frontend/src/components/Toast.vue` — Toast component + composable (`useToast`)
- `frontend/src/App.vue` — Route transitions + page-container wrapper
- `frontend/src/views/CartView.vue` — Empty state fixed, no circular link
- `frontend/src/views/CheckoutView.vue` — Toast notifications replacing `alert()`
- `frontend/src/views/PaymentView.vue` — Animated status, fixed circular link
- `frontend/src/views/ConfirmationView.vue` — Animated checkmark
- `frontend/src/views/OrdersView.vue` — CSS expand icons
- `frontend/src/views/VendorView.vue` — Toast replacing `alert()`
- `frontend/public/css/styles.css` — Animations, transition classes, toast styles

### Definition of Done
- [ ] `npm run build` — 0 errors
- [ ] No `alert()` calls remain in any Vue view (only in Toast system)
- [ ] Route transitions animate between all view changes
- [ ] CartView empty state shows informative text without broken link
- [ ] PaymentView shows animated status transition

### Must Have
- Toast notification system with success/error/warning/info variants
- CSS route transition animation (fade + slide)
- CartView empty state circular link removed
- All `alert()` calls replaced with toast
- `alert()` is NO LONGER used in production code (only Toast)
- Loading states visually enhanced

### Must NOT Have (Guardrails)
- No new npm dependencies — pure CSS/Vue only
- No new views, routes, or features
- No backend changes
- No TypeScript conversion
- No test infrastructure
- No excessive animation that hurts usability

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.
> No test infrastructure exists; all verification via live QA.

### Test Decision
- **Infrastructure exists**: NO
- **Automated tests**: None
- **Agent-Executed QA**: ALWAYS — Playwright for visual, Bash/curl for build

### QA Policy
Every task MUST include agent-executed QA scenarios.

- **Build verification**: `cd frontend; npm run build` — 0 errors
- **Visual QA**: Open built frontend, navigate routes, verify transitions render
- **Code QA**: `grep` for `alert(` in `src/views/` — 0 matches after T6
- **Evidence**: Screenshots of animated states

---

## Execution Strategy

```
Wave 1 (Start Immediately — foundation, MAX PARALLEL):
├── T1: Toast component + composable [quick]
├── T2: App.vue — route transitions + page-container [quick]
├── T3: CSS animation classes for transitions + toast [quick]
└── T4: Loading spinner enhancement [quick]

Wave 2 (After Wave 1 — view-by-view polish, MAX PARALLEL):
├── T5: CartView — fix empty state, toast integration [quick]
├── T6: CheckoutView — replace alert() with toast [quick]
├── T7: ConfirmationView — animated checkmark [visual-engineering]
├── T8: PaymentView — animated status, fix circular link [visual-engineering]
├── T9: OrdersView — CSS expand icons, toast [quick]
└── T10: VendorView — replace alert() with toast [quick]

Wave 3 (Verification):
├── T11: Build verification — npm run build, 0 errors [quick]
├── T12: Visual QA — Playwright route transitions + toast rendering [unspecified-high]
└── T13: Code QA — grep alert() in views = 0 matches [quick]
```

---

## TODOs

### Wave 1 — Foundation (Parallel)

- [x] 1. **Toast Notification Component + Composable**

  **What to do**:
  - Create `frontend/src/components/Toast.vue` with:
    - Toast container (fixed, top-right, z-index: 9999)
    - Individual toast items with message + type (success/error/warning/info) + auto-dismiss
    - CSS: slide-in from right, fade-out, stacking gap, colored left border per type
  - Create toast injection key and `useToast()` composable that exposes:
    - `show(msg, type, duration?)` — shows toast
    - `success(msg)`, `error(msg)`, `warning(msg)`, `info(msg)` — convenience methods
  - Wire Toast.vue into `App.vue` template above `<RouterView />`
  - Integrate with `useToast()` in CheckoutView (stock errors) and VendorView (status update errors)
  - No new npm dependencies

  **Must NOT do**:
  - Don't use external libraries or npm packages
  - Don't add features beyond basic toast (no progress bars, no undo, no queue max)
  - Don't modify existing views beyond adding toast calls

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`vue`]
    - `vue`: Use Composition API with `<script setup>`, provide/inject pattern for composable

  **References**:
  - `frontend/src/components/AppHeader.vue` — Existing component pattern (script setup, template, scoped style pattern)
  - `frontend/src/App.vue` — Where Toast component will be mounted
  - `frontend/src/views/CheckoutView.vue` — Uses `alert()` on lines 54, 56, 60, 71 — these will be replaced
  - `frontend/src/views/VendorView.vue` — Uses `alert()` on line 69

  **Acceptance Criteria**:
  - [ ] `frontend/src/components/Toast.vue` created with container + toast items
  - [ ] `useToast()` composable exported with show/success/error/warning/info methods
  - [ ] Toast component rendered in App.vue

  **QA Scenarios**:
  ```
  Scenario: Toast renders and auto-dismisses
    Tool: Bash (curl) + Playwright
    Preconditions: Frontend dev server running on localhost:5173
    Steps:
      1. Open frontend in browser
      2. Navigate to /carrito
      3. In browser console: run JS to trigger toast via window.__toast__ or use Vue DevTools
    Expected Result: Toast appears at top-right, slides in, auto-dismisses after ~3.5s
    Evidence: .sisyphus/evidence/task-1-toast-render.md

  Scenario: Toast types show correct colors
    Tool: Playwright
    Preconditions: Dev server running
    Steps:
      1. Trigger each type (success, error, warning, info)
      2. Observe border/styling
    Expected Result: Each type has distinct colored left border
    Evidence: .sisyphus/evidence/task-1-toast-types.png
  ```

  **Commit**: YES
  - Message: `feat(ui): add toast notification system with composable`
  - Files: `frontend/src/components/Toast.vue`, `frontend/src/App.vue`

---

- [x] 2. **App.vue — Route Transitions + Page-Container**

  **What to do**:
  - Edit `frontend/src/App.vue`:
    - Wrap `<RouterView />` with `<transition name="page-fade" mode="out-in">`
    - Wrap `<main>` content with `class="page-container"`
    - Add `<Toast />` component import and render above `<RouterView />`
    - Add `<style scoped>` with `.page-fade-enter-active`, `.page-fade-leave-active`, `.page-fade-enter-from`, `.page-fade-leave-to` CSS classes using CSS variables for timing

  **Must NOT do**:
  - Don't use third-party animation libraries
  - Don't add complex multi-stage transitions (simple fade is sufficient)
  - Don't modify views or layout structure beyond what's specified

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`vue`]
    - `vue`: Vue transition component API, scoped styles

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T1, T3, T4)
  - **Blocks**: T5-T10 (all views depend on the transition/container being in place)
  - **Blocked By**: None

  **References**:
  - `frontend/src/App.vue` (current) — Current structure to modify
  - `frontend/public/css/styles.css` — CSS variables for timing: `--transition-base: 200ms ease`, `--transition-slow: 300ms ease`

  **Acceptance Criteria**:
  - [ ] `App.vue` has `<transition>` wrapping `<RouterView />`
  - [ ] `<main>` has `class="page-container"`
  - [ ] `<Toast />` component rendered in App.vue
  - [ ] Scoped styles for `.page-fade-*` transition classes defined
  - [ ] `npm run build` succeeds

  **QA Scenarios**:
  ```
  Scenario: Route transition animates
    Tool: Playwright
    Preconditions: Dev server running
    Steps:
      1. Navigate to /carrito
      2. Click link to /checkout (requires login redirect — use a non-auth page)
      3. Observe transition between views
    Expected Result: Views fade out/in smoothly with `mode="out-in"`
    Evidence: .sisyphus/evidence/task-2-route-transition.png
  ```

  **Commit**: YES (groups with T1)
  - Message: `feat(ui): add route transitions and toast integration to App.vue`
  - Files: `frontend/src/App.vue`

---

- [x] 3. **CSS Animation Classes for Transitions + Toast**

  **What to do**:
  - Add to `frontend/public/css/styles.css`:
    - Toast container + toast item styles:
      - `.toast-container` (fixed top-right, z-index 9999, flex column, gap 8px, padding 16px)
      - `.toast` (min-width 300px, max-width 450px, padding 12px 16px, border-radius 8px, background white, shadow-lg, border-left 4px solid per type, animation slide-in-right)
      - `.toast-success` (border-left-color: var(--color-success))
      - `.toast-error` (border-left-color: var(--color-danger))
      - `.toast-warning` (border-left-color: var(--color-warning))
      - `.toast-info` (border-left-color: var(--color-info))
      - `@keyframes slide-in-right` (from translateX 100% to 0)
      - `@keyframes fade-out` (from opacity 1 to 0)
    - Route transition classes (backup if scoped styles insufficient):
      - `.page-fade-enter-active`, `.page-fade-leave-active` (transition: opacity + transform, 200ms)
      - `.page-fade-enter-from` (opacity 0, translateY 8px)
      - `.page-fade-leave-to` (opacity 0, translateY -8px)
    - No `!important`, no vendor prefixes

  **Must NOT do**:
  - Don't modify existing CSS rules
  - Don't add animations that affect layout (use transform/opacity only)
  - Don't use `!important`

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`ui-ux-pro-max`]
    - `ui-ux-pro-max`: CSS animation best practices, performant animations

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T1, T2, T4)
  - **Blocks**: T5-T10
  - **Blocked By**: None

  **References**:
  - `frontend/public/css/styles.css` — Existing CSS variables for timing:
    - `--transition-base: 200ms ease`, `--transition-slow: 300ms ease`
    - `--shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.1)...`
    - `--color-success: #10B981`, `--color-danger: #EF4444`, `--color-warning: #F59E0B`, `--color-info: #3B82F6`

  **Acceptance Criteria**:
  - [ ] Toast CSS classes added to styles.css
  - [ ] Route transition keyframes and classes added
  - [ ] No duplicate selectors, no `!important`
  - [ ] LSP diagnostics clean

  **QA Scenarios**:
  ```
  Scenario: CSS parses without errors
    Tool: Bash
    Preconditions: None
    Steps:
      1. cd frontend
      2. npm run build
    Expected Result: Build succeeds with 0 errors
    Evidence: .sisyphus/evidence/task-3-css-build.txt
  ```

  **Commit**: YES (groups with T1)
  - Message: `style(css): add toast and route transition animation classes`
  - Files: `frontend/public/css/styles.css`

---

- [x] 4. **Loading Spinner Enhancement**

  **What to do**:
  - Enhance existing `.loading` and `.spinner` styles in `frontend/public/css/styles.css`:
    - `.loading` (flex centered, gap 12px, padding 48px, color var(--gray-500), font-size 0.95rem)
    - `.spinner` should pulse/animate on its own with `@keyframes spin` (rotate 360deg over 0.8s linear infinite)
    - Add `.loading-spinner` class: inline-block spinner + text beside it
    - Add color variants: `.loading-sm` (compact, padding 24px, smaller text)
  - Verify views render loading states with these enhanced styles:
    - `OrdersView.vue` line 58: `class="loading"`
    - `VendorView.vue` line 77: `class="loading"`
    - `PaymentView.vue` line 69: `class="spinner"`

  **Must NOT do**:
  - Don't change the structural HTML of existing views
  - Don't replace loading text — just enhance the CSS

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [] (trivial CSS enhancement)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T1, T2, T3)
  - **Blocks**: None (views already use these classes)
  - **Blocked By**: None

  **References**:
  - `frontend/public/css/styles.css` lines ~810-830 — Existing `.loading` and `.spinner` rules
  - `frontend/src/views/OrdersView.vue:58` — Uses `class="loading"`
  - `frontend/src/views/VendorView.vue:77` — Uses `class="loading"`
  - `frontend/src/views/PaymentView.vue:69` — Uses `class="spinner"`

  **Acceptance Criteria**:
  - [ ] `.loading` style enhanced with flex centering, gap, padding
  - [ ] `.spinner` has `@keyframes spin` animation
  - [ ] No existing styles broken
  - [ ] Build succeeds

  **QA Scenarios**:
  ```
  Scenario: Spinner animates in loading state
    Tool: Playwright
    Preconditions: Dev server running, non-authed user
    Steps:
      1. Navigate to /pedidos (will show loading then redirect to login)
      2. Observe loading text appearance before redirect
    Expected Result: Loading text is centered, styled, with optional spinner element
    Evidence: .sisyphus/evidence/task-4-loading.png
  ```

  **Commit**: YES (groups with T1)
  - Message: `style(css): enhance loading states with spinner animation`
  - Files: `frontend/public/css/styles.css`

---

### Wave 2 — View Polish (Parallel)

- [x] 5. **CartView — Fix Empty State + Toast Integration**

  **What to do**:
  - Edit `frontend/src/views/CartView.vue`:
    - **Fix empty state**: Change `RouterLink to="/"` to a `<p>` with text like "Navega al catálogo de productos para agregar artículos a tu carrito." with NO link (remove the broken circular link)
    - **Add toast on add/remove**: After `cart.add()`, `cart.remove()`, `cart.clear()` operations, show toast notifications
    - Import `useToast()` from the composable
    - Add `onMounted` welcome toast if cart is loaded
    - Ensure all template uses correct CSS classes (`.item-carrito`, `.controles`, `.total`, `.acciones` — these already exist in styles.css)

  **Must NOT do**:
  - Don't add new features or views
  - Don't modify the cart store logic
  - Don't change the checkout flow

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`vue`]
    - `vue`: Composition API, `<script setup>`, component integration

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T6, T7, T8, T9, T10)
  - **Blocks**: None
  - **Blocked By**: T1 (Toast component), T3 (Toast CSS)

  **References**:
  - `frontend/src/views/CartView.vue` — Current view (lines 22-26 for empty state, lines 48-50 for button section)
  - `frontend/src/components/Toast.vue` (T1) — Toast composable to import
  - `frontend/src/stores/cart.js` — Cart store methods (add, remove, clear)

  **Acceptance Criteria**:
  - [ ] Empty state has NO link to "/" — just informational text
  - [ ] Toast shown on cart actions (add, remove, clear)
  - [ ] `alert()` not used in this file

  **QA Scenarios**:
  ```
  Scenario: Empty cart shows no broken link
    Tool: Playwright
    Preconditions: Dev server, empty cart
    Steps:
      1. Navigate to /carrito
      2. Check empty state
    Expected Result: Shows "Tu carrito está vacío" with informative text, no clickable link
    Evidence: .sisyphus/evidence/task-5-empty-state.png

  Scenario: Toast on clear cart
    Tool: Playwright
    Preconditions: Cart has items
    Steps:
      1. Click "Vaciar carrito"
    Expected Result: Toast appears showing "Carrito vaciado" or similar
    Evidence: .sisyphus/evidence/task-5-toast-clear.png
  ```

  **Commit**: YES
  - Message: `fix(cart): remove circular empty state link, add toast feedback`
  - Files: `frontend/src/views/CartView.vue`

---

- [x] 6. **CheckoutView — Replace alert() with Toast**

  **What to do**:
  - Edit `frontend/src/views/CheckoutView.vue`:
    - Import `useToast()` composable
    - Replace ALL `alert()` calls with toast:
      - Line 27: `alert('El carrito está vacío.')` → `toast.warning('El carrito está vacío')`
      - Line 56: `alert('Stock insuficiente:\n' + detalle)` → `toast.error(...)` with formatted message
      - Line 60: `alert(data.error || 'Error en el checkout')` → `toast.error(...)`
      - Line 71: `alert(err.message)` → `toast.error(err.message)`
    - Ensure error toast persists longer (duration 5000ms for important errors)
    - Remove any `alert` references

  **Must NOT do**:
  - Don't change business logic or API calls
  - Don't modify the checkout API request structure

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`vue`]
    - `vue`: Composable import, script setup modifications

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T5, T7, T8, T9, T10)
  - **Blocks**: None
  - **Blocked By**: T1 (Toast component)

  **References**:
  - `frontend/src/views/CheckoutView.vue` — Current file: lines 27, 54, 56, 60, 71 have `alert()` calls

  **Acceptance Criteria**:
  - [ ] Zero `alert()` calls remain in CheckoutView
  - [ ] All error feedback uses `toast.error()` or `toast.warning()`
  - [ ] Stock insufficient errors use toast with 5000ms duration

  **QA Scenarios**:
  ```
  Scenario: No alert() in CheckoutView source
    Tool: Bash (grep)
    Preconditions: None
    Steps:
      1. grep -n "alert(" frontend/src/views/CheckoutView.vue
    Expected Result: 0 matches
    Evidence: .sisyphus/evidence/task-6-no-alert.txt
  ```

  **Commit**: YES (groups with T5)
  - Message: `fix(checkout): replace alert() with toast notifications`
  - Files: `frontend/src/views/CheckoutView.vue`

---

- [x] 7. **ConfirmationView — Animated Checkmark + Celebration**

  **What to do**:
  - Edit `frontend/src/views/ConfirmationView.vue`:
    - Replace the plain "OK" text `<div class="icono">OK</div>` with an animated CSS checkmark
    - Add animated checkmark circle: CSS-only checkmark using pseudo-elements or a styled div
      - Circle scales in (scale 0 → 1, 300ms ease-out)
      - Checkmark draws in (stroke-dasharray animation on SVG or CSS border trick)
    - Add subtle fade-in animation to the confirmation card (`.caja-confirmacion` starts opacity 0, fades to 1)
    - Style `.icono` with `var(--color-success)` green circle, white checkmark
    - Add `<style scoped>` with keyframes and transitions

  **Must NOT do**:
  - Don't add confetti, fireworks, or distracting animations
  - Don't modify the template structure beyond the icon element
  - Don't add JavaScript animation libraries

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`ui-ux-pro-max`]
    - `ui-ux-pro-max`: CSS animation patterns, keyframe design, performant animation

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T5, T6, T8, T9, T10)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `frontend/src/views/ConfirmationView.vue` — Current file: line 24 has `class="icono">OK</div>`
  - `frontend/public/css/styles.css` sections for `.confirmacion-wrap`, `.caja-confirmacion`, `.icono`
  - CSS animation pattern: `@keyframes checkmark { 0% { transform: scale(0) } 50% { transform: scale(1.2) } 100% { transform: scale(1) } }`

  **Acceptance Criteria**:
  - [ ] Animated checkmark replaces plain "OK" text
  - [ ] Checkmark animates in (scale + stroke animation)
  - [ ] Card fades in smoothly
  - [ ] No JavaScript animation logic — pure CSS

  **QA Scenarios**:
  ```
  Scenario: Confirmation shows animated checkmark
    Tool: Playwright
    Preconditions: Authenticated user
    Steps:
      1. Navigate to /confirmacion
      2. Observe the checkmark animation
    Expected Result: Green circle with white checkmark scales in, card fades in
    Evidence: .sisyphus/evidence/task-7-checkmark.png
  ```

  **Commit**: YES
  - Message: `feat(ui): add animated checkmark to confirmation view`
  - Files: `frontend/src/views/ConfirmationView.vue`

---

- [x] 8. **PaymentView — Animated Status Transitions + Fix Circular Link**

  **What to do**:
  - Edit `frontend/src/views/PaymentView.vue`:
    - **Fix circular link**: Change `$router.push('/')` on line 90 to `$router.push('/carrito')` (was redirecting to root → which redirects to carrito, creating a double redirect)
    - **Add animated status transitions**:
      - Add `@keyframes fadeInUp` in `<style scoped>`
      - Apply transition animation to status content (the `<h2>`, `<p>`, `<div>` elements) so they fade in when status changes
      - Add subtle slide-up animation for the transaction detail block when it appears
      - Add icon per status: success green checkmark, pending amber clock icon (CSS), rejected red X (CSS)
    - Keep existing functionality intact
    - Add `<style scoped>` with keyframe animations

  **Must NOT do**:
  - Don't change payment processing logic
  - Don't modify API calls or redirect URLs
  - Don't add dependencies

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`vue`, `ui-ux-pro-max`]
    - `vue`: Scoped styles with CSS transitions
    - `ui-ux-pro-max`: Status transition animations

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T5, T6, T7, T9, T10)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `frontend/src/views/PaymentView.vue` — Current file: lines 88-101 for buttons, line 90 has `$router.push('/')`
  - `frontend/public/css/styles.css` — `.pago-container`, `.transaccion-detalle`, `.fila`, `.etiqueta`, `.valor`, `.btn-group` classes

  **Acceptance Criteria**:
  - [ ] "Volver al catalogo" button pushes to `/carrito` not `/`
  - [ ] Status content fades in/slides up when status changes
  - [ ] Transaction detail appears with animation
  - [ ] Visual icon per status (checkmark for approved, etc.)

  **QA Scenarios**:
  ```
  Scenario: Payment approved shows animated success
    Tool: Playwright
    Preconditions: Navigate to /pago?status=approved
    Steps:
      1. Load the page with approved status
    Expected Result: Green checkmark icon, animated fade-in of content
    Evidence: .sisyphus/evidence/task-8-payment-approved.png

  Scenario: Payment rejected shows error state
    Tool: Playwright
    Preconditions: Navigate to /pago?status=rejected
    Steps:
      1. Load the page with rejected status
    Expected Result: Red X icon, animated fade-in
    Evidence: .sisyphus/evidence/task-8-payment-rejected.png
  ```

  **Commit**: YES (groups with T5-T7)
  - Message: `feat(ui): animate payment status transitions, fix circular link`
  - Files: `frontend/src/views/PaymentView.vue`

---

- [x] 9. **OrdersView — CSS Expand Icons + Toast**

  **What to do**:
  - Edit `frontend/src/views/OrdersView.vue`:
    - **Replace text expand icons**: Change `{{ expandido[pedido.id] ? '▲' : '▼' }}` text characters with CSS-animated arrow using:
      - A styled `<span>` with CSS borders to create a chevron/arrow
      - CSS `transform: rotate(180deg)` for expanded state with transition
    - **Add toast**: Show toast notification if pedidos fail to load
    - Import `useToast()`
    - Ensure all classes matched with CSS

  **Must NOT do**:
  - Don't change order fetching logic
  - Don't modify the expand/collapse behavior

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`vue`]
    - `vue`: Template modifications, conditional classes

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T5, T6, T7, T8, T10)
  - **Blocks**: None
  - **Blocked By**: T1 (Toast), T3 (CSS classes)

  **References**:
  - `frontend/src/views/OrdersView.vue` — Current file: line 73 has text arrow `▲`/`▼`
  - `frontend/public/css/styles.css` — `.expand-icon` class (needs enhancement with CSS arrow)

  **Acceptance Criteria**:
  - [ ] Expand icon is CSS-styled arrow, not text character
  - [ ] Icon rotates 180deg when expanded
  - [ ] Toast shown on load error

  **QA Scenarios**:
  ```
  Scenario: Expand icon animates on click
    Tool: Playwright
    Preconditions: Authenticated user with orders
    Steps:
      1. Navigate to /pedidos
      2. Click on a pedido header
    Expected Result: Arrow rotates 180deg smoothly, details expand
    Evidence: .sisyphus/evidence/task-9-orders-expand.png
  ```

  **Commit**: YES (groups with T5-T8)
  - Message: `fix(orders): CSS expand icons, add toast for errors`
  - Files: `frontend/src/views/OrdersView.vue`

---

- [x] 10. **VendorView — Replace alert() with Toast**

  **What to do**:
  - Edit `frontend/src/views/VendorView.vue`:
    - Import `useToast()` composable
    - Replace `alert(err.message)` on line 69 with `toast.error(err.message)`
    - Add toast notification for successful status change
    - Keep all existing logic intact (cargarPedidos, cambiarEstado, estadoOptions)

  **Must NOT do**:
  - Don't modify vendor state machine transitions
  - Don't change API endpoints or auth logic

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`vue`]
    - `vue`: Composable import, script setup

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T5, T6, T7, T8, T9)
  - **Blocks**: None
  - **Blocked By**: T1 (Toast component)

  **References**:
  - `frontend/src/views/VendorView.vue` — Current file: line 69 uses `alert(err.message)`

  **Acceptance Criteria**:
  - [ ] Zero `alert()` calls in VendorView
  - [ ] Error feedback uses `toast.error()`
  - [ ] Success toast shown on status change

  **QA Scenarios**:
  ```
  Scenario: No alert() in VendorView
    Tool: Bash (grep)
    Preconditions: None
    Steps:
      1. grep -n "alert(" frontend/src/views/VendorView.vue
    Expected Result: 0 matches
    Evidence: .sisyphus/evidence/task-10-no-alert.txt
  ```

  **Commit**: YES (groups with T5-T9)
  - Message: `fix(vendor): replace alert() with toast notifications`
  - Files: `frontend/src/views/VendorView.vue`

---

### Wave 3 — Verification

- [x] 11. **Build Verification**

  **What to do**:
  - Run `cd frontend; npm run build`
  - Confirm 0 errors, 0 warnings
  - Verify all 6 view chunks are present in `dist/assets/`
  - Verify `dist/css/styles.css` exists and is non-empty

  **Must NOT do**:
  - Don't modify any source files

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [] (trivial build command)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T12, T13)
  - **Blocks**: None
  - **Blocked By**: All Wave 2 tasks

  **References**:
  - `frontend/package.json` — Build script: `"build": "vite build"`
  - `frontend/dist/` — Output directory

  **Acceptance Criteria**:
  - [ ] `npm run build` exits with code 0
  - [ ] `dist/assets/` contains JS chunk files for all 6 views
  - [ ] `dist/css/styles.css` exists

  **QA Scenarios**:
  ```
  Scenario: Build succeeds
    Tool: Bash
    Preconditions: None
    Steps:
      1. cd frontend
      2. npm run build
    Expected Result: Build completes with 0 errors, exit code 0
    Evidence: .sisyphus/evidence/task-11-build.txt
  ```

  **Commit**: YES (build output is generated, no source changes)
  - Message: `chore: production build`
  - Files: (build output, no source files)

---

- [x] 12. **Visual QA — Route Transitions + Toast Rendering**

  **What to do**:
  - Verify using Playwright on the built/dev frontend:
    - Route transitions animate (fade out/in) between views
    - Toast appears at top-right and auto-dismisses
    - ConfirmationView checkmark animates
    - PaymentView status icons display correctly per status
    - CartView empty state shows informative text with no link
    - OrdersView expand icon rotates on click
  - Capture screenshots of each state
  - Save evidence to `.sisyphus/evidence/`

  **Must NOT do**:
  - Don't modify any source files — report-only

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`playwright`]
    - `playwright`: Browser automation for visual verification

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T11, T13)
  - **Blocks**: None
  - **Blocked By**: All Wave 2 tasks

  **References**:
  - Each view file for expected rendered output

  **Acceptance Criteria**:
  - [ ] Route transitions visually verified
  - [ ] Toast renders and dismisses
  - [ ] All status icons render correctly
  - [ ] Empty state has no links to "/"

  **QA Scenarios**:
  ```
  Scenario: All visual elements render
    Tool: Playwright
    Preconditions: Frontend dev/build server running
    Steps:
      1. Navigate to /carrito (empty state)
      2. Navigate to /pago?status=approved
      3. Navigate to /confirmacion
      4. Navigate to /pedidos
      5. Navigate to /vendedor
    Expected Result: Each page renders with animations, no console errors
    Evidence: .sisyphus/evidence/task-12-visual-qa/ (screenshots per page)
  ```

  **Commit**: NO (QA-only)

---

- [x] 13. **Code QA — Zero alert() in Views**

  **What to do**:
  - Run `grep -rn "alert(" frontend/src/views/` — confirm 0 matches
  - Run `grep -rn "alert(" frontend/src/components/` — confirm 0 matches (only allowed in Toast.vue if any)
  - Verify no broken links to "/" in any template (should redirect to specific routes)
  - Verify toast import exists in CheckoutView, VendorView, CartView, OrdersView
  - Check for any remaining `console.log()` that should be removed

  **Must NOT do**:
  - Don't modify source files — report findings only

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [] (trivial grep commands)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T11, T12)
  - **Blocks**: None
  - **Blocked By**: All Wave 2 tasks

  **References**:
  - `frontend/src/views/` — All view files
  - `frontend/src/components/` — All component files

  **Acceptance Criteria**:
  - [ ] `alert()` not found in any view file
  - [ ] `RouterLink to="/"` not found in any view template (should use specific routes like `/carrito`)
  - [ ] toast import present in views that need it

  **QA Scenarios**:
  ```
  Scenario: No alert() in production code
    Tool: Bash (grep)
    Preconditions: None
    Steps:
      1. grep -rn "alert(" frontend/src/views/
      2. grep -rn "alert(" frontend/src/components/
    Expected Result: 0 matches in both
    Evidence: .sisyphus/evidence/task-13-no-alert.txt
  ```

  **Commit**: NO (QA-only)

---

## Final Verification Wave

- [x] F1. **Plan Compliance Audit** — `oracle` ✅
- [x] F2. **Code Quality Review** — `unspecified-high` ✅
- [x] F3. **Real Manual QA** — `unspecified-high` ✅
- [x] F4. **Scope Fidelity Check** — `deep` ✅
  Verify no feature creep: only the 10 polish items from plan were implemented, nothing extra.
  Output: `Tasks [N/N compliant] | VERDICT`

---

## Commit Strategy

- **T1-T4**: `feat(ui): add toast system, route transitions, CSS animations, loading enhancement`
- **T5-T10**: `feat(ui): polish all 6 views with animations, toast, and link fixes`
- **T11**: `chore: production build`

---

## Success Criteria

### Verification Commands
```bash
cd frontend && npm run build
grep -rn "alert(" src/views/
grep -rn "alert(" src/components/
```

### Final Checklist
- [ ] All views animate with route transitions
- [ ] Toast system works in all flows (cart, checkout, orders, vendor)
- [ ] No circular links to "/"
- [ ] ConfirmationView has animated checkmark
- [ ] PaymentView has animated status transitions
- [ ] Build passes with 0 errors
- [ ] No alert() in production code



