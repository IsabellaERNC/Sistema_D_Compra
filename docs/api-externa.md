# Servicios Externos

El backend consume cuatro servicios externos. Este documento describe sus contratos, endpoints clave y responsabilidades.

## Resumen de Servicios

| Servicio | Puerto | Base URL por defecto | Responsabilidad |
|----------|--------|---------------------|-----------------|
| Auth | 4000 | `http://localhost:4000` | Autenticación y autorización |
| Productos | 4001 | `http://localhost:4001` | Catálogo de productos |
| Pagos | 4002 | `http://localhost:4002` | Procesamiento de pagos (MercadoPago) |
| Notificaciones-Pedidos | 4003 | `http://localhost:4003` | Notificaciones y gestión de pedidos |

## 1. Servicio de Autenticación

**URL base**: `AUTH_SERVICE_URL` (default: `http://localhost:4000`)

**Cliente**: `backend/services/authClient.js`

### Endpoints

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/login` | Iniciar sesión | No |
| POST | `/api/auth/register` | Registrar usuario | No |
| POST | `/api/auth/validate` | Validar token JWT | Sí (token) |
| GET | `/api/auth/usuario` | Obtener datos del usuario | Sí (token) |

### Contrato de Login

**Request:**
```json
{
  "email": "usuario@ejemplo.com",
  "password": "contraseña123"
}
```

**Response (éxito):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "usuario": {
    "id": 1,
    "nombre": "Juan Pérez",
    "email": "usuario@ejemplo.com"
  }
}
```

### Contrato de Validación de Token

**Request:** Header `Authorization: Bearer <token>`

**Response (éxito):**
```json
{
  "valid": true,
  "usuario": {
    "id": 1,
    "nombre": "Juan Pérez",
    "email": "usuario@ejemplo.com"
  }
}
```

**Response (inválido):**
```json
{
  "error": "Token inválido o expirado"
}
```

### Uso en el Backend

El middleware `verificarToken` en `server.js` llama a `authClient.validateToken(token)` para validar cada request autenticado. El resultado se almacena en `req.usuario`.

## 2. Servicio de Productos

**URL base**: `PRODUCTOS_SERVICE_URL` (default: `http://localhost:4001`)

**Cliente**: `backend/services/productosClient.js`

### Endpoints

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/api/productos` | Listar todos los productos | No |
| GET | `/api/productos/:id` | Detalle de un producto | No |
| GET | `/api/productos/:id/stock` | Stock disponible | No |

### Contrato de Listado

**Response:**
```json
[
  {
    "id": "PROD-001",
    "nombre": "Producto Ejemplo",
    "precio": 1500.00,
    "descripcion": "Descripción del producto",
    "stock": 50,
    "imagen_url": "https://..."
  }
]
```

### Uso en el Backend

El servicio de productos se consulta durante el checkout para validar que los productos del carrito existen y obtener información actualizada de precios.

## 3. Servicio de Pagos

**URL base**: `PAGOS_SERVICE_URL` (default: `http://localhost:4002`)

**Cliente**: `backend/services/pagosClient.js`

### Endpoints

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/api/pagos/crear-preferencia` | Crear preferencia de pago en MercadoPago | Sí |
| GET | `/api/pagos/estado/:payment_id` | Consultar estado de un pago | Sí |
| POST | `/api/pagos/webhook` | Notificación de pago (desde MercadoPago) | No (firma HMAC) |

### Contrato de Crear Preferencia

**Request:**
```json
{
  "items": [
    {
      "producto_id": "PROD-001",
      "nombre": "Producto Ejemplo",
      "precio_unitario": 1500.00,
      "cantidad": 2
    }
  ],
  "usuario_email": "usuario@ejemplo.com",
  "transaccion_id": "uuid-de-transaccion",
  "back_url": "http://localhost:5173/pages/confirmacion.html"
}
```

**Response (éxito):**
```json
{
  "payment_url": "https://www.mercadopago.com/checkout/v1/redirect?...",
  "payment_id": "MP-12345",
  "transaccion_id": "uuid-de-transaccion"
}
```

### Verificación de Webhook

El webhook de pagos envía una firma HMAC en el header `X-Signature`. El backend la verifica usando `PAGOS_WEBHOOK_SECRET`:

```javascript
const crypto = require('crypto');
const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
const isValid = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
```

## 4. Servicio de Notificaciones-Pedidos

**URL base**: `http://localhost:4003`

