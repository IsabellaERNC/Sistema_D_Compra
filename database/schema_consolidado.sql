-- =============================================================================
-- SCHEMA CONSOLIDADO — Sistema D_Compra (Microservicio Carrito)
-- =============================================================================
-- Este archivo consolida schema_completo.sql + TODAS las migraciones:
--
--   ✅ 006: Estados normalizados a UPPERCASE (ya incluido en las tablas)
--   ✅ 007: Aislamiento de tabla carrito en schema carrito_ms
--   ✅ 008: FK con ON DELETE SET NULL para direcciones
--
-- ARQUITECTURA DE BD COMPARTIDA:
--   Todos los microservicios comparten el mismo servidor PostgreSQL pero
--   cada uno opera en su propio schema para evitar colisiones.
--
--   La tabla carrito se crea en el schema `carrito_ms` (aislado).
--   Las demás tablas (pedidos, transacciones, direcciones, etc.) se crean
--   en el schema por defecto del search_path.
--
-- NOTA SOBRE SEARCH_PATH:
--   Para que las queries del backend encuentren carrito sin prefijo de schema,
--   configurar el pool con: searchPath = ['carrito_ms', 'public']
--   (Ya configurado en backend/config.js vía DB_SCHEMA)
--
-- NOTA PARA OTROS EQUIPOS:
--   El microservicio de carrito almacena usuario_id como INTEGER, que
--   referencia lógicamente a la tabla de usuarios del MS de AUTH.
--   No hay FK real entre schemas para mantener el desacoplamiento.
-- =============================================================================

-- =============================================================================
-- 1. SCHEMA: carrito_ms (Migración 007)
-- =============================================================================
CREATE SCHEMA IF NOT EXISTS carrito_ms;

-- =============================================================================
-- 2. FUNCIÓN DE TRIGGER: actualizar_updated_at()
-- =============================================================================
CREATE OR REPLACE FUNCTION actualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 3. FUNCIÓN DE TRIGGER: prevent_delete()
-- =============================================================================
-- Previene DELETE en tablas críticas (transacciones, pedidos)
CREATE OR REPLACE FUNCTION prevent_delete()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'DELETE no permitido en esta tabla. Usa soft-delete si es necesario.';
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 4. TABLA: transacciones
-- =============================================================================
-- Estados válidos: PENDIENTE, APROBADA, RECHAZADA, CANCELADA (UPPERCASE)
CREATE TABLE IF NOT EXISTS transacciones (
    id                      UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id              INTEGER        NOT NULL,
    usuario_email           VARCHAR(255),
    items                   JSONB,
    total                   NUMERIC(12,2)  CHECK (total >= 0),
    moneda                  VARCHAR(3)     DEFAULT 'COP',
    estado                  VARCHAR(20)    NOT NULL DEFAULT 'PENDIENTE'
                                         CHECK (estado IN ('PENDIENTE', 'APROBADA', 'RECHAZADA', 'CANCELADA')),
    referencia_pago_externa VARCHAR(255),
    ip_address              VARCHAR(45),
    user_agent              TEXT,
    ultimo_intento_pago     TIMESTAMPTZ,
    direccion_envio_id      UUID,
    created_at              TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_transacciones_referencia_pago_externa UNIQUE (referencia_pago_externa)
);

-- Trigger updated_at para transacciones
CREATE TRIGGER trg_transacciones_updated_at
    BEFORE UPDATE ON transacciones
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_updated_at();

-- Trigger prevent_delete para transacciones
CREATE TRIGGER trg_transacciones_prevent_delete
    BEFORE DELETE ON transacciones
    FOR EACH ROW
    EXECUTE FUNCTION prevent_delete();

-- =============================================================================
-- 5. TABLA: carrito (EN SCHEMA carrito_ms — Migración 007)
-- =============================================================================
CREATE TABLE IF NOT EXISTS carrito_ms.carrito (
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
    BEFORE UPDATE ON carrito_ms.carrito
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_updated_at();

-- =============================================================================
-- 6. TABLA: direcciones
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
-- 7. TABLA: pedidos
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

-- Trigger: Normalizar estado de pedidos a UPPERCASE antes de INSERT/UPDATE
CREATE OR REPLACE FUNCTION normalizar_estado_pedido()
RETURNS TRIGGER AS $$
BEGIN
  NEW.estado = UPPER(TRIM(NEW.estado));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pedidos_normalizar_estado
  BEFORE INSERT OR UPDATE OF estado ON pedidos
  FOR EACH ROW
  EXECUTE FUNCTION normalizar_estado_pedido();

-- =============================================================================
-- 8. TABLA: log_estados
-- =============================================================================
-- Usa GENERATED ALWAYS AS IDENTITY en lugar de SERIAL
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
-- 9. TABLA: eventos_pendientes
-- =============================================================================
-- Estados válidos: PENDIENTE, PROCESANDO, COMPLETADO, FALLIDO (UPPERCASE)
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
-- 10. ÍNDICES COMPUESTOS
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
-- 11. CLAVES FORÁNEAS (con ON DELETE SET NULL — Migración 008)
-- =============================================================================

-- FK pedidos → transacciones
ALTER TABLE pedidos
    ADD CONSTRAINT fk_pedidos_transaccion
    FOREIGN KEY (transaccion_id) REFERENCES transacciones(id);

-- FK transacciones → direcciones (ON DELETE SET NULL)
ALTER TABLE transacciones
    ADD CONSTRAINT fk_transacciones_direccion
    FOREIGN KEY (direccion_envio_id) REFERENCES direcciones(id)
    ON DELETE SET NULL;

-- FK pedidos → direcciones (ON DELETE SET NULL)
ALTER TABLE pedidos
    ADD CONSTRAINT fk_pedidos_direccion
    FOREIGN KEY (direccion_envio_id) REFERENCES direcciones(id)
    ON DELETE SET NULL;

-- FK log_estados → pedidos
ALTER TABLE log_estados
    ADD CONSTRAINT fk_log_estados_pedido
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id);
