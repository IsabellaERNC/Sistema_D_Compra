# FRONTEND KNOWLEDGE BASE

## OVERVIEW
Frontend HTML/CSS/JS vanilla servido con Vite, organizado como sitio multipágina con estado en `localStorage`.

## STRUCTURE
```text
frontend/
+-- css/
¦   +-- styles.css
+-- js/
¦   +-- auth.js
¦   +-- carrito.js
¦   +-- main.js
+-- pages/
¦   +-- carrito.html
¦   +-- confirmacion.html
¦   +-- login.html
¦   +-- pago.html
+-- index.html
+-- package.json
```

## WHERE TO LOOK
| Task | Location | Notes |
|---|---|---|
| Home + catálogo | `index.html`, `js/main.js` | render de productos y contador |
| Auth modal/nav | `js/auth.js` | login/register/logout y dropdown perfil |
| Carrito | `pages/carrito.html`, `js/carrito.js` | cantidades, vaciar, iniciar pago |
| Pago | `pages/pago.html` | POST autenticado con Bearer token |
| Confirmación | `pages/confirmacion.html` | limpia estado final |
| Estilos globales | `css/styles.css` | shared classes, modal, nav, botones |

## CONVENTIONS
- Scripts clásicos con `<script src>`; no imports ES modules.
- Handlers inline frecuentes: `onclick="..."` en HTML y HTML generado desde JS.
- Estado persistido en `localStorage`: `token`, `usuario`, `stock`, `carrito_guest`, `carrito_<id>`, `ultimoTotal`.
- Texto visible y mensajes en español.
- HTML generado con template strings; stock y carrito se recalculan/renderizan manualmente.

## ANTI-PATTERNS
- No asumir SPA/router cliente: la navegación real ocurre entre `index.html` y `pages/*.html`.
- No introducir dependencias de framework sin revisar todo el flujo; el código actual depende de globals compartidos entre páginas.
- No documentar tests visuales o E2E: no existen.

## NOTES
- `auth.js` leído desde herramientas aparece truncado/corrupto en la línea de `API_URL`; validar el archivo completo antes de cambios.
- `package.json` solo tiene `dev`, `build`, `preview`.
- La landing mezcla modal auth embebido y redirect fallback a `pages/login.html`.
