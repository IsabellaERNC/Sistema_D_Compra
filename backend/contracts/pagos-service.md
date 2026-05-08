# Contrato — Servicio de Pagos (MercadoPago)

## Descripción

Servicio externo de procesamiento de pagos vía MercadoPago. Crea preferencias
de checkout y verifica firmas de webhook para notificaciones de pago.

## URL Base

```
{PAGOS_SERVICE_URL}
```

Configurado via `config.pagosServiceUrl` (variable de entorno `PAGOS_SERVICE_URL`).

## Headers Comunes

| Header         | Requerido | Descripción                          |
|----------------|-----------|--------------------------------------|
| Content-Type   | Sí        | `application/json`                   |

---

## `POST /checkout`

Crea una preferencia de pago (checkout) en MercadoPago.

### Request

```
POST /checkout
Content-Type: application/json
```

```json
{
  "usuario": {
    "id": 123,
    "email": "comprador@ejemplo.com"
  },
  "items": [
    {
      "producto_id": 1,
      "nombre": "Producto A",
      "cantidad": 2,
      "precio_unitario": 25000
    }
  ],
  "total": 50000,
  "moneda": "COP",
  "url_redirect_ok": "https://tusitio.com/pago/exito",
  "url_redirect_error": "https://tusitio.com/pago/error"
}
```

### Response — Éxito (200 / 201)

```json
{
  "id": "123456789",
  "init_point": "https://www.mercadopago.com.co/checkout/v1/redirect?pref_id=123456789",
  "sandbox_init_point": "https://sandbox.mercadopago.com.co/checkout/v1/redirect?pref_id=123456789",
  "status": "pending"
}
```

### Response — Error (400 / 422)

```json
{
  "error": "Datos de checkout inválidos"
}
```

### Errores

| Código | Significado                          |
|--------|--------------------------------------|
| 400    | Campos requeridos faltantes          |
| 422    | Datos de pago inválidos              |
| 5xx    | Error interno del servicio           |

### Validaciones previas al envío (lado cliente)

- `usuario`: debe tener `id` y `email` no vacíos.
- `items`: array no vacío, cada item con `producto_id`, `nombre`, `cantidad`, `precio_unitario`.
- `total`: número mayor a 0.
- `url_redirect_ok` y `url_redirect_error`: strings URL no vacías.

---

## Verificación de Webhook (HMAC-SHA256)

Cuando el servicio de pagos envía una notificación (vía webhook), la firma
debe verificarse usando HMAC-SHA256.

### Firma esperada

```
x-signature: <hmac-hex>
```

### Algoritmo

```
HMAC-SHA256(
  secret: config.pagosWebhookSecret (env: PAGOS_WEBHOOK_SECRET),
  message: payload string (raw body de la notificación)
)
```

### Ejemplo de verificación (Node.js)

```js
const crypto = require('crypto');

const esperado = crypto
  .createHmac('sha256', WEBHOOK_SECRET)
  .update(payloadString, 'utf8')
  .digest('hex');

const valido = crypto.timingSafeEqual(
  Buffer.from(xSignatureHeader),
  Buffer.from(esperado)
);
```

### Errores de verificación

| Condición                     | Error                          |
|-------------------------------|--------------------------------|
| Payload no es string          | `Payload inválido`             |
| Signature no es string        | `Signature inválida`           |
| WEBHOOK_SECRET no configurado | `Secret de webhook no configurado` |

---

## Consumidores

| Archivo                      | Funciones                                   |
|------------------------------|---------------------------------------------|
| `backend/services/pagosClient.js` | `crearCheckout()`, `verificarSignature()`   |

## Error de Servicio No Disponible

Si el servicio no responde (network error, timeout, 5xx), el cliente lanza:

```
Error: El servicio de pagos no está disponible
```
