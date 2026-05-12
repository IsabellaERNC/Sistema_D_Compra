# Arquitectura del Sistema

## Vista General

Sistema de carrito de compras construido como un microservicio que consume tres servicios externos independientes.

## Diagrama de Arquitectura

```
                        ┌─────────────────────────────────────────┐
                        │           Frontend (Vite SPA)           │
                        │         http://localhost:5173           │
                        │                                         │
                        │  login.html  carrito.html  pago.html    │
                        │  confirmacion.html  index.html          │
                        │                                         │
                        │  js/auth.js  js/main.js  js/carrito.js  │
                        └──────────────────┬──────────────────────┘
                                           │ fetch()
                                           ▼
                        ┌─────────────────────────────────────────┐
                        │         Backend API (Express)           │
                        │         http://localhost:3000           │
                        │                                         │
                        │  ┌───────────────────────────────────┐  │
                        │  │         Middleware CORS           │  │
                        │  └───────────────────────────────────┘  │
                        │  ┌───────────────────────────────────┐  │
                        │  │    verificarToken (JWT via auth)  │  │
                        │  └───────────────────────────────────┘  │
                        │                                         │
                        │  ┌──────────┐ ┌──────────┐ ┌─────────┐ │
                        │  │ /carrito │ │/checkout │ │/webhook │ │
                        │  │  (CRUD)  │ │ (pago)   │ │(sin auth)│ │
                        │  └──────────┘ └──────────┘ └─────────┘ │
                        │  ┌───────────────────────────────────┐  │
                        │  │      /transacciones (historial)   │  │
                        │  └───────────────────────────────────┘  │
                        └──────┬──────────────┬───────────────────┘
                               │              │
                    ┌──────────┘              └──────────┐
                    ▼                                    ▼
        ┌───────────────────────┐        ┌───────────────────────────────┐
        │    PostgreSQL DB      │        │      Servicios Externos       │
        │   localhost:5432      │        │                               │
        │                       │        │  ┌─────────────────────────┐  │
        │  ┌─────────────────┐  │        │  │ Auth Service :4000      │  │
        │  │    carrito      │  │        │  │ login, register,        │  │
        │  │  (items del     │  │        │  │ validateToken           │  │
        │  │   usuario)      │  │        │  └─────────────────────────┘  │
        │  └─────────────────┘  │        │  ┌─────────────────────────┐  │
        │  ┌─────────────────┐  │        │  │ Productos Service :4001 │  │
        │  │  transacciones  │  │        │  │ listar productos,       │  │
        │  │  (historial     │  │        │  │ detalle, stock          │  │
        │  │   de pagos)     │  │        │  └─────────────────────────┘  │
        │  └─────────────────┘  │        │  ┌─────────────────────────┐  │
        │                       │        │  │ Pagos Service :4002     │  │
        │                       │        │  │ crear preferencia MP,   │  │
        │                       │        │  │ webhook, estado pago    │  │
        │                       │        │  └─────────────────────────┘  │
        └───────────────────────┘        └───────────────────────────────┘
```

## Flujo de Datos

### 1. Usuario Invitado Agrega Productos

```
Navegador → localStorage (carrito_guest) → sin llamada al backend
```

Los invitados almacenan su carrito en localStorage. El backend no participa en esta fase.

### 2. Usuario Autenticado Consulta su Carrito

```
Navegador → GET /api/carrito → verificarToken → authClient.validateToken()
    → PostgreSQL: SELECT * FROM carrito WHERE usuario_id = ?
    → Response: [{ producto_id, producto_nombre, precio_unitario, cantidad }]
```

### 3. Fusión de Carrito (Guest → Usuario)

```
Login exitoso → POST /api/carrito/fusionar
    → Lee carrito_guest de localStorage
    → PostgreSQL: INSERT ... ON CONFLICT (usuario_id, producto_id)
      DO UPDATE SET cantidad = carrito.cantidad (conserva existente)
    → Response: carrito fusionado
```

La fusión **conserva** los items existentes del usuario. Si el guest tiene un producto que el usuario ya tiene en su carrito, se mantiene la cantidad del usuario.

### 4. Checkout e Inicio de Pago

```
POST /api/checkout/iniciar → verificarToken
    → PostgreSQL: SELECT * FROM carrito WHERE usuario_id = ?
    → productosClient: validar productos existentes
    → PostgreSQL: INSERT INTO transacciones (estado = 'PENDIENTE', items = JSONB)
    → pagosClient: crear preferencia en MercadoPago
    → Response: { payment_url, transaccion_id }
    → Redirección del usuario a MercadoPago
```

### 5. Confirmación de Pago (Webhook)

```
MercadoPago → POST /api/webhook/pago-confirmado (sin auth)
    → Verificar firma HMAC con PAGOS_WEBHOOK_SECRET
    → PostgreSQL: UPDATE transacciones SET estado = 'APROBADA'
    → PostgreSQL: DELETE FROM carrito WHERE usuario_id = ?
    → Response: 200 OK
```

El webhook no requiere autenticación JWT. La seguridad se basa en la verificación de firma HMAC.

### 6. Consulta de Historial de Transacciones

```
GET /api/transacciones → verificarToken
    → PostgreSQL: SELECT * FROM transacciones WHERE usuario_id = ?
    → Response: [{ id, estado, total, items, created_at }]
```

## Capas del Sistema

| Capa | Tecnología | Responsabilidad |
|------|------------|-----------------|
| Presentación | HTML + JS vanilla + Vite | UI, navegación, localStorage |
| API | Express.js + CommonJS | Routing, validación, orquestación |
| Autenticación | Middleware verificarToken | Validación JWT vía servicio externo |
| Datos | PostgreSQL + pg | Persistencia de carrito y transacciones |
| Integración | fetch() HTTP clients | Comunicación con servicios externos |

## Patrones de Diseño

### Factory Pattern para Rutas

Cada archivo de ruta exporta una función factory que recibe `pool` y `verificarToken`:

```javascript
module.exports = (pool, verificarToken) => {
    const router = express.Router();
    router.get('/', verificarToken, async (req, res) => { ... });
    return router;
};
```

Esto permite inyección de dependencias y evita estado global.

### Persistencia Híbrida

- **Invitados**: localStorage del navegador (`carrito_guest`)
- **Autenticados**: tabla `carrito` en PostgreSQL
- **Transición**: fusión al momento del login

### Webhook sin Auth

El endpoint de webhook no usa `verificarToken`. En su lugar, verifica la firma HMAC del payload usando el secreto compartido `PAGOS_WEBHOOK_SECRET`.

## Estados de Transacción

| Estado | Significado |
|--------|-------------|
| `PENDIENTE` | Transacción creada, esperando pago |
| `APROBADA` | Pago confirmado por webhook |
| `RECHAZADA` | Pago rechazado |

## Decisiones Arquitectónicas

1. **Sin ORM**: consultas SQL directas con `pg` para control total y simplicidad.
2. **CommonJS**: consistencia con el ecosistema Express tradicional.
3. **Servicios externos**: autenticación, catálogo y pagos son responsabilidad de otros equipos. Este servicio solo consume.
4. **Webhook sin JWT**: los webhooks de MercadoPago no envían tokens. La seguridad viene de la firma HMAC.
5. **Fusión conservativa**: al fusionar carrito guest con usuario, se preservan los items existentes del usuario para evitar pérdida de datos.
