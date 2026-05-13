# F1 Plan Compliance Audit — Issues

## Issue 1: Inline style block in AppHeader.vue (Must NOT Have #7 violation)

- **File**: frontend/src/components/AppHeader.vue
- **Line**: 77-81
- **Content**: style scoped block with single rule .nav-perfil { position: relative; }
- **Rule**: No inline style blocks in components — use the global CSS
- **Severity**: LOW — only 1 CSS property, likely intentional for scoping
- **Fix**: Move .nav-perfil { position: relative; } to public/css/styles.css
