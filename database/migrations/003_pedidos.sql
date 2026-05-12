-- =============================================================================
-- Migration 003: Create pedidos table
-- =============================================================================
-- Tabla de pedidos generados tras confirmación de pago.
-- Cada pedido está vinculado a una transacción aprobada.
-- =============================================================================

CREATE TABLE IF NOT EXISTS pedidos (
    id                UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id        INTEGER        NOT NULL,
    estado            VARCHAR(20)    NOT NULL DEFAULT 'Pendiente'
                                      CHECK (estado IN ('Pendiente','Procesando','Enviado','Entregado','Cancelado')),
    items             JSONB          NOT NULL,
    monto_total       NUMERIC(12,2)  NOT NULL,
    direccion_envio_id UUID,
    transaccion_id    UUID,
    created_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- Índices para pedidos
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_pedidos_usuario_id ON pedidos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_transaccion_id ON pedidos(transaccion_id);

-- =============================================================================
-- Trigger para actualizar automáticamente updated_at en pedidos
-- =============================================================================
CREATE OR REPLACE TRIGGER trg_pedidos_updated_at
    BEFORE UPDATE ON pedidos
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_updated_at();
