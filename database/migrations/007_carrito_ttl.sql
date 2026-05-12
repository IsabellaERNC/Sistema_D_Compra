-- Migration 007: Add ultima_actividad column to carrito for 30-day TTL
ALTER TABLE carrito ADD COLUMN IF NOT EXISTS ultima_actividad TIMESTAMPTZ DEFAULT NOW();
UPDATE carrito SET ultima_actividad = created_at WHERE ultima_actividad IS NULL;