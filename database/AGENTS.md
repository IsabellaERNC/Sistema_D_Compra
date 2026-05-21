# AGENTS.md - Database Layer (Sistema D Compra)

## Identity

This directory contains the PostgreSQL schema, migrations, and configuration for Sistema D Compra. The database is a shared PostgreSQL 15 server used by all microservices (auth, catalogo, carrito, pagos, notificaciones, envios), each operating within its own schema. The files here define only the carrito schema (public schema by default).

## Technology Stack

| Layer | Technology | Notes |
|---|---|---|
| Database | PostgreSQL 15 Alpine | Docker image `postgres:15-alpine` |
| Driver | `pg` (node-postgres) v8 | Pool-based connections from `backend/config.js` |
| Connection pooling | `pg.Pool` | Managed pools, auto-release via `client.release()` |
| Migration tool | None (manual SQL) | Scripts in `database/migrations/`, run manually |
| Schema isolation | Per-service schemas | Carrito uses public schema by default |

## Connection Management

### Pool Configuration

All database access goes through pools created in `backend/server.js` using config from `backend/config.js`. Two pool variants exist:

- **Primary pool** (`config.db`): Used in development, connects to `DB_HOST`/`DB_PORT`.
- **Fallback pool** (`config.externalDb`): Used in Docker/production, connects to `EXTERNAL_DB_HOST`.

Pool discovery logic in `server.js`:

```js
async function tryPool(dbConfig) {
    const pool = new Pool(dbConfig);
    const client = await pool.connect();
    client.release();
    return pool;
}

let pool;
try {
    pool = await tryPool(config.db);
} catch (localErr) {
    pool = await tryPool(config.externalDb);
}
```

> **Updated in production-hardening (2026-05-18)**: This dual DB fallback is for local dev convenience only. In production with a known DB URL, the server should use a single pool directly: `const pool = await tryPool(config.db)`. See root AGENTS.md Microservice URL Migration Guide for step-by-step cleanup instructions.

### Connection Lifecycle Rules

1. All pools are created once at server startup in `server.js`.
2. Pools are passed as a parameter to every route factory: `module.exports = (pool, verificarToken, io) => { ... }`
3. Never create `new Pool()` inside a route handler or service.
4. Always release pooled clients back after use (especially in transactions).
5. The pool handles connection keepalive and reconnection automatically.

### Pool Import Convention

```js
module.exports = (pool, verificarToken, io) => {
    const router = express.Router();
    // use pool directly
};
```

## Query Patterns

### Parameterized Queries (MANDATORY)

Every SQL query MUST use parameterized placeholders (`$1`, `$2`, etc.). String interpolation or template literals for SQL values are FORBIDDEN.

```js
// CORRECT
await pool.query(
    'SELECT * FROM carrito WHERE usuario_id = $1 AND producto_id = $2',
    [usuarioId, productoId]
);

// WRONG - SQL injection risk
await pool.query(
    `SELECT * FROM carrito WHERE usuario_id = ${usuarioId}`
);
```

### SELECT Convention

- Be explicit with column names; avoid `SELECT *` except in simple read routes.
- Use `result.rows` to access returned rows.
- Always check `result.rows.length` before accessing `result.rows[0]`.

```js
const resultado = await pool.query(
    `SELECT id, producto_id, producto_nombre, precio_unitario, cantidad
     FROM   carrito
     WHERE  usuario_id = $1
     ORDER  BY created_at`,
    [usuarioId]
);
const items = resultado.rows;
```

### INSERT Convention

- Always list target columns explicitly.
- Use `RETURNING` to get back server-generated values (UUIDs, timestamps).

```js
const result = await pool.query(
    `INSERT INTO carrito (usuario_id, producto_id, producto_nombre, precio_unitario, cantidad)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, created_at`,
    [usuarioId, productoId, nombre, precio, cantidad]
);
const newId = result.rows[0].id;
```

### UPDATE Convention

- Always include an `updated_at = NOW()` clause in the SET list.
- Use `RETURNING` to confirm the update affected the expected row.