**Responsabilidad**: Envío de notificaciones y gestión de pedidos post-pago.

### Endpoints Esperados

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/notificaciones/enviar` | Enviar notificación al usuario |
| POST | `/api/pedidos/crear` | Crear pedido desde transacción aprobada |
| GET | `/api/pedidos/:id` | Consultar estado de pedido |

### Contrato de Notificación

**Request:**
```json
{
  "usuario_email": "usuario@ejemplo.com",
  "tipo": "pago_confirmado",
  "datos": {
    "transaccion_id": "uuid",
    "total": 3000.00,
    "items": [...]
  }
}
```

### Nota

Este servicio es consumido de forma asíncrona después de que el webhook confirma el pago. No es crítico para el flujo principal de carrito.

## Configuración en el Backend

Todas las URLs de servicios externos se configuran en `backend/config.js`:

```javascript
module.exports = {
    authServiceUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:4000',
    authApiKey: process.env.AUTH_API_KEY || '',
    productosServiceUrl: process.env.PRODUCTOS_SERVICE_URL || 'http://localhost:4001',
    pagosServiceUrl: process.env.PAGOS_SERVICE_URL || 'http://localhost:4002',
    pagosWebhookSecret: process.env.PAGOS_WEBHOOK_SECRET || '',
    tuLocalUrl: process.env.TU_LOCAL_URL || 'http://localhost:5173'
};
```

## Reglas de Consumo

1. **Nunca llamar servicios externos directamente desde rutas**. Siempre usar los clientes en `backend/services/`.
2. **Nunca hardcodear URLs**. Usar siempre `config.js`.
3. **Errores se propagan**. Los clientes lanzan errores tal cual los reciben. Las rutas los manejan.
4. **Timeouts**. Los servicios externos pueden tardar. El backend no implementa retries automáticos.
5. **Auth API Key**. El servicio de auth requiere `AUTH_API_KEY` en los headers de las requests.

## Diagrama de Secuencia: Checkout Completo

```
Frontend        Backend         Auth          Productos      Pagos         MP
   │              │              │              │             │             │
   │──login─────▶│              │              │             │             │
   │              │──validate──▶│              │             │             │
   │              │◀──usuario───│              │             │             │
   │◀──token─────│              │              │             │             │
   │              │              │              │             │             │
   │──add cart──▶│              │              │             │             │
   │              │──GET cart──▶│ (DB)          │             │             │
   │              │              │              │             │             │
   │──checkout──▶│              │              │             │             │
   │              │──validate──▶│              │             │             │
   │              │──get prod───│              │────────────▶│             │
   │              │◀──prod data─│              │◀────────────│             │
   │              │──INSERT txn▶│ (DB)          │             │             │
   │              │──create pref│              │             │────────────▶│
   │              │◀──pay URL───│              │             │◀────────────│
   │◀──pay URL───│              │              │             │             │
   │─────────────────────────────────────────────────────────────────────▶│
   │                        (usuario paga en MP)                          │
   │              │              │              │             │             │
   │              │◀──webhook─────────────────────────────────────────────│
   │              │──verify HMAC─│              │             │             │
   │              │──UPDATE txn▶│ (DB)          │             │             │
   │              │──DELETE cart│ (DB)          │             │             │
   │              │              │              │             │             │
   │◀──redirect──│              │              │             │             │
```
