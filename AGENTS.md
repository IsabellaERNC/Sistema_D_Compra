# PROJECT KNOWLEDGE BASE

**Generated:** 2026-05-07
**Commit:** e0a83ee
**Branch:** main

## OVERVIEW
Sistema de compras full-stack dividido en `frontend/` est�tico con Vite y `backend/` Express/PostgreSQL. No hay monorepo tooling; cada lado tiene su propio `package.json`.

## STRUCTURE
```text
Sistema_D_Compra/
+-- backend/      # API Express, auth JWT, rutas de transacciones
+-- database/     # esquema PostgreSQL inicial
+-- frontend/     # HTML multip�gina, JS vanilla, CSS global
+-- README.md
```

## WHERE TO LOOK
| Task | Location | Notes |
|---|---|---|
| Iniciar backend | `backend/server.js` | `app.listen`, `Pool`, endpoints auth |
| Rutas de transacciones | `backend/routes/transacciones.js` | router factory con `pool` y `verificarToken` |
| Esquema DB | `database/schema.sql` | tablas `usuarios`, `transacciones`, trigger `updated_at` |
| Landing/productos | `frontend/index.html` + `frontend/js/main.js` | cat�logo y carrito guest/user |
| Login/registro | `frontend/js/auth.js` | modal auth, token, usuario en `localStorage` |
| Flujo carrito/pago | `frontend/pages/carrito.html`, `frontend/pages/pago.html`, `frontend/js/carrito.js` | checkout manual, POST a backend |
| Comandos | `backend/package.json`, `frontend/package.json` | no scripts ra�z |

## CODE MAP
| Symbol | Type | Location | Refs | Role |
|---|---|---|---:|---|
| `verificarToken` | function | `backend/server.js` | 4 | middleware JWT compartido |
| `transaccionesRouter` | router factory | `backend/routes/transacciones.js` | 1 | CRUD de transacciones |
| `app.post('/api/auth/register')` | route | `backend/server.js` | 1 | alta de usuario |
| `app.post('/api/auth/login')` | route | `backend/server.js` | 1 | emite JWT |
| `mostrarProductos` | function | `frontend/js/main.js` | 2 | render cat�logo desde `localStorage` |
| `onLoginExitoso` | function | `frontend/js/main.js` | 1 | fusiona carrito guest/user |
| `renderAuthNav` | function | `frontend/js/auth.js` | 1 | navbar seg�n sesi�n |

## CONVENTIONS
- Backend en CommonJS (`require`, no ESM).
- Frontend sin framework; scripts cargados con `<script src=...>` y handlers inline `onclick`.
- Respuestas API en espa�ol; �xito usa `mensaje`, error usa `error`.
- Persistencia cliente con `localStorage` (`token`, `usuario`, `stock`, `carrito_*`).
- SQL parametrizado con `$1`, `$2`; keywords SQL en may�sculas.

## ANTI-PATTERNS (THIS PROJECT)
- No hay reglas expl�citas tipo `DO NOT`/`NEVER` en el repo; evitar inventarlas en docs hijas.
- No asumir infraestructura inexistente: no hay tests, Docker, CI, lint ni `.env` operativo aunque `dotenv` est� instalado.
- No mover l�gica al root: backend/frontend se documentan por separado.

## UNIQUE STYLES
- Espaciado alineado en `backend/server.js` (`const express  = ...`, `const bcrypt   = ...`).
- Comentarios, mensajes y labels de UI en espa�ol.
- Flujo h�brido guest/auth: carrito an�nimo se fusiona al iniciar sesi�n.
- `frontend/` es multip�gina tradicional aunque use Vite.

## COMMANDS
```bash
cd backend && npm start      # servidor Node en puerto 3000
cd backend && npm run dev    # nodemon
cd frontend && npm run dev   # Vite dev server
cd frontend && npm run build # build frontend
cd frontend && npm run preview
```

## NOTES
- `backend/server.js` y `frontend/js/auth.js` muestran cadenas truncadas/corruptas en lecturas actuales; revisar sintaxis antes de cambios funcionales.
- Credenciales DB y `JWT_SECRET` est�n hardcodeados en backend.
- No existe `AGENTS.md` previo; este archivo es la ra�z de la jerarqu�a.