```js
const result = await pool.query(
    `UPDATE carrito
     SET    cantidad = $1, updated_at = NOW()
     WHERE  id = $2 AND usuario_id = $3
     RETURNING id`,
    [nuevaCantidad, itemId, usuarioId]
);
if (result.rows.length === 0) { /* not found */ }
```

### DELETE Convention

- Hard deletes are used for cart items and transient data.
- Use `RETURNING` to confirm deletion count.

```js
const result = await pool.query(
    'DELETE FROM carrito WHERE id = $1 AND usuario_id = $2 RETURNING id',
    [itemId, usuarioId]
);
```

`DELETE` is blocked on `transacciones` and `pedidos` tables by the `prevent_delete()` trigger.

## Transaction Pattern

For operations that modify multiple rows or tables atomically (order processing, payment confirmation), use a client-acquired transaction:

```js
const client = await pool.connect();
try {
    await client.query('BEGIN');

    // All queries use client, not pool
    const updateResult = await client.query(
        `UPDATE transacciones SET estado = $1, updated_at = NOW()
         WHERE  id = $2
         RETURNING id, usuario_id, items, total`,
        [estadoDB, transaccionId]
    );

    if (updateResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Not found' });
    }

    const insertResult = await client.query(
        `INSERT INTO pedidos (usuario_id, estado, items, monto_total, transaccion_id)
         VALUES ($1, 'PENDIENTE', $2, $3, $4)
         RETURNING id`,
        [userId, itemsJson, total, transaccionId]
    );

    await client.query('COMMIT');
    return res.json({ pedidoId: insertResult.rows[0].id });

} catch (err) {
    await client.query('ROLLBACK');
    console.error('[TRANSACTION]', err);
    return res.status(500).json({ error: 'Error processing transaction' });
} finally {
    client.release();
}
```

### Transaction Rules

1. `pool.connect()` gets a dedicated client from the pool.
2. Always `BEGIN` first, then run queries via `client.query()`.
3. On success: `COMMIT`, then return response.
4. On error: `ROLLBACK`, then throw or return error.
5. **Always** call `client.release()` in `finally` to return the client to the pool.
6. Never use `pool.query()` inside a transaction block. Use the `client` instance.
7. Never hold a transaction open across async boundaries. No `await` between BEGIN and COMMIT that is not a DB query.

## Hard Delete vs Soft Delete

### Hard Delete

Used for cart items (`carrito` table) and transient records. Direct `DELETE FROM` queries with `RETURNING id` are the pattern.

### Soft Delete (Blocked)

The `pedidos` and `transacciones` tables have a `prevent_delete` trigger that raises an exception on any DELETE:

```sql
CREATE OR REPLACE FUNCTION prevent_delete()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'DELETE no permitido en esta tabla. Usa soft-delete si es necesario.';
END;
$$ LANGUAGE plpgsql;
```

For these tables, "deletion" is modeled as a **state transition**:
- `pedidos`: transition to `'CANCELADO'` state.
- `transacciones`: transition to `'CANCELADA'` or `'RECHAZADA'` state.

State transitions are the canonical way to "remove" or "invalidate" records. No `deleted_at` column or `is_active` flag is used.

## Schema Naming Conventions

### Table Names
- `snake_case` **plural** nouns: `carrito`, `pedidos`, `direcciones`, `transacciones`, `eventos_pendientes`, `log_estados`.
- No prefixes or suffixes.

### Column Names
- `snake_case`: `usuario_id`, `producto_nombre`, `precio_unitario`, `monto_total`, `direccion_envio_id`, `referencia_pago_externa`.
- ID columns are `UUID` with `DEFAULT gen_random_uuid()` (except `log_estados.id` which uses `GENERATED ALWAYS AS IDENTITY`).
- Foreign key references match the referenced table's logical ID name: `usuario_id` (INTEGER, logical FK to auth service), `transaccion_id` (UUID, real FK), `direccion_envio_id` (UUID, real FK).
- Timestamp columns: `created_at`, `updated_at` (both `TIMESTAMPTZ`).
- All financial columns use `NUMERIC(12,2)` with CHECK constraints enforcing non-negative values.
- JSON data stored in `JSONB` columns (`items`, `payload`).

