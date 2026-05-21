-- =============================================================================
-- SCHEMA COMPLETO — Sistema D_Compra
-- =============================================================================
-- Archivo único que reemplaza todas las migraciones individuales (000–009).
-- Incluye el esquema final limpio de todas las tablas, índices y triggers.
--
-- CORRECCIONES APLICADAS (16 puntos):
--   1. CHECK constraint en transacciones.estado
--   2. Trigger updated_at en transacciones
--   3. FK pedidos → transacciones
--   4. UNIQUE transaccion_id en pedidos
--   5. UNIQUE referencia_pago_externa en transacciones
--   7. next_retry_at en eventos_pendientes
--   8. Estados unificados a UPPERCASE
--   9. CHECKS financieros (total >= 0, precio_unitario >= 0, monto_total >= 0)
--  10. FK direccion_envio_id en pedidos y transacciones
--  12. Índice compuesto transacciones(usuario_id, estado)
--  13. correlation_id y event_id en eventos_pendientes
--  14. Protección contra DELETE accidental
--  15. GENERATED ALWAYS AS IDENTITY en lugar de SERIAL
-- =============================================================================

-- =============================================================================
-- 1. FUNCIÓN DE TRIGGER: actualizar_updated_at()
-- =============================================================================
CREATE OR REPLACE FUNCTION actualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 2. FUNCIÓN DE TRIGGER: prevent_delete()
-- =============================================================================
-- Previene DELETE en tablas críticas (transacciones, pedidos)
CREATE OR REPLACE FUNCTION prevent_delete()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'DELETE no permitido en esta tabla. Usa soft-delete si es necesario.';
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 3. TABLA: transacciones
-- =============================================================================
-- Estados válidos: PENDIENTE, APROBADA, RECHAZADA (UPPERCASE)
CREATE TABLE IF NOT EXISTS transacciones (
    id                      UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id              INTEGER        NOT NULL,
    usuario_email           VARCHAR(255),
    items                   JSONB,
    total                   NUMERIC(12,2)  CHECK (total >= 0),
    moneda                  VARCHAR(3)     DEFAULT 'COP',
    estado                  VARCHAR(20)    NOT NULL DEFAULT 'PENDIENTE'
                                         CHECK (estado IN ('PENDIENTE', 'APROBADA', 'RECHAZADA')),
    referencia_pago_externa VARCHAR(255),
    ip_address              VARCHAR(45),
    user_agent              TEXT,
    ultimo_intento_pago     TIMESTAMPTZ,
    direccion_envio_id      UUID,
    created_at              TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_transacciones_referencia_pago_externa UNIQUE (referencia_pago_externa)
);

