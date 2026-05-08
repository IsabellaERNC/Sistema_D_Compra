# Plan: Integración con Servicios Externos - COMPLETO

## TL;DR

> **Objetivo**: Preparar tu proyecto para integrarse con servicios externos (auth, pagos, productos) sin mantener lógica local de这些问题.

> **Entregables**: 
> - Schema SQL para transacciones (solo lo que necesitas)
> - Clientes HTTP para cada servicio externo
> - Endpoints de checkout y webhook
> - Contratos definidos para comunicación con servicios externos

> **Esfuerzo**: Medio - requiere cambios en backend y frontend
> **Paralelización**: SI - varias tareas pueden ejecutarse en paralelo

---

## 🌐 Conexión en Red Local (Mismo WiFi)

Para conectar todos los servicios en la misma red local, necesitas:

### IP Local de cada servicio

Cada servicio externo debe darte su **IP local** (no localhost):

```
Tu backend:           http://192.168.1.X:3000    (tu laptop)
Servicio de Auth:     http://192.168.1.Y:3001    (servicio de auth)
Servicio de Productos: http://192.168.1.Z:3002    (servicio de productos)
Servicio de Pagos:    http://192.168.1.W:3003    (servicio de pagos)
```

**Para encontrar tu IP local** (Windows):
```cmd
ipconfig
```
Busca "IPv4 Address" → algo como `192.168.1.100`

### Qué pedirle al otro equipo (DEL LADO DEL BACKEND)

Cada servicio externo debe darte:

| Servicio | Qué pedir | Ejemplo |
|----------|-----------|---------|
| **Auth** | IP + puerto donde corre su backend | `http://192.168.1.50:3001` |
| **Productos** | IP + puerto donde corre su backend | `http://192.168.1.51:3002` |
| **Pagos** | IP + puerto + endpoint webhook | `http://192.168.1.52:3003` + `/webhook` |

**IMPORTANTE**: Las URLs son del **backend** de ellos (no del frontend). Tu backend se comunica con sus backends.

### Instrucciones para el otro equipo

Diles que su servicio debe:

1. **Escuchar en su IP local**, no solo en `localhost`:
   ```javascript
   // En Node.js/Express
   app.listen(3001, '0.0.0.0', () => {
     console.log('Servicio corriendo en http://192.168.1.50:3001');
   });
   ```

2. **Permitir CORS** desde tu IP:
   ```javascript
   // Express con CORS
   app.use(cors({
     origin: 'http://192.168.1.100:5173',  // Tu frontend Vite
     // o para tu backend:
     origin: 'http://192.168.1.100:3000'
   }));
   ```

3. **En webhook**: Tu servidor debe ser accesible desde su red. Comparte tu IP local.

### Tu config.js para red local

```javascript
module.exports = {
  // IP del servicio de auth (PIDELE ESTA URL A SU EQUIPO)
  authServiceUrl: 'http://192.168.1.50:3001',  // TODO: pedirles

  // IP del servicio de productos
  productosServiceUrl: 'http://192.168.1.51:3002',  // TODO: pedirles

  // IP del servicio de pagos
  pagosServiceUrl: 'http://192.168.1.52:3003',  // TODO: pedirles

  // Tu IP para que el servicio de pagos te envíe webhooks
  tuLocalUrl: 'http://192.168.1.100:3000'
};
```

---

## Contexto

### Situación actual

Tu proyecto tiene:
- ✅ `server.js` con auth propio (register, login, me) + transacciones CRUD
- ✅ `database/schema.sql` con tablas `usuarios` y `transacciones`
- ✅ Frontend con productos en localStorage y procesamiento de tarjetas

### Lo que cambia

- **Auth**: Ya no manejas usuarios en tu DB - externalizas al servicio de auth
- **Productos**: Ya no vienen de localStorage - consumo de servicio externo
- **Pagos**: No procesas tarjetas - delegas al servicio de pagos ( MercadoPago)
- **Transacciones**: Solo guardas el registro, el flujo de pago es externo

---

## Contratos con Servicios Externos