### Constraint Names
- `fk_{table}_{column}` for foreign keys: `fk_pedidos_transaccion`, `fk_pedidos_direccion`.
- `uq_{table}_{column}` for unique constraints: `uq_carrito_usuario_producto`, `uq_transacciones_referencia_pago_externa`.

### Trigger Names
- `trg_{table}_{action}`: `trg_carrito_updated_at`, `trg_pedidos_normalizar_estado`, `trg_transacciones_prevent_delete`.
- Index names: `idx_{table}_{columns}`: `idx_transacciones_usuario_estado`, `idx_eventos_pendientes_estado_next_retry`.

## Key Tables

### `carrito` - Shopping Cart Items

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | `DEFAULT gen_random_uuid()` |
| `usuario_id` | INTEGER | Logical FK to auth.usuarios |
| `producto_id` | VARCHAR(50) | External product identifier |
| `producto_nombre` | TEXT | Denormalized from catalogo |
| `precio_unitario` | NUMERIC(12,2) | CHECK >= 0 |
| `cantidad` | INTEGER | CHECK > 0 |
| `ultima_actividad` | TIMESTAMPTZ | Used for TTL queries (30 day expiry) |
| `created_at` / `updated_at` | TIMESTAMPTZ | Auto-managed |

Unique constraint: `(usuario_id, producto_id)` prevents duplicate products for same user.

### `pedidos` - Orders (State Machine)

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | `DEFAULT gen_random_uuid()` |
| `usuario_id` | INTEGER | Logical FK to auth.usuarios |
| `estado` | VARCHAR(20) | CHECK: PENDIENTE, PROCESANDO, ENVIADO, ENTREGADO, CANCELADO |
| `items` | JSONB | Full cart snapshot at order time |
| `monto_total` | NUMERIC(12,2) | CHECK >= 0 |
| `direccion_envio_id` | UUID | FK to `direcciones.id` |
| `transaccion_id` | UUID | FK to `transacciones.id`, UNIQUE |
| `created_at` / `updated_at` | TIMESTAMPTZ | Auto-managed |

Triggers: `trg_pedidos_normalizar_estado` (UPPERCASE normalize), `trg_pedidos_prevent_delete` (blocks DELETE), `trg_pedidos_updated_at`.

State machine transitions enforced at the application layer:

```js
const TRANSICIONES_VALIDAS = {
    'PENDIENTE':  ['PROCESANDO', 'CANCELADO'],
    'PROCESANDO': ['ENVIADO',    'CANCELADO'],
    'ENVIADO':    ['ENTREGADO'],
    'ENTREGADO':  [],
    'CANCELADO':  []
};
```

### `direcciones` - Shipping Addresses

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | `DEFAULT gen_random_uuid()` |
| `usuario_id` | INTEGER | Logical FK to auth.usuarios |
| `alias` | VARCHAR(50) | User-defined label |
| `calle` | VARCHAR(200) | Street address |
| `ciudad` | VARCHAR(100) | City |
| `departamento` | VARCHAR(100) | State/department |
| `codigo_postal` | VARCHAR(20) | Postal code |
| `predeterminada` | BOOLEAN | Default address flag |

### `transacciones` - Payment Transactions

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | `DEFAULT gen_random_uuid()` |
| `usuario_id` | INTEGER | Logical FK |
| `usuario_email` | VARCHAR(255) | Denormalized for audit |
| `items` | JSONB | Cart items at payment time |
| `total` | NUMERIC(12,2) | CHECK >= 0 |
| `moneda` | VARCHAR(3) | DEFAULT 'COP' |
| `estado` | VARCHAR(20) | CHECK: PENDIENTE, APROBADA, RECHAZADA, CANCELADA |
| `referencia_pago_externa` | VARCHAR(255) | UNIQUE, external gateway ref |
| `ip_address` | VARCHAR(45) | Client IP (IPv4/IPv6) |
| `user_agent` | TEXT | Browser user agent |
| `ultimo_intento_pago` | TIMESTAMPTZ | Timestamp of last attempt |
| `direccion_envio_id` | UUID | FK to `direcciones.id` |