-- Trigger updated_at para transacciones (CORRECCIÓN #2)
CREATE TRIGGER trg_transacciones_updated_at
    BEFORE UPDATE ON transacciones
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_updated_at();

-- Trigger prevent_delete para transacciones (CORRECCIÓN #14)
CREATE TRIGGER trg_transacciones_prevent_delete
    BEFORE DELETE ON transacciones
    FOR EACH ROW
    EXECUTE FUNCTION prevent_delete();

-- =============================================================================
-- 4. TABLA: carrito
-- =============================================================================
CREATE TABLE IF NOT EXISTS carrito (
    id                UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id        INTEGER        NOT NULL,
    producto_id       VARCHAR(50)    NOT NULL,
    producto_nombre   TEXT           NOT NULL,
    precio_unitario   NUMERIC(12,2)  NOT NULL CHECK (precio_unitario >= 0),
    cantidad          INTEGER        NOT NULL CHECK (cantidad > 0),
    ultima_actividad  TIMESTAMPTZ    DEFAULT NOW(),
    created_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_carrito_usuario_producto UNIQUE (usuario_id, producto_id)
);

-- Trigger updated_at para carrito
CREATE TRIGGER trg_carrito_updated_at
    BEFORE UPDATE ON carrito
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_updated_at();

-- =============================================================================
-- 5. TABLA: direcciones
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

-- Trigger updated_at para direcciones
CREATE TRIGGER trg_direcciones_updated_at
    BEFORE UPDATE ON direcciones
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_updated_at();

-- =============================================================================
-- 6. TABLA: pedidos
-- =============================================================================
-- Estados válidos: PENDIENTE, PROCESANDO, ENVIADO, ENTREGADO, CANCELADO (UPPERCASE)
CREATE TABLE IF NOT EXISTS pedidos (
    id                  UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id          INTEGER        NOT NULL,
    estado              VARCHAR(20)    NOT NULL DEFAULT 'PENDIENTE'
                                         CHECK (estado IN (
                                             'PENDIENTE', 'PROCESANDO',
                                             'ENVIADO', 'ENTREGADO', 'CANCELADO'
                                         )),
    items               JSONB          NOT NULL,
    monto_total         NUMERIC(12,2)  NOT NULL CHECK (monto_total >= 0),
    direccion_envio_id  UUID,
    transaccion_id      UUID,
    created_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_pedidos_transaccion_id UNIQUE (transaccion_id)
);

-- Trigger updated_at para pedidos
CREATE TRIGGER trg_pedidos_updated_at
    BEFORE UPDATE ON pedidos
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_updated_at();

-- Trigger prevent_delete para pedidos
CREATE TRIGGER trg_pedidos_prevent_delete
    BEFORE DELETE ON pedidos
    FOR EACH ROW
    EXECUTE FUNCTION prevent_delete();

-- =============================================================================
-- 7. TABLA: log_estados
-- =============================================================================
-- Usa GENERATED ALWAYS AS IDENTITY en lugar de SERIAL (CORRECCIÓN #15)
CREATE TABLE IF NOT EXISTS log_estados (
    id                  BIGINT         PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    pedido_id           UUID           NOT NULL,
    estado_anterior     VARCHAR(20)    NOT NULL,
    estado_nuevo        VARCHAR(20)    NOT NULL,
    cambiado_por        INTEGER        NOT NULL,
    cambiado_por_tipo   VARCHAR(20)    NOT NULL DEFAULT 'vendedor'
                                         CHECK (cambiado_por_tipo IN (
                                             'vendedor', 'sistema', 'admin'
                                         )),
    created_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 8. TABLA: eventos_pendientes
-- =============================================================================
-- Estados válidos: PENDIENTE, PROCESANDO, COMPLETADO, FALLIDO (UPPERCASE)
-- Agregadas columnas: next_retry_at, correlation_id, event_id (CORRECCIONES #7, #13)
CREATE TABLE IF NOT EXISTS eventos_pendientes (
    id                  UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo                VARCHAR(50)    NOT NULL,
    payload             JSONB,
    intentos            INTEGER        NOT NULL DEFAULT 0,
    max_intentos        INTEGER        NOT NULL DEFAULT 3,
    estado              VARCHAR(20)    NOT NULL DEFAULT 'PENDIENTE'
                                         CHECK (estado IN (
                                             'PENDIENTE', 'PROCESANDO', 'COMPLETADO', 'FALLIDO'
                                         )),
    next_retry_at       TIMESTAMPTZ,
    correlation_id      UUID,
    event_id            UUID           DEFAULT gen_random_uuid(),
    created_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- Trigger updated_at para eventos_pendientes
CREATE TRIGGER trg_eventos_pendientes_updated_at
    BEFORE UPDATE ON eventos_pendientes
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_updated_at();

-- =============================================================================
-- 9. ÍNDICES COMPUESTOS (CORRECCIÓN #12)
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_transacciones_usuario_estado
    ON transacciones(usuario_id, estado);

CREATE INDEX IF NOT EXISTS idx_transacciones_created_at
    ON transacciones(created_at);

CREATE INDEX IF NOT EXISTS idx_eventos_pendientes_estado_next_retry
    ON eventos_pendientes(estado, next_retry_at);

CREATE INDEX IF NOT EXISTS idx_pedidos_usuario_estado
    ON pedidos(usuario_id, estado);

-- =============================================================================
-- 10. CLAVES FORÁNEAS (CORRECCIONES #3, #10)
-- =============================================================================
-- FK pedidos → transacciones
ALTER TABLE pedidos
    ADD CONSTRAINT fk_pedidos_transaccion
    FOREIGN KEY (transaccion_id) REFERENCES transacciones(id);

-- FK transacciones → direcciones
ALTER TABLE transacciones
    ADD CONSTRAINT fk_transacciones_direccion
    FOREIGN KEY (direccion_envio_id) REFERENCES direcciones(id);

-- FK pedidos → direcciones
ALTER TABLE pedidos
    ADD CONSTRAINT fk_pedidos_direccion
    FOREIGN KEY (direccion_envio_id) REFERENCES direcciones(id);

-- FK log_estados → pedidos
ALTER TABLE log_estados
    ADD CONSTRAINT fk_log_estados_pedido
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id);