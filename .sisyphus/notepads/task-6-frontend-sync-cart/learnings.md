## Frontend: agregarAlCarrito backend sync (2026-05-08)

- Added backend cart sync in `agregarAlCarrito()` at `main.js` line 91-106
- After localStorage update, checks `isLoggedIn()`
- If authenticated: POST to `/api/carrito` with `{producto_id, nombre, precio_unitario, cantidad: 1}`
- Uses non-blocking `fetch().catch()` — backend failures never block UI
- If not authenticated: keeps existing localStorage-only behavior (guest fallback)
- Field mapping: `producto.id→producto_id`, `producto.nombre→nombre`, `producto.precio→precio_unitario`
- Defensive check: `typeof isLoggedIn === 'function'` before calling
