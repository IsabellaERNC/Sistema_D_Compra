## T1: Toast Notification System

### CSS Variable Mismatch
- Task spec references `--color-error` but project CSS uses `--color-danger` (#EF4444)
- Mapped type='error' → `--color-danger` in ToastNotification.vue
- All other variables match: --color-success, --color-warning, --color-info, --radius-md, --shadow-lg

### Singleton Pattern for useToast
- Module-level `ref(null)` + `let timer` at top of useToast.js ensures all callers share one toast state
- ESM modules are cached by Vite, so the ref is instantiated once
- No provide/inject needed - simpler and equally effective

### Component Design
- Scoped styles keep toast CSS isolated from global styles
- toastFadeIn animation: opacity 0→1 + translateY(-8px→0) over 300ms
- Close button (×) for manual dismiss
- aria-label on close button for accessibility

### Files Created/Modified
- `frontend/src/composables/useToast.js` - new
- `frontend/src/components/ToastNotification.vue` - new
- `frontend/src/App.vue` - modified (added ToastNotification import + template + useToast call)

## T7: ConfirmationView Animated Checkmark

### SVG Checkmark Implementation
- Replaced `<div class="icono">OK</div>` with inline SVG containing:
  - `<circle>` with `var(--color-success)` fill — scales in via `circlePop` keyframe
  - `<polyline>` checkmark path with `stroke-dasharray: 61` + `stroke-dashoffset: 61` — draws via `checkDraw` keyframe
- Path length calculated as ~61px (25,45→40,60→65,30)
- `cubic-bezier(0.34, 1.56, 0.64, 1)` gives slight overshoot/spring to the circle scale

### Animation Cascade
- Card fades in: `cardFadeIn` 500ms ease-out (opacity + translateY rise)
- Circle pops: `circlePop` 400ms spring-style ease-out, starts immediately
- Checkmark draws: `checkDraw` 500ms ease-out, starts after 250ms delay (`animation-delay` via forward shorthand)
- All animations use `both` fill mode so elements are invisible before animation starts

### Layout
- Added `.confirmacion-wrap` flex centering (replaces whatever global styles were providing centering)
- `.caja-confirmacion` max-width 460px, centered text
- `.icono` set to 90px × 90px inline-flex container

### Files Modified
- `frontend/src/views/ConfirmationView.vue` — replaced icon + added full `<style scoped>` block

### Build Note
- Pre-existing build error: VendorView.vue imports `@/composables/useToast` which doesn't exist
- ConfirmationView assets generated successfully in dist/ despite overall build failure


## T8: PaymentView Animated Status Transitions (2026-05-13)
- Replaced circular redirect: `\.push('/')` ? `\.push('/carrito')` (3 total occurrences verified)
- Added CSS-only status icons using ::before/::after pseudo-elements:
  - approved: green circle with rotated border checkmark (var(--color-success))
  - pending: amber circle + vertical clock hand (var(--color-warning))
  - rejected: red X using two 45deg rotated lines (var(--color-danger))
  - unknown: blue '?' character (var(--color-info))
- Added @keyframes fadeInUp (translateY 20px+opacity) and @keyframes slideUp (24px variant)
- Applied staggered animation delays: .delay-1 (0.15s), .delay-2 (0.3s), .delay-3 (0.45s)
- Used :key binding for forced re-render on status change to re-trigger animations
- All colors reference --color-* CSS variables from global design system
- Build passes cleanly: PaymentView CSS chunk 4.52KB (1.17KB gzip)
