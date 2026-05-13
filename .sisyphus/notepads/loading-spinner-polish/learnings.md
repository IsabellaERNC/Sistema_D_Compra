# Learnings — Loading Spinner Polish (2026-05-13)

## Patterns Discovered
- `.spinner` and `.loading` classes pre-existed in styles.css at lines 599 and 1113 respectively
- `@keyframes spin` already existed at line 609 but only had `to {}` without `from {}`
- CSS variables available: `--color-primary`, `--gray-200`, `--gray-500`, `--space-4`, `--space-12`

## Changes Made
1. `.spinner`: Changed from 48px to 40px, removed `var(--space-4)` from bottom margin
2. `@keyframes spin`: Added explicit `from { transform: rotate(0deg); }` for clarity
3. `.loading`: Replaced `text-align: center` with flex-column centering, added `gap: var(--space-4)`, changed padding to `var(--space-12) var(--space-4)`, font-size from 1.1rem to 0.95rem
4. `.loading-sm`: New rule using child combinator `.loading-sm .spinner` for 20px/3px variant

## Verification
- Build passes: `cd frontend && npm run build` → ✓ Build successful
- No duplicate `@keyframes spin` rules (single occurrence at line 609)
- No `.vue` files modified (task constraint)
- No `!important` used (task constraint)
