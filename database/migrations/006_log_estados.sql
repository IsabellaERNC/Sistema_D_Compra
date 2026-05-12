-- =============================================================================
-- Migration 006: Create log_estados table for pedido state audit
-- =============================================================================
-- Registra cada cambio de estado de pedido para auditoría.
-- Los cambios pueden ser feitos por vendedor o por el sistema.
-- =============================================================================

CREATE TABLE IF NOT EXISTS log_estados (
    id                SERIAL         PRIMARY KEY,
    pedido_id         UUID           NOT NULL REFERENCES pedidos(id),
    estado_anterior    VARCHAR(20)    NOT NULL,
    estado_nuevo      VARCHAR(20)    NOT NULL,
    cambiado_por      INTEGER        NOT NULL,
    cambiado_por_tipo  VARCHAR(20)    NOT NULL DEFAULT 'vendedor'
                                       CHECK (cambiado_por_tipo IN ('vendedor','sistema','admin')),
    created_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- Índice para consulta por pedido
CREATE INDEX IF NOT EXISTS idx_log_estados_pedido_id ON log_estados(pedido_id);
-- Índice para consulta por vendedor
CREATE INDEX IF NOT EXISTS idx_log_estados_fecha ON log_estados(created_at DESC);
