# Sistema_D_Compra

Sistema de carrito de compras basado en microservicios. Backend Express que consume servicios externos de autenticación, catálogo de productos y pagos (MercadoPago). Frontend SPA con persistencia híbrida: localStorage para invitados, PostgreSQL para usuarios autenticados.

## Arquitectura

```
┌─────────────┐   ┌──────────────┐   ┌─────────────────┐
│  Vite SPA   │──▶│  Express API │──▶│   PostgreSQL DB  │
│ (frontend/) │   │ (backend/)   │   │ (carrito,        │
│  port 5173  │   │  port 3000   │   │  transacciones)  │
└─────────────┘   └──────┬───────┘   └─────────────────┘
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
        Auth Svc   Productos Svc  Pagos Svc
       port 4000    port 4001    port 4002
       (external)   (external)  (MercadoPago)
```

El backend actúa como consumidor de tres microservicios externos. Delega autenticación, catálogo de productos y procesamiento de pagos. El frontend es una SPA ligera que llama a la API del backend.

## Servicios

| Servicio | Puerto | Responsabilidad |
|----------|--------|-----------------|
| Backend API | 3000 | Carrito CRUD, checkout, transacciones, direcciones, pedidos, webhook, eventos, productos proxy |
| Frontend | 5173 | SPA con Vite: login, carrito, pago, confirmación, pedidos, vendedor, recomendaciones |
| Auth (externo) | 4000 | Registro, login, validación JWT |
| Productos (externo) | 4001 | Catálogo de productos |
| Pagos (externo) | 4002 | Integración con MercadoPago |
| Notificaciones (externo) | 4003 | Notificaciones de pedidos |

## Inicio Rápido

### Prerrequisitos

- Node.js 18+
- PostgreSQL 14+
- Servicios externos corriendo (auth, productos, pagos)

### Pasos

```bash
# 1. Clonar repositorio
git clone <repo-url>
cd Sistema_D_Compra

# 2. Instalar dependencias
cd backend && npm install
cd ../frontend && npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con los valores correctos

# 4. Crear base de datos y ejecutar migración
createdb -U postgres sistema_compras
psql -U postgres -d sistema_compras -f database/schema_completo.sql

# 5. Iniciar servidores (en terminales separadas)
cd backend && npm run dev    # Terminal 1: Express en puerto 3000
cd frontend && npm run dev   # Terminal 2: Vite en puerto 5173
```

Ver la guía completa en [docs/setup.md](docs/setup.md).

## Variables de Entorno

| Variable | Propósito | Valor por defecto |
|----------|-----------|-------------------|
| `AUTH_SERVICE_URL` | URL del servicio de autenticación | `http://localhost:4000` |
| `AUTH_API_KEY` | API key del servicio de auth | _(vacío)_ |
| `PRODUCTOS_SERVICE_URL` | URL del servicio de productos | `http://localhost:4001` |
| `PAGOS_SERVICE_URL` | URL del servicio de pagos | `http://localhost:4002` |
| `PAGOS_WEBHOOK_SECRET` | Secreto HMAC para verificación de webhook | _(vacío)_ |
| `NOTIFICACIONES_SERVICE_URL` | URL del servicio de notificaciones | `http://localhost:4003` |
| `JWT_SECRET` | Secreto para firmar JWTs en DEV_MODE | _(vacío)_ |
| `DEV_MODE` | Modo desarrollo (true=JWT local, false=auth externo) | `true` |
| `URL_PAGO_OK` | Redirección post-pago exitoso | `http://localhost:5173/pages/confirmacion.html?status=ok` |
| `URL_PAGO_ERROR` | Redirección post-pago fallido | `http://localhost:5173/pages/confirmacion.html?status=error` |
| `DB_HOST` | Host de PostgreSQL | `localhost` |
| `DB_PORT` | Puerto de PostgreSQL | `5432` |
| `DB_USER` | Usuario de PostgreSQL | `postgres` |
| `DB_PASSWORD` | Contraseña de PostgreSQL | `postgres` |
| `DB_NAME` | Nombre de la base de datos | `sistema_compras` |
| `TU_LOCAL_URL` | URL del frontend para redirección de pago | `http://localhost:5173` |

Ver ejemplo completo en [.env.example](.env.example).

## Documentación

| Documento | Descripción |
|-----------|-------------|
| [docs/setup.md](docs/setup.md) | Guía paso a paso para configurar el proyecto |
| [docs/arquitectura.md](docs/arquitectura.md) | Diagrama y explicación de la arquitectura |
| [docs/api-externa.md](docs/api-externa.md) | Contratos de servicios externos (auth, productos, pagos) |

## Convenciones del Proyecto

- **CommonJS** en todo el backend (`require`/`module.exports`)
- **Sin TypeScript** - JavaScript puro
- **Factory pattern** para rutas: `(pool, verificarToken) => router`
- **Sin ORM** - consultas SQL directas con `pg`
- **Sin tests automatizados** - verificación manual

## Licencia

MIT
