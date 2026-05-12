-- =============================================================================
-- Migration 002: Add direcciones table
-- =============================================================================
-- Agrega la tabla direcciones para gestionar las direcciones de envío
-- de los usuarios. Máximo 5 direcciones por usuario.
-- =============================================================================

-- =============================================================================
-- Función para actualizar updated_at (idempotente)
-- =============================================================================
CREATE OR REPLACE FUNCTION actualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Tabla de Direcciones
-- =============================================================================
CREATE TABLE IF NOT EXISTS direcciones (
    id                UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id        INTEGER        NOT NULL,
    alias             VARCHAR(50)    NOT NULL,
    calle             VARCHAR(200)   NOT NULL,
    ciudad            VARCHAR(100)   NOT NULL,
    departamento      VARCHAR(100)   NOT NULL,
    codigo_postal     VARCHAR(20)    NOT NULL,
    predeterminada    BOOLEAN        NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- Índices para direcciones
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_direcciones_usuario_id ON direcciones(usuario_id);

-- =============================================================================
-- Trigger para actualizar automáticamente updated_at en direcciones
-- =============================================================================
CREATE OR REPLACE TRIGGER trg_direcciones_updated_at
    BEFORE UPDATE ON direcciones
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_updated_at();
