-- =============================================================================
-- Migración: Agregar direccion_envio_id a transacciones
-- =============================================================================
-- La columna direccion_envio_id ya está definida en schema_completo.sql
-- pero puede que no exista en bases de datos existentes.
-- Esta migración la agrega de forma idempotente.
-- =============================================================================

-- Agregar direccion_envio_id a transacciones si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'transacciones' AND column_name = 'direccion_envio_id'
    ) THEN
        ALTER TABLE transacciones ADD COLUMN direccion_envio_id UUID;
        RAISE NOTICE 'Columna direccion_envio_id agregada a transacciones';
    ELSE
        RAISE NOTICE 'Columna direccion_envio_id ya existe en transacciones';
    END IF;
END $$;

-- Agregar direccion_envio_id a pedidos si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'pedidos' AND column_name = 'direccion_envio_id'
    ) THEN
        ALTER TABLE pedidos ADD COLUMN direccion_envio_id UUID;
        RAISE NOTICE 'Columna direccion_envio_id agregada a pedidos';
    ELSE
        RAISE NOTICE 'Columna direccion_envio_id ya existe en pedidos';
    END IF;
END $$;