-- =============================================================================
-- Migration 001: Add carrito table and fix transacciones columns
-- =============================================================================
-- Agrega la tabla carrito para el carrito de compras y
-- completa las columnas faltantes en la tabla transacciones.
-- La función actualizar_updated_at() ya existe en schema_transacciones.sql.
-- =============================================================================

-- =============================================================================
-- Tabla de Carrito de Compras
-- =============================================================================
-- Cada fila representa un producto en el carrito de un usuario.
-- usuario_id es un identificador externo del sistema de auth.
-- No hay FK a tabla local de usuarios porque la autenticación es externa.
-- =============================================================================
CREATE TABLE IF NOT EXISTS carrito (
    id                UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id        INTEGER        NOT NULL,
    producto_id       VARCHAR(50)    NOT NULL,
    producto_nombre   TEXT           NOT NULL,
    precio_unitario   NUMERIC(12,2)  NOT NULL,
    cantidad          INTEGER        NOT NULL CHECK (cantidad > 0),
    created_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    -- Evitar duplicados del mismo producto en el carrito del mismo usuario
    CONSTRAINT uq_carrito_usuario_producto UNIQUE (usuario_id, producto_id)
);

-- =============================================================================
-- Índices para el carrito
-- =============================================================================
-- Índice por usuario para consultar el carrito completo de un usuario
CREATE INDEX IF NOT EXISTS idx_carrito_usuario_id ON carrito(usuario_id);

-- =============================================================================
-- Trigger para actualizar automáticamente updated_at en carrito
-- =============================================================================
CREATE OR REPLACE TRIGGER trg_carrito_updated_at
    BEFORE UPDATE ON carrito
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_updated_at();

-- =============================================================================
-- Agregar columnas faltantes a transacciones
-- =============================================================================
-- Estas columnas son necesarias para el flujo de pago completo:
--   items: detalle de los productos comprados
--   usuario_email: email del comprador al momento de la transacción
--   total: monto total calculado (puede diferir de monto por descuentos/envío)
--   moneda: código de moneda ISO (MXN por defecto)
--   referencia_pago_externa: ID de referencia del procesador de pagos
-- =============================================================================
ALTER TABLE transacciones
    ADD COLUMN IF NOT EXISTS items                    JSONB,
    ADD COLUMN IF NOT EXISTS usuario_email            VARCHAR(255),
    ADD COLUMN IF NOT EXISTS total                    NUMERIC(12,2),
    ADD COLUMN IF NOT EXISTS moneda                   VARCHAR(3)    DEFAULT 'COP',
    ADD COLUMN IF NOT EXISTS referencia_pago_externa   VARCHAR(255);

-- =============================================================================
-- Índice para buscar transacciones por referencia de pago externa
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_transacciones_referencia_pago
    ON transacciones(referencia_pago_externa);
