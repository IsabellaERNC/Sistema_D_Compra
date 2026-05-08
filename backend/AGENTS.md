# BACKEND KNOWLEDGE BASE

## OVERVIEW
API Express en CommonJS con auth JWT inline y un router modular para transacciones.

## STRUCTURE
```text
backend/
+-- package.json
+-- server.js
+-- routes/
    +-- transacciones.js
```

## WHERE TO LOOK
| Task | Location | Notes |
|---|---|---|
| Bootstrap servidor | `server.js` | `express()`, `Pool`, `app.listen` |
| Config DB/JWT | `server.js` | `Pool({...})`, `JWT_SECRET` |
| Auth register/login/me | `server.js` | rutas definidas inline |
| CRUD transacciones | `routes/transacciones.js` | `POST /`, `GET /`, `GET /:id`, `PATCH /:id/estado` |

## CONVENTIONS
- CommonJS en todo el backend.
- Router exportado como factory: `module.exports = (pool, verificarToken) => router`.
- Queries SQL directas en handlers; no capa service/controller.
- Respuestas en JSON con `error` o `mensaje`.
- Logs de error con `console.error`, a veces con prefijo de endpoint.

## ANTI-PATTERNS
- No asumir `.env`: `dotenv` est� en dependencias pero la configuraci�n activa est� hardcodeada en `server.js`.
- No extraer patrones de tests o CI: no existen en backend.
- Evitar documentar `router/` como �rea gen�rica de m�dulos; hoy solo contiene transacciones.

## NOTES
- `server.js` contiene el punto �nico de configuraci�n; cambios de puerto, DB o JWT empiezan ah�.
- El archivo le�do muestra un `app.listen` aparentemente truncado; validar sintaxis antes de editar.
- `package.json` solo expone `start` y `dev`.
