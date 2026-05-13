-- =============================================================================
-- SCHEMA COMPLETO — Sistema D_Compra
-- =============================================================================
-- Archivo único que reemplaza todas las migraciones individuales (000–009).
-- Incluye el esquema final limpio de todas las tablas, índices y triggers.
--
-- Columnas EXCLUIDAS deliberadamente de transacciones (redundantes/muertas):
--   payment_reference     → redundante con referencia_pago_externa
--   currency              → redundante con moneda
--   intentos_pago         → columna muerta, sin uso en el código
--   intentos_cancelacion  → columna muerta, sin uso en el código
--
-- Columnas INCLUIDAS en CREATE TABLE (built-in, no requieren ALTER):
--   carrito.ultima_actividad        → migración 007 incorporada
--   transacciones.ip_address        → migración 005 incorporada
--   transacciones.user_agent        → migración 005 incorporada
--   transacciones.ultimo_intento_pago → migración 008 incorporada (solo columna útil)
-- =============================================================================

-- =============================================================================
-- 1. FUNCIÓN DE TRIGGER: actualizar_updated_at()
-- =============================================================================
-- Actualiza automáticamente la columna updated_at al timestamp actual
-- en cada UPDATE. Usada por triggers en carrito, direcciones, pedidos, etc.
-- =============================================================================
CREATE OR REPLACE FUNCTION actualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 2. TABLA: transacciones
-- =============================================================================
-- Registro de transacciones de pago. Cada fila representa un intento de
-- checkout iniciado por un usuario. Las referencias a usuarios son externas
-- (sistema de auth) por lo que no hay FK a tabla local de usuarios.
--
-- Estados válidos (controlados por la aplicación):
--   PENDIENTE  → creada, esperando confirmación de pago
--   APROBADA   → pago confirmado por webhook
--   RECHAZADA  → pago rechazado por la pasarela
-- =============================================================================
CREATE TABLE IF NOT EXISTS transacciones (
    id                      UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id              INTEGER        NOT NULL,
    usuario_email           VARCHAR(255),
    items                   JSONB,
    total                   NUMERIC(12,2),
    moneda                  VARCHAR(3)     DEFAULT 'COP',
    estado                  VARCHAR(20)    NOT NULL DEFAULT 'PENDIENTE',
    referencia_pago_externa VARCHAR(255),
    ip_address              VARCHAR(45),
    user_agent              TEXT,
    ultimo_intento_pago     TIMESTAMPTZ,
    direccion_envio_id      UUID,
    created_at              TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 3. TABLA: carrito
-- =============================================================================
-- Cada fila representa un producto en el carrito de un usuario.
-- usuario_id es un identificador externo del sistema de auth.
-- ultima_actividad se usa para limpieza TTL de 30 días.
-- =============================================================================
CREATE TABLE IF NOT EXISTS carrito (
    id                UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id        INTEGER        NOT NULL,
    producto_id       VARCHAR(50)    NOT NULL,
    producto_nombre   TEXT           NOT NULL,
    precio_unitario   NUMERIC(12,2)  NOT NULL,
    cantidad          INTEGER        NOT NULL CHECK (cantidad > 0),
    ultima_actividad  TIMESTAMPTZ    DEFAULT NOW(),
    created_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    -- Evitar duplicados del mismo producto en el carrito del mismo usuario
    CONSTRAINT uq_carrito_usuario_producto UNIQUE (usuario_id, producto_id)
);

-- =============================================================================
-- 4. TABLA: direcciones
-- =============================================================================
-- Direcciones de envío de los usuarios. Máximo 5 por usuario
-- (validado por la aplicación, no por BD).
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
-- 5. TABLA: pedidos
-- =============================================================================
-- Pedidos generados tras confirmación de pago.
-- Cada pedido está vinculado a una transacción aprobada.
-- =============================================================================
CREATE TABLE IF NOT EXISTS pedidos (
    id                  UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id          INTEGER        NOT NULL,
    estado              VARCHAR(20)    NOT NULL DEFAULT 'Pendiente'
                                        CHECK (estado IN (
                                            'Pendiente','Procesando',
                                            'Enviado','Entregado','Cancelado'
                                        )),
    items               JSONB          NOT NULL,
    monto_total         NUMERIC(12,2)  NOT NULL,
    direccion_envio_id  UUID,
    transaccion_id      UUID,
    created_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 6. TABLA: log_estados
-- =============================================================================
-- Registra cada cambio de estado de pedido para auditoría.
-- Los cambios pueden ser hechos por vendedor, sistema o admin.
-- =============================================================================
CREATE TABLE IF NOT EXISTS log_estados (
    id                  SERIAL         PRIMARY KEY,
    pedido_id           UUID           NOT NULL REFERENCES pedidos(id),
    estado_anterior     VARCHAR(20)    NOT NULL,
    estado_nuevo        VARCHAR(20)    NOT NULL,
    cambiado_por        INTEGER        NOT NULL,
    cambiado_por_tipo   VARCHAR(20)    NOT NULL DEFAULT 'vendedor'
                                        CHECK (cambiado_por_tipo IN (
                                            'vendedor','sistema','admin'
                                        )),
    created_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 7. TABLA: eventos_pendientes
-- =============================================================================
-- Almacena eventos que fallaron al procesarse y deben reintentarse.
-- Se usa como cola de reintentos simple (sin Kafka/RabbitMQ).
-- =============================================================================
CREATE TABLE IF NOT EXISTS eventos_pendientes (
    id            SERIAL         PRIMARY KEY,
    tipo          VARCHAR(50)    NOT NULL,
    payload       JSONB          NOT NULL,
    intentos      INT            NOT NULL DEFAULT 0,
    max_intentos  INT            NOT NULL DEFAULT 5,
    estado        VARCHAR(20)    NOT NULL DEFAULT 'pendiente'
                                   CHECK (estado IN (
                                       'pendiente','procesando',
                                       'fallido','completado'
                                   )),
    created_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 8. ÍNDICES
-- =============================================================================

-- transacciones
CREATE INDEX IF NOT EXISTS idx_transacciones_usuario_id
    ON transacciones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_transacciones_referencia_pago
    ON transacciones(referencia_pago_externa);
CREATE INDEX IF NOT EXISTS idx_transacciones_created_at
    ON transacciones(created_at);

-- carrito
CREATE INDEX IF NOT EXISTS idx_carrito_usuario_id
    ON carrito(usuario_id);

-- direcciones
CREATE INDEX IF NOT EXISTS idx_direcciones_usuario_id
    ON direcciones(usuario_id);

-- pedidos
CREATE INDEX IF NOT EXISTS idx_pedidos_usuario_id
    ON pedidos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_transaccion_id
    ON pedidos(transaccion_id);

-- log_estados
CREATE INDEX IF NOT EXISTS idx_log_estados_pedido_id
    ON log_estados(pedido_id);
CREATE INDEX IF NOT EXISTS idx_log_estados_fecha
    ON log_estados(created_at DESC);

-- eventos_pendientes
CREATE INDEX IF NOT EXISTS idx_eventos_pendientes_estado
    ON eventos_pendientes(estado);
CREATE INDEX IF NOT EXISTS idx_eventos_pendientes_tipo
    ON eventos_pendientes(tipo);

-- =============================================================================
-- 9. TRIGGERS (para actualizar updated_at automáticamente)
-- =============================================================================

-- carrito
CREATE OR REPLACE TRIGGER trg_carrito_updated_at
    BEFORE UPDATE ON carrito
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_updated_at();

-- direcciones
CREATE OR REPLACE TRIGGER trg_direcciones_updated_at
    BEFORE UPDATE ON direcciones
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_updated_at();

-- pedidos
CREATE OR REPLACE TRIGGER trg_pedidos_updated_at
    BEFORE UPDATE ON pedidos
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_updated_at();

-- eventos_pendientes
CREATE OR REPLACE TRIGGER trg_eventos_pendientes_updated_at
    BEFORE UPDATE ON eventos_pendientes
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_updated_at();