### 1. Contrato: Servicio de Auth

**Tu sistema → Auth Service (Login)**
```http
POST {AUTH_SERVICE_URL}/auth/login
Content-Type: application/json

{ "email": "usuario@email.com", "password": "contraseña" }
```

**Auth Service → Tu sistema (respuesta)**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "usuario": {
    "id": "uuid-usuario",
    "email": "usuario@email.com",
    "nombre": "Juan Pérez"
  }
}
```

**Tu sistema → Auth Service (Register)**
```http
POST {AUTH_SERVICE_URL}/auth/register
Content-Type: application/json

{ "email": "nuevo@email.com", "password": "contraseña", "nombre": "Juan" }
```

**Tu sistema → Auth Service (Validar Token)**
```http
GET {AUTH_SERVICE_URL}/auth/me
Authorization: Bearer {token}
```

---

### 2. Contrato: Servicio de Productos

**Tu sistema → Productos Service**
```http
GET {PRODUCTOS_SERVICE_URL}/productos
Authorization: Bearer {token}
```

**Productos Service → Tu sistema**
```json
{
  "productos": [
    { "id": "uuid", "nombre": "Producto 1", "precio": 150.00, "stock": 10 },
    { "id": "uuid2", "nombre": "Producto 2", "precio": 200.00, "stock": 5 }
  ]
}
```

---

### 3. Contrato: Servicio de Pagos

**Tu sistema → Pagos Service (Iniciar Checkout)**
```http
POST {PAGOS_SERVICE_URL}/checkout/crear
Content-Type: application/json
Authorization: Bearer {token}

{
  "usuario": { "id": "uuid", "email": "usuario@email.com" },
  "items": [
    { "producto_id": "uuid", "nombre": "Producto 1", "cantidad": 2, "precio_unitario": 150.00 }
  ],
  "total": 300.00,
  "moneda": "MXN",
  "url_redirect_ok": "http://tu-sitio/carrito/pago-exitoso",
  "url_redirect_error": "http://tu-sitio/carrito/pago-error"
}
```

**Pagos Service → Tu sistema (Webhook)**
```http
POST {TU_SERVIDOR}/api/webhook/pago-confirmado
Content-Type: application/json
X-Webhook-Signature: {signature_para_validar}

{
  "evento": "pago.confirmado",
  "transaccion_id": "uuid-transaccion-local",
  "referencia_externa": "mp-id-123456",
  "estado": "completado",
  "monto": 300.00,
  "fecha_pago": "2026-01-15T10:30:00Z"
}
```

---

## Schema SQL (Solo lo que necesitas)

El otro equipo ejecutará esto en su PostgreSQL:

```sql
-- ============================================
-- SCHEMA: Carrito de Compras (Solo Transacciones)
-- Este script lo ejecutará el equipo de DB en su PostgreSQL
-- ============================================

-- Tabla de transacciones (solo lo que necesitas guardar)
CREATE TABLE transacciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL,                    -- ID del usuario en el servicio de auth
    usuario_email VARCHAR(255) NOT NULL,         -- Email para mostrar en UI
    items JSONB NOT NULL,                        -- Array de productos: [{"producto_id": "uuid", "nombre": "...", "cantidad": 2, "precio_unitario": 150.00}]
    total DECIMAL(10,2) NOT NULL,
    moneda VARCHAR(3) DEFAULT 'MXN',
    estado VARCHAR(20) DEFAULT 'pendiente',      -- pendiente, pagado, cancelado, fallido
    referencia_pago_externa VARCHAR(255),        -- ID de MercadoPago del servicio de pagos
    fecha_creacion TIMESTAMPTZ DEFAULT NOW(),
    fecha_actualizacion TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para consultas frecuentes
CREATE INDEX idx_transacciones_usuario ON transacciones(usuario_id);
CREATE INDEX idx_transacciones_estado ON transacciones(estado);
CREATE INDEX idx_transacciones_fecha ON transacciones(fecha_creacion DESC);

