# API Interna — Endpoints del Microservicio

> Documentación completa de todos los endpoints del backend. Base URL: `http://localhost:3000`

## Autenticación

Todas las rutas (excepto `/`, webhook y productos) requieren token JWT:

```
Header: Authorization: Bearer <jwt_token>
```

El middleware `verificarToken` valida el token contra el servicio de auth externo (o localmente en DEV_MODE) y popula `req.usuario` con:

```json
{ "id": 1, "nombre": "Usuario", "email": "user@test.com", "rol": "cliente", "vendor_id": null }
```

---

## 1. Carrito (`/api/carrito`)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/carrito` | ✅ | Listar items del carrito del usuario |
| `POST` | `/api/carrito` | ✅ | Agregar item al carrito (upsert) |
| `POST` | `/api/carrito/agregar` | ✅ | Alias de POST / (misma funcionalidad) |
| `PATCH` | `/api/carrito/:producto_id` | ✅ | Actualizar cantidad de un item |
| `DELETE` | `/api/carrito/:producto_id` | ✅ | Eliminar un item del carrito |
| `DELETE` | `/api/carrito` | ✅ | Vaciar carrito completo |
| `POST` | `/api/carrito/fusionar` | ✅ | Fusionar carrito guest → usuario |
| `GET` | `/api/carrito/datos-pago` | ✅ | Obtener resumen para checkout |

### GET /api/carrito
**Response 200:**
```json
{
  "carrito": [
    {
      "id": 1,
      "producto_id": "PROD-001",
      "producto_nombre": "Laptop HP",
      "precio_unitario": 2500000,
      "cantidad": 2,
      "imagen_url": "https://...",
      "categoria": "tecnologia"
    }
  ],
  "total": 5000000,
  "cantidad_items": 2
}
```

### POST /api/carrito (o /agregar)
**Request:**
```json
{
  "producto_id": "PROD-001",
  "producto_nombre": "Laptop HP",
  "precio_unitario": 2500000,
  "cantidad": 1,
  "imagen_url": "https://...",
  "categoria": "tecnologia"
}
```
**Response 201:**
```json
{ "mensaje": "Producto agregado al carrito.", "producto_id": "PROD-001", "cantidad": 3 }
```

### PATCH /api/carrito/:producto_id
**Request:**
```json
{ "cantidad": 5 }
```
**Response 200:**
```json
{ "mensaje": "Cantidad actualizada.", "producto_id": "PROD-001", "cantidad": 5 }
```

### DELETE /api/carrito/:producto_id
**Response 200:**
```json
{ "mensaje": "Producto eliminado del carrito." }
```

### DELETE /api/carrito
**Response 200:**
```json
{ "mensaje": "Carrito vaciado." }
```

### POST /api/carrito/fusionar
**Request:**
```json
{
  "items": [
    { "producto_id": "PROD-002", "producto_nombre": "Mouse", "precio_unitario": 50000, "cantidad": 1 }
  ]
}
```
**Response 200:**
```json
{ "mensaje": "Carrito fusionado exitosamente.", "total_items": 5 }
```

### GET /api/carrito/datos-pago
**Response 200:**
```json
{
  "items": [{ "producto_id": "PROD-001", "producto_nombre": "Laptop HP", "precio_unitario": 2500000, "cantidad": 1 }],
  "total": 2500000,
  "cantidad_items": 1,
  "usuario": { "id": 1, "nombre": "Usuario", "email": "user@test.com" }
}
```

---

## 2. Checkout (`/api/checkout`)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `POST` | `/api/checkout/iniciar` | ✅ | Iniciar proceso de pago |
| `GET` | `/api/checkout/carrito/datos-pago` | ✅ | Datos resumidos para checkout |

### POST /api/checkout/iniciar
Crea una transacción en estado PENDIENTE, calcula el total desde el carrito, llama al servicio de pagos externo y retorna la URL de checkout de MercadoPago.

**Response 200:**
```json
{
  "transaccion_id": "uuid-xxx",
  "estado": "PENDIENTE",
  "total": 2500000,
  "moneda": "COP",
  "url_pago": "https://www.mercadopago.com.co/checkout/v1/...",
  "payment_reference": "MP-REF-123"
}
```
**Response 400:**
```json
{ "error": "El carrito está vacío." }
```

### GET /api/checkout/carrito/datos-pago
**Response 200:**
```json
{
  "items": [...],
  "total": 2500000,
  "cantidad_items": 1
}
```

---

## 3. Transacciones (`/api/transacciones`)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/transacciones` | ✅ | Listar transacciones del usuario |
| `GET` | `/api/transacciones/:id` | ✅ | Detalle de una transacción |
| `PATCH` | `/api/transacciones/:id/estado` | ✅ | Actualizar estado |

**Estados válidos:** `PENDIENTE`, `APROBADA`, `RECHAZADA`

### GET /api/transacciones
**Response 200:**
```json
[
  {
    "id": "uuid-xxx",
    "usuario_id": 1,
    "items": [{"producto_id": "PROD-001", "nombre": "Laptop HP", "precio": 2500000, "cantidad": 1}],
    "total": 2500000,
    "moneda": "COP",
    "estado": "APROBADA",
    "payment_reference": "MP-REF-123",
    "created_at": "2026-05-10T15:30:00Z"
  }
]
```

### GET /api/transacciones/:id
Incluye detalles de auditoría: `ip_address`, `user_agent`, `intentos_pago`, `ultimo_intento_pago`, `intentos_cancelacion`.

**Response 200:**
```json
{
  "id": "uuid-xxx",
  "usuario_id": 1,
  "items": [...],
  "total": 2500000,
  "moneda": "COP",
  "estado": "APROBADA",
  "payment_reference": "MP-REF-123",
  "currency": "COP",
  "ip_address": "127.0.0.1",
  "user_agent": "Mozilla/5.0...",
  "intentos_pago": 1,
  "created_at": "2026-05-10T15:30:00Z"
}
```

