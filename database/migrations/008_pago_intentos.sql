-- Migration 008: Add intentos_pago column to transacciones
ALTER TABLE transacciones ADD COLUMN IF NOT EXISTS intentos_pago INTEGER NOT NULL DEFAULT 1;
ALTER TABLE transacciones ADD COLUMN IF NOT EXISTS ultimo_intento_pago TIMESTAMPTZ;
ALTER TABLE transacciones ADD COLUMN IF NOT EXISTS intentos_cancelacion INTEGER NOT NULL DEFAULT 0;