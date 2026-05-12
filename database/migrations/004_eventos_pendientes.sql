-- =============================================================================
-- Migration 004: Create eventos_pendientes table
-- =============================================================================
-- Tabla para almacenar eventos que fallaron al procesarse y deben reintentarse.
-- Se usa como cola de reintentos simple (sin Kafka/RabbitMQ).
-- =============================================================================

CREATE TABLE IF NOT EXISTS eventos_pendientes (
    id            SERIAL         PRIMARY KEY,
    tipo          VARCHAR(50)    NOT NULL,
    payload       JSONB          NOT NULL,
    intentos      INT            NOT NULL DEFAULT 0,
    max_intentos  INT            NOT NULL DEFAULT 5,
    estado        VARCHAR(20)    NOT NULL DEFAULT 'pendiente'
                                   CHECK (estado IN ('pendiente','procesando','fallido','completado')),
    created_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- Índices para eventos_pendientes
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_eventos_pendientes_estado ON eventos_pendientes(estado);
CREATE INDEX IF NOT EXISTS idx_eventos_pendientes_tipo ON eventos_pendientes(tipo);

-- =============================================================================
-- Trigger para actualizar automáticamente updated_at en eventos_pendientes
-- =============================================================================
CREATE OR REPLACE TRIGGER trg_eventos_pendientes_updated_at
    BEFORE UPDATE ON eventos_pendientes
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_updated_at();
