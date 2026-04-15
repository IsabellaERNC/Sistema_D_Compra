
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION actualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS usuarios (
    id            SERIAL PRIMARY KEY,
    nombre        VARCHAR(100)  NOT NULL,
    email         VARCHAR(150)  UNIQUE NOT NULL, -- El índice se crea automáticamente aquí
    password_hash VARCHAR(255)  NOT NULL,
    created_at    TIMESTAMPTZ   DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS transacciones (
    id           UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id   INTEGER        NOT NULL,
    monto        NUMERIC(12,2)  NOT NULL CHECK (monto > 0),
    estado       VARCHAR(20)    NOT NULL DEFAULT 'pendiente'
                                CHECK (estado IN ('pendiente', 'completada', 'fallida', 'cancelada')),
    descripcion  TEXT,
    created_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW(),


    CONSTRAINT fk_usuario 
        FOREIGN KEY (usuario_id) 
        REFERENCES usuarios(id) 
        ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_transacciones_usuario_id ON transacciones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_transacciones_estado     ON transacciones(estado);
CREATE INDEX IF NOT EXISTS idx_transacciones_created_at ON transacciones(created_at DESC);

CREATE OR REPLACE TRIGGER trg_transacciones_updated_at
    BEFORE UPDATE ON transacciones
    FOR EACH ROW 
    EXECUTE FUNCTION actualizar_updated_at();