-- Trigger para actualizar fecha_actualizacion automáticamente
CREATE OR REPLACE FUNCTION actualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_actualizacion = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_transacciones_updated
    BEFORE UPDATE ON transacciones
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_updated_at();

-- Tabla de items del carrito (opcional - puede ir en JSONB de transacciones)
-- Solo necesaria si necesitas hacer queries sobre items individuales
-- CREATE TABLE transacciones_items (
--     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     transaccion_id UUID REFERENCES transacciones(id),
--     producto_id UUID NOT NULL,
--     nombre VARCHAR(255) NOT NULL,
--     cantidad INTEGER NOT NULL CHECK (cantidad > 0),
--     precio_unitario DECIMAL(10,2) NOT NULL
-- );
```

---

## Work Objectives

### Core Objective
Preparar el backend Express para integrarse con servicios externos de auth, pagos y productos, manteniendo la misma interfaz hacia el frontend.

### Deliverables concretos

| Entregable | Descripción |
|------------|--------------|
| `backend/config.js` | Configuración con URLs comentadas |
| `backend/services/authClient.js` | Cliente HTTP para auth service |
| `backend/services/productosClient.js` | Cliente HTTP para productos service |
| `backend/services/pagosClient.js` | Cliente HTTP para pagos service |
| `backend/routes/checkout.js` | Endpoints de checkout |
| `backend/routes/webhook.js` | Endpoint de webhook para pagos |
| Schema SQL | Script para tabla transacciones |
| Contratos documentados | Definición de datos para servicios externos |

### Definition of Done

- [ ] Backend puede hacer login/register mediante servicio externo
- [ ] Frontend puede obtener productos de servicio externo
- [ ] Checkout inicia proceso de pago en servicio externo
- [ ] Webhook recibe confirmación de pago
- [ ] Transacciones se guardan con estado correcto
- [ ] TODO/FIXME visibles para completar URLs

---

## Verification Strategy

**QA Policy**: Sin tests unitarios locales (proyecto no tiene infraestructura de tests). 
Validación manual mediante:
- Probar endpoints con curl/Postman
- Verificar respuestas del frontend

**Nota**: Los servicios externos necesitarán sus propias URLs para probar integración completa.

---

## Execution Strategy

### Ondas de Ejecución

```
Wave 1 (Foundation - puede iniciar inmediatamente):
├── T1: backend/config.js - Variables base comentadas
├── T2: Schema SQL - Script para transacciones
├── T3: authClient.js - Cliente auth service
└── T4: productosClient.js - Cliente productos service

Wave 2 (Core Integration - después de Wave 1):
├── T5: pagosClient.js - Cliente pagos service
├── T6: checkout.js - Endpoints checkout
├── T7: webhook.js - Endpoint webhook
└── T8: Middleware verificarToken - Ajustar para token externo

