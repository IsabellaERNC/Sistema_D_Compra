# Migration Carrito - Learnings

## Patterns Used
- Existing schema at `database/schema_transacciones.sql` uses `gen_random_uuid()` for UUIDs, `TIMESTAMPTZ` for dates, `NOW()` for defaults
- Function `actualizar_updated_at()` already exists and is reusable
- Trigger naming pattern: `trg_tabla_updated_at`
- Index naming pattern: `idx_tabla_columna`
- Comment header style uses `====` separators

## Design Decisions
- No FK to local users table (auth is external) — matches existing pattern in schema_transacciones.sql
- UNIQUE constraint on (usuario_id, producto_id) prevents duplicate products in cart
- All new columns in transacciones use `ADD COLUMN IF NOT EXISTS` for idempotent migration
- moneda defaults to 'MXN' for Mexican Peso (project context)
- referencia_pago_externa is VARCHAR(255) for external payment processor IDs
- items column uses JSONB for flexible product detail storage

## File Created
- `database/migrations/001_add_carrito_and_fix_transacciones.sql`
