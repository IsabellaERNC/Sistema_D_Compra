# Decisions

## POST /api/carrito (2026-05-08)

1. **`updated_at = NOW()` in DO UPDATE despite trigger**: Kept as specified in task requirements. The trigger `trg_carrito_updated_at` also sets `updated_at`, making this redundant but harmless.

2. **`parseFloat`/`parseInt` for validation**: Used instead of `typeof` checks to handle JSON body types (all values from `JSON.parse` are valid JS primitives, but explicit numeric conversion is safer for coercion edge cases and matches convention of other routes).

3. **Two queries (upsert + GET) instead of one**: Per task spec: return both `item` (the upserted row) and `carrito` (full cart). A single RETURNING + subquery is possible but less readable; explicit second query matches GET / pattern already in the file.

4. **Status 201**: As specified in task. Standard REST for resource creation, even though upsert may update existing.

5. **No stock/product validation**: Per MUST NOT DO constraint — endpoint is a pure cart operation, not coupled to product service.
