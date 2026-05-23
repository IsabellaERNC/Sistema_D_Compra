# AGENTS.md — Sistema_D_Compra

## Project structure
- `backend/` — Node.js/Express 5 (CommonJS), PostgreSQL, JWT auth (`server.js`)
- `frontend/` — Vanilla HTML/CSS/JS, Vite dev server
- `database/` — SQL schema only (apply manually)

## Getting started
```powershell
# Backend (localhost:3000)
cd backend; npm install; npm start

# Frontend dev server (separate terminal)
cd frontend; npm install; npm run dev
```

The frontend hardcodes `API_URL = 'http://localhost:3000'` in `frontend/js/auth.js:1` — dev server must be on port 3000 or CORS will break.

## Database
- PostgreSQL, database name: `sistema_compras`
- Run `database/schema.sql` to create tables (`usuarios`, `transacciones`)
- Credentials hardcoded in `backend/server.js:16-22` (user: `postgres`, password: `Rocko306`, port: 5432)

## Architecture quirks
- `backend/router/transacciones.js` is a **router factory** — exported as a function receiving `(pool, verificarToken)`, registered at `server.js:52-53`
- `backend/routes/`, `backend/controllers/`, `backend/models/` are **empty/unused** — don't add files there, the router pattern is the convention
- `frontend/js/auth.js` defines `getCarritoKey()` — cart state stored in `localStorage` under `carrito_{userId}` or `carrito_guest`
- Stock is also `localStorage` under key `stock`
- `pages/login.html` and `pages/carrito.html` duplicate the modal auth from `index.html` — changes may need to be mirrored

## Auth
- JWT with 24h expiry, secret hardcoded: `'grupo3_los_master_prohacker'` (server.js:9)
- Token sent as `Authorization: Bearer <token>`
- Backend auth endpoints: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- Transacciones require auth token on all routes

## No tests / no lint / no typecheck
- Backend `npm test` is a placeholder — no test framework installed
- No ESLint, Prettier, or TypeScript config exists anywhere

## Known gotchas
- **Express 5** — check for breaking changes if adding middleware; error handling differs from Express 4
- `dotenv` is listed in backend dependencies but **not used** — credentials are hardcoded
- Frontend `package.json` lists `cors` and `express` as dependencies — **unnecessary**, these are backend packages that won't run in the browser
- `backend/package-lock.json` exists but shouldn't be edited manually
- Commit messages are in Spanish (feat/fix style)
- No Vite config file — Vite uses defaults