Wave 3 (Frontend Integration - después de Wave 2):
├── T9: server.js - Modificar endpoints auth
├── T10: transacciones.js - Ajustar a nuevo flujo
├── T11: main.js - Cambiar carga productos
└── T12: pago.html/carrito.js - Nuevo flujo checkout
```

### Dependency Matrix

- T1, T2, T3, T4: - - puedo iniciar inmediatamente
- T5, T6, T7, T8: T1, T3 - dependen de config y authClient
- T9, T10, T11, T12: T5, T6, T7, T8 - dependen de clientes y endpoints

---

## TODOs

### Wave 1: Foundation

- [x] T1. **Crear `backend/config.js`**

  **Qué hacer**: 
  - Crear archivo con variables para URLs de servicios externos
  - Usar valores por defecto localhost comentados
  - Exportar objeto con todas las configuraciones

  **No hacer**:
  - No incluir credenciales reales
  - No hacer fetching real de configuración

  ** QA Scenarios**: 
  - Verificar que el archivo se crea y exporta correctamente
  - Verificar que las variables tienen valores por defecto comentados

  **Referencias**:
  - `backend/package.json` - para ver estructura de exports

- [x] T2. **Crear Schema SQL para transacciones**

  **Qué hacer**:
  - Generar script SQL solo con tabla transacciones
  - Incluir índices y triggers
  - Añadir comentarios indicando que es para ejecutar en PostgreSQL del otro equipo

  **No hacer**:
  - No incluir tabla usuarios (ya no la manejas)
  - No incluir lógica de auth local

  ** QA Scenarios**:
  - Ejecutar script en PostgreSQL local para testing
  - Verificar que crea la tabla correctamente

  **Referencias**:
  - `database/schema.sql` actual - para ver formato de triggers/índices

- [x] T3. **Crear `backend/services/authClient.js`**

  **Qué hacer**:
  - Crear módulo con funciones: login(email, password), register(email, password, nombre), validateToken(token)
  - Usar axios o fetch para llamadas HTTP
  - Usar config para la URL base
  - Incluir manejo de errores

  **No hacer**:
  - No incluir lógica de bcrypt (ya no la necesitas)
  - No hacer queries directas a DB de usuarios

  ** QA Scenarios**:
  - Verificar que las funciones exportan correctamente
  - Verificar que usan las URLs de config

  **Referencias**:
  - `backend/server.js` - para ver estructura actual de auth endpoints

- [x] T4. **Crear `backend/services/productosClient.js`**

  **Qué hacer**:
  - Crear módulo con función: getProductos(token)
  - Obtener productos del servicio externo
  - Devolver en formato que espera el frontend

  **No hacer**:
  - No usar localStorage (eso es frontend)
  - No guardar productos en DB local

  ** QA Scenarios**:
  - Verificar que exporta la función getProductos

  **Referencias**:
  - `frontend/js/main.js` - para ver formato de productos que espera

---

### Wave 2: Core Integration

- [x] T5. **Crear `backend/services/pagosClient.js`**

  **Qué hacer**:
  - Crear módulo con funciones: crearCheckout(carrito, usuario), verificarPago(transaccionId)
  - Comunicar con servicio de pagos externo
  - Incluir manejo de webhook signature

  **No hacer**:
  - No procesar tarjetas directamente
  - No almacenar credenciales de tarjetas

  ** QA Scenarios**:
  - Verificar funciones exportan correctamente

- [x] T6. **Crear `backend/routes/checkout.js`**

  **Qué hacer**:
  - Crear router con endpoints:
    - GET /carrito/datos-pago - devuelve datos del carrito para el servicio de pagos
    - POST /checkout/iniciar - inicia proceso de checkout
  - Usar verificarToken middleware
  - Usar pagosClient para comunicación

  ** QA Scenarios**:
  - Verificar endpoints responden correctamente
  - Probar con datos de carrito válidos

- [x] T7. **Crear `backend/routes/webhook.js`**

  **Qué hacer**:
  - Crear router con POST /pago-confirmado
  - Validar signature del webhook
  - Actualizar estado de transacción
  - Responder 200 al servicio de pagos

  ** QA Scenarios**:
  - Simular webhook request
  - Verificar que actualiza transacción

- [x] T8. **Ajustar middleware verificarToken**

  **Qué hacer**:
  - Modificar verificarToken para validar token del servicio externo
  - Puede ser una llamada al auth service o validate endpoint

  **No hacer**:
  - No cambiar la firma de la función (para no romper otros usos)

---

### Wave 3: Frontend Integration

- [x] T9. **Modificar `backend/server.js` - Endpoints auth**

  **Qué hacer**:
  - Modificar POST /api/auth/login para usar authClient
  - Modificar POST /api/auth/register para usar authClient
  - Modificar GET /api/auth/me para usar authClient
  - Quitar código bcrypt
  - Quitar queries a tabla usuarios

  ** QA Scenarios**:
  - Probar login con credenciales de servicio externo
  - Probar registro nuevo

- [x] T10. **Modificar `backend/router/transacciones.js`**

  **Qué hacer**:
  - Ajustar GET / para obtener transacciones (pueden ser del servicio o locales)
  - Ajustar PATCH /:id/estado para actualizar estado
  - Quitar POST / (creación ahora es parte del checkout)

  ** QA Scenarios**:
  - Verificar que transacciones se recuperan correctamente

- [x] T11. **Modificar `frontend/js/main.js`**

  **Qué hacer**:
  - Cambiar carga de productos para que venga del backend (que a su vez llama al servicio externo)
  - Eliminar dependencia de localStorage para stock
  - Mantener funcionamiento del catálogo

  ** QA Scenarios**:
  - Verificar que productos se cargan desde el backend

- [x] T12. **Modificar flujo de pago en frontend**

  **Qué hacer**:
  - Modificar `frontend/js/carrito.js` para usar nuevo endpoint /api/checkout/iniciar
  - Modificar `frontend/pages/pago.html` para nuevo flujo
  - Redireccionar al servicio de pagos externo

  ** QA Scenarios**:
  - Probar flujo completo de checkout
  - Verificar redirección a servicio de pagos

---

## Archivos a Modificar/Eliminar

### Archivos a ELIMINAR

| Archivo | Razón |
|---------|-------|
| `database/schema.sql` completo | Será reemplazado por script de transacciones solo |
| Funciones bcrypt en server.js | Ya no las necesitas |

### Archivos a MODIFICAR

| Archivo | Cambios |
|---------|---------|
| `backend/server.js` | Endpoints auth usan authClient, quitar bcrypt |
| `backend/router/transacciones.js` | Ajustar a nuevo flujo |
| `frontend/js/main.js` | Productos vienen del backend |
| `frontend/js/carrito.js` | Checkout hacia servicio externo |
| `frontend/pages/pago.html` | Nuevo flujo de pago |

### Archivos NUEVOS

| Archivo | Propósito |
|---------|------------|
| `backend/config.js` | Configuración URLs servicios |
| `backend/services/authClient.js` | Cliente auth service |
| `backend/services/productosClient.js` | Cliente productos service |
| `backend/services/pagosClient.js` | Cliente pagos service |
| `backend/routes/checkout.js` | Endpoints checkout |
| `backend/routes/webhook.js` | Webhook pagos |

---

## Dónde dejar los TODOs/Placeholders

### 1. `backend/config.js`

```javascript
// ============================================
// CONFIGURACIÓN - SERVICIOS EXTERNOS
// Completar cuando tengas las URLs y credenciales
// ============================================

