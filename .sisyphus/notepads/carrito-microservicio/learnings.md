# Learnings

## POST /api/carrito implementation (2026-05-08)

### Carrito table schema
- `id`: UUID PRIMARY KEY DEFAULT gen_random_uuid()
- `usuario_id`: INTEGER NOT NULL
- `producto_id`: VARCHAR(50) NOT NULL
- `producto_nombre`: TEXT NOT NULL
- `precio_unitario`: NUMERIC(12,2) NOT NULL
- `cantidad`: INTEGER NOT NULL CHECK (cantidad > 0)
- UNIQUE constraint on `(usuario_id, producto_id)` — enables ON CONFLICT upsert
- Trigger `trg_carrito_updated_at` auto-updates `updated_at` on UPDATE

### Request/Response conventions
- Body uses `nombre` (not `producto_nombre`) — mapped to DB column in INSERT
- Validate with `parseFloat`/`parseInt` to catch non-numeric input
- Response: `{ mensaje, item, carrito }` with status 201
- `item` is the single row from RETURNING, `carrito` is the full user cart

### Router factory pattern
- `module.exports = (pool, verificarToken) => { ... return router; }`
- `verificarToken` middleware sets `req.usuario` (contains `.id`)
- Mounted in `server.js`: `app.use('/api/carrito', carritoRouter(pool, verificarToken))`

### ON CONFLICT upsert pattern
```sql
INSERT INTO carrito (usuario_id, producto_id, producto_nombre, precio_unitario, cantidad)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (usuario_id, producto_id)
DO UPDATE SET cantidad = carrito.cantidad + EXCLUDED.cantidad,
              updated_at = NOW()
RETURNING *
```
- `EXCLUDED` references the VALUES that would have been inserted
- `carrito.cantidad` references the existing row's value

## GET /api/carrito/datos-pago implementation (2026-05-08)

### Endpoint behavior
- Returns payment-ready data for checkout: `{ usuario_id, items, total, moneda }`
- Each item includes computed `subtotal` (`precio_unitario * cantidad`)
- `total` is the sum of all subtotals, rounded to 2 decimals
- Empty cart → 400 `{ error: "El carrito está vacío" }` (not 200 with empty items)
- `moneda` hardcoded to "MXN"

### Computed fields
- `subtotal` and `total` calculated in JS using `parseFloat((raw * cant).toFixed(2))`
- Avoids floating point drift; `.toFixed(2)` ensures clean decimal before `parseFloat`
- Row columns from DB: `producto_id`, `producto_nombre` (mapped to `nombre` in output), `precio_unitario`, `cantidad`

## Plan Compliance Audit — Task F1 (2026-05-08)

### Verdict: ✅ APPROVED
- **Must Have: 6/6** — Tabla carrito, API REST CRUD, fusión guest→user, items detallados, vaciar en pago, frontend sync
- **Must NOT Have: 9/9** — No auth endpoints added (commented out), no ORM/deps nuevas, no webhook signature changes, no localStorage key changes, no stock validation in carrito, no coupons, no multi-moneda, no WebSockets
- Service client interfaces (authClient, productosClient, pagosClient) untouched
- All guardrails respected