Triggers: `trg_transacciones_prevent_delete` (blocks DELETE), `trg_transacciones_updated_at`.

### `eventos_pendientes` - Event/Retry Queue

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | `DEFAULT gen_random_uuid()` |
| `tipo` | VARCHAR(50) | Event type: `deducir_stock`, `notificar_pedido` |
| `payload` | JSONB | Event-specific data |
| `intentos` | INTEGER | Current retry count, DEFAULT 0 |
| `max_intentos` | INTEGER | Max retries, DEFAULT 3 |
| `estado` | VARCHAR(20) | CHECK: PENDIENTE, PROCESANDO, COMPLETADO, FALLIDO |
| `next_retry_at` | TIMESTAMPTZ | For exponential backoff |
| `correlation_id` | UUID | Links related events |
| `event_id` | UUID | Unique event identifier |
| `created_at` / `updated_at` | TIMESTAMPTZ | Auto-managed |

This table is the outbox/retry queue. Events are dequeued with `FOR UPDATE SKIP LOCKED`.

### `log_estados` - Order State Audit Log

| Column | Type | Notes |
|---|---|---|
| `id` | BIGINT (PK) | `GENERATED ALWAYS AS IDENTITY` |
| `pedido_id` | UUID | FK to `pedidos.id` |
| `estado_anterior` | VARCHAR(20) | Previous state |
| `estado_nuevo` | VARCHAR(20) | New state |
| `cambiado_por` | INTEGER | User ID who made the change |
| `cambiado_por_tipo` | VARCHAR(20) | CHECK: vendedor, sistema, admin |
| `created_at` | TIMESTAMPTZ | Auto-set |

### Cross-Schema Tables (Not in This Schema)

The following tables exist in other microservice schemas and are referenced logically via `usuario_id` (INTEGER):

- **`auth.usuarios`**: User accounts, authentication, vendor roles. Referenced by all tables via `usuario_id`.
- **`auth.vendedores`**: Vendor profiles linked to usuarios.
- **`catalogo.productos`**: Product catalog. Queried through HTTP client (`productosClient`), not directly via SQL.

There are no real foreign keys between schemas. Cross-schema joins happen at the application layer via HTTP service clients.

## State Machine in SQL

State is implemented as `VARCHAR(20)` columns with `CHECK` constraints (not native ENUM types). This gives flexibility for migration while keeping constraints at the database level.

### pedidos.estado
```sql
CHECK (estado IN ('PENDIENTE', 'PROCESANDO', 'ENVIADO', 'ENTREGADO', 'CANCELADO'))
```

A `BEFORE INSERT OR UPDATE` trigger (`normalizar_estado_pedido`) forces uppercase normalization:

```sql
CREATE OR REPLACE FUNCTION normalizar_estado_pedido()
RETURNS TRIGGER AS $$
BEGIN
  NEW.estado = UPPER(TRIM(NEW.estado));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### transacciones.estado
```sql
CHECK (estado IN ('PENDIENTE', 'APROBADA', 'RECHAZADA', 'CANCELADA'))
```

### eventos_pendientes.estado
```sql
CHECK (estado IN ('PENDIENTE', 'PROCESANDO', 'COMPLETADO', 'FALLIDO'))
```

### log_estados.cambiado_por_tipo
```sql
CHECK (cambiado_por_tipo IN ('vendedor', 'sistema', 'admin'))
```

### State Migration Pattern

When adding or modifying states, the migration follows this pattern:

```sql
BEGIN;
  ALTER TABLE pedidos DROP CONSTRAINT IF EXISTS pedidos_estado_check;
  UPDATE pedidos SET estado = UPPER(TRIM(estado));
  ALTER TABLE pedidos
    ADD CONSTRAINT pedidos_estado_check
    CHECK (estado IN ('PENDIENTE', 'PROCESANDO', 'ENVIADO', 'ENTREGADO', 'CANCELADO'));