module.exports = {
  // --- Servicio de Auth ---
  // TODO: Obtener URL del equipo de auth service
  authServiceUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  authApiKey: process.env.AUTH_API_KEY || '', // TODO: completar si es necesario

  // --- Servicio de Productos ---
  // TODO: Obtener URL del equipo de productos service
  productosServiceUrl: process.env.PRODUCTOS_SERVICE_URL || 'http://localhost:3002',

  // --- Servicio de Pagos ---
  // TODO: Obtener URL del equipo de pagos service
  pagosServiceUrl: process.env.PAGOS_SERVICE_URL || 'http://localhost:3003',
  // TODO: Obtener secret para validar webhooks
  pagosWebhookSecret: process.env.PAGOS_WEBHOOK_SECRET || '',

  // --- Tu base de datos (PostgreSQL del otro equipo) ---
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'sistema_compras',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
  }
};
```

### 2. `backend/services/authClient.js`

```javascript
const config = require('../config');

// TODO: Verificar que AUTH_SERVICE_URL esté correcto
const BASE_URL = config.authServiceUrl;

async function login(email, password) {
  // TODO: Reemplazar con llamada real cuando tengas la URL
  // const response = await fetch(`${BASE_URL}/auth/login`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ email, password })
  // });
  // return response.json();
  
  // Por ahora, devolver mock para desarrollo
  return { error: 'AUTH_SERVICE_URL no configurado' };
}

async function register(email, password, nombre) {
  // TODO: Implementar cuando tengas la URL
  return { error: 'AUTH_SERVICE_URL no configurado' };
}

async function validateToken(token) {
  // TODO: Implementar cuando tengas la URL
  // Llamada a GET /auth/me con el token
  return { error: 'AUTH_SERVICE_URL no configurado' };
}

