
## 2026-05-12: CSS Wave 3 amendment
- Added .totales, .totales-row (Checkout View) and .btn-group (Payment View) to styles.css
- Insertion points: after .item-detalle (line 928), after .valor (line 970)
- All rules use existing CSS variables from :root (--space-*, --gray-*, --radius-*)

## 2026-05-13: Toast & Route Transition Global CSS
- Added toast notification CSS (`.toast-container`, `.toast`, `.toast-message`, `.toast-close`, `.toast-{type}` variants) to styles.css
- Added route transition classes (`.page-fade-enter-active`, `.page-fade-leave-active`, `.page-fade-enter-from`, `.page-fade-leave-to`)
- Added `@keyframes toastFadeIn` and `@keyframes toastFadeOut` animations
- Inserted before the `@media (max-width: 640px)` block at line 1194 (between badge variants and responsive)
- All new rules use existing CSS variables: `--color-success`, `--color-danger`, `--color-warning`, `--color-info`, `--radius-md`, `--shadow-lg`, `--gray-400`, `--gray-600`, `--gray-700`
- Zero `!important` usage, zero duplicate selectors (verified via grep)
- File grew from 1155 to 1222 lines (+67 lines)
- No LSP server available for CSS (biome not installed) — manual verification used instead