COMMIT;
```

## Concurrency

### FOR UPDATE SKIP LOCKED - Event Queue Dequeue

The `eventos_pendientes` table is consumed by concurrent workers. To prevent duplicate processing, the dequeue query uses PostgreSQL row-level locking:

```js
const { rows: eventos } = await pool.query(
    `SELECT id, tipo, payload, intentos, max_intentos
     FROM   eventos_pendientes
     WHERE  estado = 'PENDIENTE'
       AND  intentos < max_intentos
       AND  (next_retry_at IS NULL OR next_retry_at <= NOW())
     ORDER  BY created_at ASC
     FOR UPDATE SKIP LOCKED`
);
```

- `FOR UPDATE` locks the selected rows against concurrent writes.
- `SKIP LOCKED` skips rows already locked by another transaction instead of waiting.
- This allows multiple worker processes to pull distinct events simultaneously without conflicts.

### Rate Limiting at Application Layer

Payment attempts are rate-limited via COUNT query before transaction creation:

```js
const intentosRecientes = await pool.query(
    `SELECT COUNT(*)::int AS total FROM transacciones
     WHERE  usuario_id  = $1
       AND  estado      = 'PENDIENTE'
       AND  created_at  > $2`,
    [usuario.id, hace10min.toISOString()]
);
```

### Exponential Backoff

Events use `next_retry_at` with exponential delay calculated at the application layer:

```js
const delaySeconds = Math.pow(2, evento.intentos) * 5; // 5, 10, 20 seconds...
await pool.query(
    `UPDATE eventos_pendientes
     SET    estado = $1, next_retry_at = NOW() + INTERVAL '1 second' * $2,
            updated_at = NOW()
     WHERE  id = $3`,
    ['FALLIDO', delaySeconds, evento.id]
);
```

## Indexes

| Index | Table | Columns | Purpose |
|---|---|---|---|
| `idx_transacciones_usuario_estado` | transacciones | `(usuario_id, estado)` | User transaction history + rate limiting |
| `idx_transacciones_created_at` | transacciones | `(created_at)` | Time-range queries |
| `idx_eventos_pendientes_estado_next_retry` | eventos_pendientes | `(estado, next_retry_at)` | Queue dequeue performance |
| `idx_pedidos_usuario_estado` | pedidos | `(usuario_id, estado)` | User order listing by status |

## Migrations

Directory: `database/migrations/`

- No migration framework is used. SQL scripts are versioned and executed manually.
- Naming convention: `NNN_description.sql` (e.g., `006_normalizar_estados.sql`).
- Each migration is wrapped in `BEGIN; ... COMMIT;` for atomicity.
- Migrations should be idempotent:
  - Use `DROP CONSTRAINT IF EXISTS` before modifying constraints.
  - Use `CREATE TABLE IF NOT EXISTS` in the main schema.
  - Use `CREATE INDEX IF NOT EXISTS`.

## SQL Functions

### `actualizar_updated_at()`
Trigger function that sets `NEW.updated_at = NOW()`. Applied to every table with an `updated_at` column.

### `prevent_delete()`
Trigger function that raises an exception on DELETE. Applied to `transacciones` and `pedidos`.

### `normalizar_estado_pedido()`
Trigger function that normalizes `NEW.estado = UPPER(TRIM(NEW.estado))`. Applied to `pedidos` for INSERT and UPDATE of estado column.

## Financial Constraints

All monetary columns use `NUMERIC(12,2)` with CHECK constraints:
- `transacciones.total >= 0`
- `carrito.precio_unitario >= 0`
- `pedidos.monto_total >= 0`

Input validation also at the application layer:
- Cart subtotal: `parseFloat(item.precio_unitario) * parseInt(item.cantidad)` with `toFixed(2)` rounding.
- Shipping: free for subtotals >= 200000 COP, otherwise 15000 COP.
- Minimum total check: `totalCalculado > 0`.

## What NOT to Do

### No String Interpolation in Queries
```js
// FORBIDDEN
pool.query(`SELECT * FROM usuarios WHERE id = ${id}`);

