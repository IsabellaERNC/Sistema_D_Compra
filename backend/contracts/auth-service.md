# Contrato — Servicio de Autenticación

## Descripción

Servicio externo de autenticación de usuarios. Maneja registro, inicio de sesión
y validación de tokens JWT.

## URL Base

```
{AUTH_SERVICE_URL}
```

Configurado via `config.authServiceUrl` (variable de entorno `AUTH_SERVICE_URL`).

## Headers Comunes

| Header         | Requerido | Descripción                        |
|----------------|-----------|------------------------------------|
| Content-Type   | Sí        | `application/json`                 |
| X-API-Key      | Opcional  | API key del servicio (si configurada en `config.authApiKey`) |

---

## `POST /login`

Inicia sesión y devuelve un token JWT + datos del usuario.

### Request

```
POST /login
Content-Type: application/json
```

```json
{
  "email": "usuario@ejemplo.com",
  "password": "MiPassword123"
}
```

### Response — Éxito (200)

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "usuario": {
    "id": 1,
    "email": "usuario@ejemplo.com",
    "nombre": "Usuario Ejemplo"
  }
}
```

### Response — Error (400 / 401)

```json
{
  "error": "Credenciales inválidas"
}
```

### Errores

| Código | Significado                          |
|--------|--------------------------------------|
| 400    | Campos requeridos faltantes          |
| 401    | Credenciales inválidas               |
| 5xx    | Error interno del servicio           |

---

## `POST /auth/register`

Registra un nuevo usuario en el sistema.

### Request

```
POST /auth/register
Content-Type: application/json
```

```json
{
  "email": "nuevo@ejemplo.com",
  "password": "MiPassword123",
  "nombre": "Nuevo Usuario"
}
```

### Response — Éxito (201 / 200)

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "usuario": {
    "id": 2,
    "email": "nuevo@ejemplo.com",
    "nombre": "Nuevo Usuario"
  }
}
```

### Response — Error (400 / 409)

```json
{
  "error": "El email ya está registrado"
}
```

### Errores

| Código | Significado                          |
|--------|--------------------------------------|
| 400    | Campos requeridos faltantes          |
| 409    | Email ya registrado                  |
| 5xx    | Error interno del servicio           |

---

## `GET /auth/me`

Valida un token JWT y retorna los datos del usuario asociado.

### Request

```
GET /auth/me
Authorization: Bearer <token>
```

### Response — Éxito (200)

```json
{
  "usuario": {
    "id": 1,
    "email": "usuario@ejemplo.com",
    "nombre": "Usuario Ejemplo"
  }
}
```

### Response — Error (401)

```json
{
  "error": "Token inválido o expirado"
}
```

### Errores

| Código | Significado                          |
|--------|--------------------------------------|
| 400    | Token no proporcionado               |
| 401    | Token inválido o expirado            |
| 5xx    | Error interno del servicio           |

---

## Consumidores

| Archivo                        | Funciones                        |
|--------------------------------|----------------------------------|
| `backend/services/authClient.js` | `login()`, `register()`, `validateToken()` |

## Error de Servicio No Disponible

Si el servicio no responde (network error, timeout, 5xx), el cliente lanza:

```
Error: El servicio de autenticación no está disponible
```
