# T9 Learnings: Modificar endpoints auth para usar authClient

## Pattern Used
- Los endpoints ahora delegan a authClient en lugar de pool.query directo
- authClient.login/-register devuelven { token, usuario } directamente
- verificarToken middleware ya usa authClient.validateToken()

## Successful Changes
1. **POST /api/auth/login**: Llama `authClient.login(email, password)` y retorna `{ mensaje, token, usuario }`
2. **POST /api/auth/register**: Llama `authClient.register(email, password, nombre)` y retorna `{ mensaje, token, usuario }`
3. **GET /api/auth/me**: Ahora usa `req.usuario` del middleware (ya viene validado)
4. **Quitado**: `require('bcryptjs')` y `JWT_SECRET` ya no se necesitan

## Response Format
Todos los endpoints devuelven al frontend:
```json
{ mensaje: "...", token: "...", usuario: { id, nombre, email } }
```

## Gotcha
- El app.listen tenía un string truncado (`http:` sin `${PORT}`) - se corrigió
- No se necesita más pool.query en endpoints de auth