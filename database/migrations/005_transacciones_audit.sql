-- =============================================================================
-- Migration 005: Add audit columns to transacciones
-- =============================================================================
-- Agrega columnas para auditoría completa de transacciones:
--   payment_reference: referencia devuelta por la pasarela
--   currency: moneda del pago (default COP para Colombia)
--   ip_address: IP del cliente al momento del pago
--   user_agent: user agent del navegador
-- =============================================================================

-- Payment reference (devuelta por la pasarela)
ALTER TABLE transacciones
    ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(100);

-- Moneda (default COP para requisitos fiscales colombianos)
ALTER TABLE transacciones
    ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'COP' NOT NULL;

-- Campos de auditoría
ALTER TABLE transacciones
    ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45);

ALTER TABLE transacciones
    ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Índices para auditoría
CREATE INDEX IF NOT EXISTS idx_transacciones_payment_ref ON transacciones(payment_reference);
CREATE INDEX IF NOT EXISTS idx_transacciones_created_at ON transacciones(created_at);