---

## 4. Direcciones (`/api/direcciones`)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/direcciones` | ✅ | Listar direcciones del usuario |
| `POST` | `/api/direcciones` | ✅ | Agregar dirección |
| `PATCH` | `/api/direcciones/:id` | ✅ | Actualizar dirección |
| `DELETE` | `/api/direcciones/:id` | ✅ | Eliminar dirección |

### POST /api/direcciones
**Request:**
```json
{
  "calle": "Calle 123 #45-67",
  "ciudad": "Bogotá",
  "departamento": "Cundinamarca",
  "codigo_postal": "110111",
  "predeterminada": true
}
```
**Response 201:**
```json
{ "mensaje": "Dirección agregada.", "id": "uuid-xxx" }
```

---

## 5. Pedidos (`/api/pedidos`)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/pedidos` | ✅ | Listar pedidos del usuario |
| `GET` | `/api/pedidos/:id` | ✅ | Detalle de un pedido |
| `PATCH` | `/api/pedidos/:id/estado` | ✅ | Actualizar estado del pedido |
| `POST` | `/api/pedidos/:id/cancelar` | ✅ | Cancelar pedido |

**Estados del pedido:** `Pendiente` → `Procesando` → `Enviado` → `Entregado`. `Cancelado` desde `Pendiente` o `Procesando`.

El PATCH emite evento WebSocket a la room `usuario_{id}` para actualizar el frontend en tiempo real.

### GET /api/pedidos
**Response 200:**
```json
[
  {
    "id": "uuid-xxx",
    "usuario_id": 1,
    "estado": "Procesando",
    "items": [{"producto_id": "PROD-001", "nombre": "Laptop HP", "precio": 2500000, "cantidad": 1}],
    "monto_total": 2500000,
    "direccion_envio_id": "uuid-yyy",
    "transaccion_id": "uuid-zzz",
    "created_at": "2026-05-10T15:35:00Z"
  }
]
```

---

## 6. Vendedor (`/api/vendedor`)

| Método | Ruta | Auth | Rol |
|--------|------|------|-----|
| `GET` | `/api/vendedor/pedidos` | ✅ | vendedor |
| `PATCH` | `/api/vendedor/pedidos/:id/estado` | ✅ | vendedor |

Requiere token con `rol: "vendedor"` y `vendor_id`. El middleware `vendedorMiddleware.js` verifica el rol.

Cada cambio de estado registra entrada en `log_estados`. Emite WebSocket a la room `vendedor_{vendorId}`.

### GET /api/vendedor/pedidos
**Response 200:**
```json
[
  {
    "id": "uuid-xxx",
    "usuario_id": 1,
    "estado": "Pendiente",
    "items": [
      {"producto_id": "PROD-001", "nombre": "Laptop HP", "precio": 2500000, "cantidad": 1, "vendor_id": "VENDOR-001"}
    ],
    "monto_total": 2500000,
    "created_at": "2026-05-10T15:35:00Z"
  }
]
```

### PATCH /api/vendedor/pedidos/:id/estado
**Request:**
```json
{ "estado": "Procesando" }
```
**Response 200:**
```json
{ "mensaje": "Estado actualizado a Procesando.", "pedido_id": "uuid-xxx", "estado_anterior": "Pendiente", "estado_nuevo": "Procesando" }
```

---

## 7. Productos (`/api/productos`)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/productos/lista` | ❌ | Listar productos del catálogo |
| `GET` | `/api/productos/recomendaciones` | ❌ | Recomendaciones |

Estas rutas son proxies al servicio externo de productos (`productosClient`). No requieren autenticación.

---

## 8. Webhook (`/api/webhook`)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `POST` | `/api/webhook/pago-confirmado` | ❌ HMAC | Confirmación de pago |

**No requiere token JWT.** Verifica firma HMAC con `PAGOS_WEBHOOK_SECRET`.

Al confirmar pago:
1. Verifica firma HMAC del header `x-webhook-signature`
2. Actualiza transacción a estado `APROBADA`
3. Crea registro en `pedidos`
4. Vacía el carrito del usuario
5. Llama a `productosClient.deducirStock()` (con fallback a `eventos_pendientes`)
6. Llama a `notificacionesPedidosClient.notificarPedidoCreado()` (con fallback)

**Headers requeridos:**
```
Content-Type: application/json
x-webhook-signature: <hmac_sha256>
```

**Request body:**
```json
{
  "evento": "pago.confirmado",
  "transaccion_id": "uuid-xxx"
}
```

**Response 200:**
```json
{ "mensaje": "Pago confirmado. Carrito vaciado y pedido creado." }
```

---

## 9. WebSocket (Socket.IO)

**Namespace:** `/pedidos`

**Conexión:**
```javascript
const socket = io('http://localhost:3000/pedidos', {
  auth: { token: 'jwt_token' }
});
```

**Eventos emitidos por el servidor:**

| Evento | Room | Payload | Trigger |
|--------|------|---------|---------|
| `estado_actualizado` | `usuario_{id}` | `{ pedido_id, estado, timestamp }` | PATCH /api/pedidos/:id/estado |
| `estado_actualizado` | `vendedor_{vendorId}` | `{ pedido_id, estado, timestamp }` | PATCH /api/vendedor/pedidos/:id/estado |

---

## Códigos de Error

| Código | Significado |
|--------|-------------|
| `400` | Datos inválidos o faltantes en la solicitud |
| `401` | Token requerido — no autenticado |
| `403` | Token inválido/expirado o rol insuficiente |
| `404` | Recurso no encontrado |
| `500` | Error interno del servidor |