// CORRECT
pool.query('SELECT * FROM usuarios WHERE id = $1', [id]);
```

### No Synchronous Queries
```js
// FORBIDDEN - no synchronous pg API
const result = pool.querySync('...');

// CORRECT
const result = await pool.query('...', [params]);
```

### No Connection Leaks
```js
// FORBIDDEN - client not released
const client = await pool.connect();
await client.query('BEGIN');
// ... work ...
// missing client.release()

// CORRECT - release in finally
const client = await pool.connect();
try {
    await client.query('BEGIN');
    // ... work ...
    await client.query('COMMIT');
} catch (e) {
    await client.query('ROLLBACK');
    throw e;
} finally {
    client.release();
}
```

### No SELECT * in Production Code
```js
// AVOID - unclear which columns are returned
pool.query('SELECT * FROM pedidos WHERE usuario_id = $1', [id]);

// PREFERRED - explicit column list
pool.query(
    'SELECT id, estado, items, monto_total, created_at FROM pedidos WHERE usuario_id = $1',
    [id]
);
```

### No N+1 Query Pattern
```js
// AVOID - N+1 queries in a loop
const items = await pool.query('SELECT * FROM carrito WHERE usuario_id = $1', [id]);
for (const item of items.rows) {
    const p = await pool.query('SELECT * FROM productos WHERE id = $1', [item.producto_id]);
}

// PREFERRED - batch via IN clause or JOIN
// (cross-schema joins not possible here, use HTTP client batch endpoints)
```

### No New Pool Instances in Routes
```js
// FORBIDDEN
router.get('/', async (req, res) => {
    const pool = new Pool({ ... });
});
```

### No Implicit Commits
DDL statements (CREATE, ALTER, DROP) cause implicit commits. Never mix DDL with transactional DML.

### No Raw SQL Interpolation for JSON
```js
// FORBIDDEN
pool.query(`INSERT INTO pedidos (items) VALUES ('${JSON.stringify(items)}')`);

// CORRECT
pool.query(
    'INSERT INTO pedidos (items) VALUES ($1)',
    [JSON.stringify(items)]
);
```

### No Trusting Client-Provided SQL Values
- Validate enum-like values against a whitelist before using in queries.
- Parse and validate numeric input before financial calculations.
- Always cast aggregate results: `SELECT COUNT(*)::int AS total`.

## Schema File Anatomy

The canonical schema file `schema_completo.sql` is organized as:

1. Trigger functions (`actualizar_updated_at`, `prevent_delete`)
2. Transaction table (`transacciones`)
3. Cart table (`carrito`)
4. Addresses table (`direcciones`)
5. Orders table (`pedidos`) + state normalization trigger
6. State audit log (`log_estados`)
7. Event queue (`eventos_pendientes`)
8. Composite indexes
9. Foreign key constraints

Always add new tables following this ordering convention. Place new indexes after all table definitions.

## Production Hardening (2026-05-18)

### Dual DB Fallback — Planned Cleanup

The current dual-pool fallback (`tryPool(config.db)` → `tryPool(config.externalDb)`) is used during local development where DB location varies. In production:

1. Decide the single DB configuration (host, port, user, password, database).
2. Set `DB_HOST`, etc. to the production values.
3. Remove or ignore `EXTERNAL_DB_*` variables from the environment.
4. Update `server.js`: replace the try/fallback with `const pool = await tryPool(config.db)`.

No changes are needed to the route factory pattern — every route receives the pool as its first parameter regardless of which pool is used.

### What Did NOT Change
- All query patterns, transaction conventions, and SQL rules remain identical
- Schema, migrations, and table definitions are untouched
- Connection lifecycle rules (`client.release()` in `finally`, `BEGIN`/COMMIT/ROLLBACK) unchanged
