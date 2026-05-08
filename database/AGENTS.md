# DATABASE KNOWLEDGE BASE

## OVERVIEW
Base PostgreSQL mínima definida por un solo `schema.sql` con usuarios, transacciones, índices y trigger de `updated_at`.

## WHERE TO LOOK
| Task | Location | Notes |
|---|---|---|
| Extensiones requeridas | `schema.sql` | `pgcrypto` para UUIDs |
| Tabla usuarios | `schema.sql` | email único, password hash |
| Tabla transacciones | `schema.sql` | UUID, FK a usuarios, estado con CHECK |
| Índices | `schema.sql` | usuario, estado, created_at |
| Trigger timestamps | `schema.sql` | `actualizar_updated_at`, `trg_transacciones_updated_at` |

## CONVENTIONS
- Nombres SQL en snake_case.
- `TIMESTAMPTZ` para fechas; `NOW()` como default.
- `transacciones.id` usa `gen_random_uuid()`.
- Restricciones embebidas en esquema (`CHECK`, `FOREIGN KEY`, `ON DELETE RESTRICT`).

## ANTI-PATTERNS
- No esperar migraciones versionadas: solo existe `schema.sql`.
- No documentar seeds o fixtures: no aparecen en el repo.
- No separar DDL por módulo; todo el contrato actual vive en un archivo.

## NOTES
- `usuarios.email` ya crea índice único implícito.
- `updated_at` se mantiene vía trigger, no desde la app.
- Cualquier cambio de columnas debe sincronizarse manualmente con queries en `backend/server.js` y `backend/router/transacciones.js`.