module.exports = { login, register, validateToken };
```

### 3. `backend/services/productosClient.js`

```javascript
const config = require('../config');

const BASE_URL = config.productosServiceUrl;

async function getProductos(token) {
  // TODO: Implementar cuando tengas la URL
  // const response = await fetch(`${BASE_URL}/productos`, {
  //   headers: { 'Authorization': `Bearer ${token}` }
  // });
  // return response.json();
  
  return { error: 'PRODUCTOS_SERVICE_URL no configurado' };
}

module.exports = { getProductos };
```

### 4. `backend/services/pagosClient.js`

```javascript
const config = require('../config');

const BASE_URL = config.pagosServiceUrl;

async function crearCheckout(carrito, usuario, token) {
  // TODO: Implementar cuando tengas la URL
  // POST ${BASE_URL}/checkout/crear
  // con los datos del carrito
  
  return { error: 'PAGOS_SERVICE_URL no configurado' };
}

async function verificarSignature(req, signature) {
  // TODO: Implementar validación de firma del webhook
  // Comparar signature con config.pagosWebhookSecret
  return false;
}

module.exports = { crearCheckout, verificarSignature };
```

### 5. `backend/server.js` - Endpoint datos-pago

```javascript
// TODO: Descomentar cuando tengas pagosClient implementado
/*
app.get('/api/carrito/datos-pago', verificarToken, async (req, res) => {
  try {
    // Obtener carrito del usuario desde DB local
    // const result = await pool.query('SELECT * FROM transacciones WHERE usuario_id = $1 AND estado = $2', 
    //   [req.usuario.id, 'pendiente']);
    
    // Formatear para el servicio de pagos
    const datosPago = {
      usuario: {
        id: req.usuario.id,
        email: req.usuario.email
      },
      items: [], // TODO: obtener del carrito en DB
      total: 0,  // TODO: calcular
      moneda: 'MXN'
    };
    
    res.json(datosPago);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener datos de pago' });
  }
});
*/
```

### 6. `backend/routes/webhook.js`

```javascript
const express = require('express');
const router = express.Router();
const pool = require('../db'); // Pool de PostgreSQL
const config = require('../config');
const pagosClient = require('../services/pagosClient');

// POST /webhook/pago-confirmado
router.post('/pago-confirmado', async (req, res) => {
  try {
    // TODO: Validar signature
    // const signature = req.headers['x-webhook-signature'];
    // if (!pagosClient.verificarSignature(req, signature)) {
    //   return res.status(401).json({ error: 'Signature inválida' });
    // }
    
    const { transaccion_id, estado, referencia_externa } = req.body;
    
    // TODO: Actualizar transacción en DB
    // await pool.query(
    //   'UPDATE transacciones SET estado = $1, referencia_pago_externa = $2 WHERE id = $3',
    //   [estado, referencia_externa, transaccion_id]
    // );
    
    res.json({ ok: true });
  } catch (error) {
    console.error('Error en webhook:', error);
    res.status(500).json({ error: 'Error procesando webhook' });
  }
});

module.exports = router;
```

---

## Success Criteria

### Verificación Commands

```bash
# Verificar que archivos nuevos existen
ls backend/config.js
ls backend/services/authClient.js
ls backend/services/productosClient.js
ls backend/services/pagosClient.js

# Verificar que server.js tiene los nuevos endpoints (comentados)
grep -n "datos-pago" backend/server.js
grep -n "webhook" backend/server.js

# Verificar que schema SQL tiene solo transacciones
grep "CREATE TABLE" database/schema_nuevo.sql
```

### Final Checklist

- [ ] Schema SQL tiene solo tabla transacciones
- [ ] config.js tiene todos los placeholders
- [ ] authClient.js implementa login/register/validate
- [ ] productosClient.js implementa getProductos
- [ ] pagosClient.js implementa crearCheckout
- [ ] checkout.js tiene endpoints de checkout
- [ ] webhook.js tiene endpoint de confirmación
- [ ] server.js usa authClient en vez de DB local
- [ ] Frontend usa endpoints del backend
- [ ] Todos los TODOs están visibles en código