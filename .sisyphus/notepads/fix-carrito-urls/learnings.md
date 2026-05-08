## Carrito URL fixes completed 2026-05-08

- Changed AUTH_LOGIN_URL from truncated 'http: to full URL (http://localhost:4000/auth/login?redirect=)
- Changed login redirect from 'login.html' to AUTH_LOGIN_URL + encodeURIComponent()
- Changed fetch URL from truncated 'http: to full URL (http://localhost:3000/api/checkout/iniciar)

Note: edit tool with short patterns like 'http: can cause duplication when pattern matches inside already-replaced text on re-application. Use wider context or full-file write instead.
