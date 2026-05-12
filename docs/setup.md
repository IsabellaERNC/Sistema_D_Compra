# Guía de Configuración

Instrucciones para que un nuevo desarrollador tenga el proyecto corriendo en menos de 15 minutos.

## Prerrequisitos

| Herramienta | Versión mínima | Verificación |
|-------------|----------------|--------------|
| Node.js | 18.x | `node -v` |
| npm | 9.x | `npm -v` |
| PostgreSQL | 14.x | `psql --version` |
| Git | 2.x | `git --version` |

## Paso 1: Clonar el Repositorio

```bash
git clone <repo-url>
cd Sistema_D_Compra
```

## Paso 2: Instalar Dependencias

Dos instalaciones separadas, una para backend y otra para frontend:

```bash
# Backend
cd backend
npm install

# Frontend (desde la raíz del proyecto)
cd ../frontend
npm install
```

## Paso 3: Configurar Variables de Entorno

```bash
# Desde la raíz del proyecto
cp .env.example .env
```

Editar `.env` con los valores correctos para tu entorno:

- `AUTH_SERVICE_URL`, `PRODUCTOS_SERVICE_URL`, `PAGOS_SERVICE_URL`: URLs de los microservicios externos. Deben estar corriendo antes de iniciar el backend.
- `PAGOS_WEBHOOK_SECRET`: Secreto compartido con el servicio de pagos para verificar firmas HMAC en el webhook.
- `DB_PASSWORD`: Contraseña de tu instancia local de PostgreSQL.
- `TU_LOCAL_URL`: URL donde corre el frontend (por defecto `http://localhost:5173`).

## Paso 4: Base de Datos

### Crear la base de datos

```bash
createdb -U postgres sistema_compras
```

### Ejecutar la migración

```bash
psql -U postgres -d sistema_compras -f database/migrations/001_add_carrito_and_fix_transacciones.sql
```

Esta migración crea:

- Tabla `carrito` con columnas: id, usuario_id, producto_id, producto_nombre, precio_unitario, cantidad, created_at, updated_at
- Columnas adicionales en `transacciones`: items (JSONB), usuario_email, payment_url
- Trigger automático para actualizar `updated_at` en cada modificación del carrito

## Paso 5: Iniciar los Servicios Externos

El backend depende de tres servicios externos que deben estar corriendo:

| Servicio | Puerto | Repositorio |
|----------|--------|-------------|
| Auth | 4000 | _(repositorio separado)_ |
| Productos | 4001 | _(repositorio separado)_ |
| Pagos | 4002 | _(repositorio separado)_ |

Sin estos servicios activos, el backend no podrá validar tokens, consultar productos ni procesar pagos.

## Paso 6: Iniciar el Backend

```bash
cd backend
npm run dev
```

El servidor Express arranca en `http://localhost:3000`. Deberías ver:

```
Conectado a PostgreSQL correctamente
Servidor corriendo en http://localhost:3000
```

Verifica con:

```bash
curl http://localhost:3000
# Respuesta: {"mensaje":"¡Servidor funcionando correctamente!"}
```

## Paso 7: Iniciar el Frontend

En una terminal separada:

```bash
cd frontend
npm run dev
```

Vite arranca en `http://localhost:5173`. Abre esa URL en tu navegador.

## Verificación Completa

1. Abre `http://localhost:5173` en el navegador
2. Navega a la página de login
3. Agrega productos al carrito desde el catálogo
4. Verifica que los productos aparecen en la página del carrito

## Solución de Problemas

### Error de conexión a PostgreSQL

- Verifica que PostgreSQL esté corriendo: `pg_isready`
- Confirma que la base de datos existe: `psql -U postgres -l | grep sistema_compras`
- Revisa las credenciales en `.env`

### Error al llamar servicios externos

- Confirma que los servicios externos están corriendo en los puertos correctos
- Verifica las URLs en `.env`
- Prueba con curl: `curl http://localhost:4000/health` (o el endpoint de health de cada servicio)

### Puerto ya en uso

- Backend (3000): `netstat -ano | findstr :3000` (Windows) o `lsof -i :3000` (Linux/Mac)
- Frontend (5173): mismo comando con puerto 5173
- Mata el proceso conflictivo o cambia el puerto en `server.js` / `vite.config.js`

### Error de CORS

El backend ya tiene CORS habilitado para todas las origins. Si ves errores de CORS, verifica que el frontend esté sirviendo desde `http://localhost:5173`.

## Estructura del Proyecto

```
Sistema_D_Compra/
├── backend/
│   ├── server.js              # Entry point Express
│   ├── config.js              # Variables de entorno
│   ├── routes/
│   │   ├── carrito.js         # CRUD del carrito
│   │   ├── checkout.js        # Inicio de pago
│   │   ├── transacciones.js   # Historial de transacciones
│   │   └── webhook.js         # Confirmación de pago
│   └── services/
│       ├── authClient.js      # Cliente HTTP auth
│       ├── productosClient.js # Cliente HTTP productos
│       └── pagosClient.js     # Cliente HTTP pagos
├── frontend/
│   ├── index.html             # Entry point Vite
│   ├── pages/
│   │   ├── login.html         # Página de login
│   │   ├── carrito.html       # Página del carrito
│   │   ├── pago.html          # Página de pago
│   │   └── confirmacion.html  # Confirmación de pago
│   └── js/
│       ├── auth.js            # Lógica de autenticación
│       ├── main.js            # Lógica principal
│       └── carrito.js         # Lógica del carrito
├── database/
│   └── migrations/
│       └── 001_add_carrito_and_fix_transacciones.sql
├── docs/
│   ├── setup.md               # Esta guía
│   ├── arquitectura.md        # Diagrama de arquitectura
│   └── api-externa.md         # Contratos de servicios externos
├── .env.example               # Plantilla de variables
└── README.md                  # Documentación principal
```
