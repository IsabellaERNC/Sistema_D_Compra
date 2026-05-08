-- =============================================================================
-- Schema de Transacciones - Sistema de Compras
-- =============================================================================
-- Este script es para ejecutar en la base de datos PostgreSQL del equipo de backend.
-- Solo contiene la tabla de transacciones y sus componentes relacionados.
-- La autenticación será manejada por un sistema externo.
-- =============================================================================

-- Extensión necesaria para generar UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- Función para actualizar automáticamente el campo updated_at
-- =============================================================================
CREATE OR REPLACE FUNCTION actualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Tabla de Transacciones
-- =============================================================================
-- Nota: usuario_id es un identificador externo que viene del sistema de auth
-- No hay FK a tabla local de usuarios porque la autenticación es externa
-- =============================================================================
CREATE TABLE IF NOT EXISTS transacciones (
    id           UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id   INTEGER        NOT NULL,  -- Referencia al ID del usuario en sistema externo
    monto        NUMERIC(12,2)  NOT NULL CHECK (monto > 0),
    estado       VARCHAR(20)    NOT NULL DEFAULT 'pendiente'
                                CHECK (estado IN ('pendiente', 'completada', 'fallida', 'cancelada')),
    descripcion  TEXT,
    created_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- Índices para optimizar consultas frecuentes
-- =============================================================================
-- Índice por usuario para buscar transacciones de un usuario específico
CREATE INDEX IF NOT EXISTS idx_transacciones_usuario_id ON transacciones(usuario_id);

-- Índice por estado para filtrar transacciones por estado (pendiente, completada, etc.)
CREATE INDEX IF NOT EXISTS idx_transacciones_estado ON transacciones(estado);

-- Índice por fecha de creación para ordenamiento y rangos de fecha
CREATE INDEX IF NOT EXISTS idx_transacciones_created_at ON transacciones(created_at DESC);

-- =============================================================================
-- Trigger para actualizar automáticamente updated_at en cada UPDATE
-- =============================================================================
CREATE OR REPLACE TRIGGER trg_transacciones_updated_at
    BEFORE UPDATE ON transacciones
    FOR EACH ROW 
    EXECUTE FUNCTION actualizar_updated_at();