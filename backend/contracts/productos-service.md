# Contrato — Servicio de Productos

## Descripción

Servicio externo de catálogo de productos. Expone el listado de productos
disponibles para la venta.

## URL Base

```
{PRODUCTOS_SERVICE_URL}
```

Configurado via `config.productosServiceUrl` (variable de entorno `PRODUCTOS_SERVICE_URL`).

## Headers Comunes

| Header         | Requerido | Descripción                          |
|----------------|-----------|--------------------------------------|
| Content-Type   | Sí        | `application/json`                   |

---

## `GET /productos`

Obtiene el listado completo de productos del catálogo.

### Request

```
GET /productos
```

Token opcional para productos con precio diferenciado o visibilidad restringida:

```
GET /productos
Authorization: Bearer <token>
```

### Response — Éxito (200)

Formato con envoltura `productos`:

```json
{
  "productos": [
    {
      "id": 1,
      "nombre": "Producto A",
      "precio": 25000,
      "descripcion": "Descripción del producto A",
      "imagen_url": "https://ejemplo.com/img/a.jpg",
      "stock": 100
    },
    {
      "id": 2,
      "nombre": "Producto B",
      "precio": 35000,
      "descripcion": "Descripción del producto B",
      "imagen_url": "https://ejemplo.com/img/b.jpg",
      "stock": 50
    }
  ]
}
```

Formato alternativo (array directo — también aceptado):

```json
[
  {
    "id": 1,
    "nombre": "Producto A",
    "precio": 25000
  }
]
```

### Response — Error

```json
{
  "error": "Error del servicio: 404"
}
```

### Errores

| Código | Significado                          |
|--------|--------------------------------------|
| 4xx    | Error del cliente (recurso no encontrado, etc.) |
| 5xx    | Error interno del servicio           |

---

## Consumidores

| Archivo                          | Funciones      |
|----------------------------------|----------------|
| `backend/services/productosClient.js` | `getProductos()` |

## Error de Servicio No Disponible

Si el servicio no responde (network error, timeout, 5xx), el cliente lanza:

```
Error: El servicio de productos no está disponible
```
