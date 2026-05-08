# Plan de Limpieza de Arquitectura

## TL;DR

> **Objetivo**: Analizar el proyecto, eliminar código no utilizado y simplificar la arquitectura para evitar patrones de microservicio.

> **Entregables**:
> - Eliminar servicios externos no integrados (`services/`)
> - Consolidar routing (`router/` O `routes/`, no ambos)
> - Actualizar AGENTS.md con nueva estructura
> - Documentar lo que se eliminó y por qué

> **Esfuerzo**: Medium | **Paralelo**: NO - requiere análisis manual

---

## Contexto

### Análisis de Agentes (Exploración completada)

| Hallazgo | Archivos afectados | Acción requerida |
|----------|---------------------|------------------|
| Servicios externos no integrados | `backend/services/*` | Evaluar y eliminar si no se usan |
| Routing duplicado | `backend/router/` + `backend/routes/` | Consolidar en uno |
| Credenciales hardcodeadas | `server.js` lines 16-21 | Documentar en ANTI-PATTERNS |
| Sin tests/CI/CD | proyecto completo | Documentar como limitación |

### Estructura actual
```
backend/
├── router/transacciones.js   # Factory pattern
├── routes/webhook.js         # Factory pattern  
├── routes/checkout.js        # Factory pattern
└── services/                 # EXTERNAL APIs - posiblemrente no usados
    ├── authClient.js
    ├── pagosClient.js
    └── productosClient.js
```

---

## Objetivos de Trabajo

### 1. Analizar uso de servicios externos
**Qué hacer**: Verificar si `services/` está importado en `server.js` o `router/`

**Referencias**:
- `backend/server.js` - buscar `require('./services/')`
- `backend/router/transacciones.js` - buscar imports

**Criterio de éxito**:
- [x] SI se usa → documentar en AGENTS.md como "integración externa"
- Los servicios están integrados: authClient, productosClient, pagosClient

---

### 2. Consolidar arquitectura de routing
**Qué hacer**: Unificar `router/` y `routes/` en un solo directorio

**Referencias**:
- `backend/router/transacciones.js`
- `backend/routes/webhook.js`
- `backend/routes/checkout.js`

**Criterio de éxito**:
- [x] Elegir nombre canonical (`routes/` recomendado)
- [x] Mover archivos si es necesario (transacciones.js → routes/)
- [x] Actualizar imports en `server.js`

---

### 3. Actualizar documentación AGENTS.md
**Qué hacer**: Reflejar cambios en la estructura

**Archivos a actualizar**:
- `AGENTS.md` (root)
- `backend/AGENTS.md`

**Criterio de éxito**:
- [x] Nueva estructura documentada
- [x] Anti-patrones actualizados
- [x] LO QUE SE ELIMINÓ documentado

---

## Execution Strategy

### Wave 1: Análisis y decisión
```
Tarea 1: Verificar imports de services/ en server.js y router/
  - grep "services/" backend/server.js
  - grep "services/" backend/router/*.js
  - SI no hay imports → services/ se elimina
```

### Wave 2: Eliminación (si aplica)
```
Tarea 2: Eliminar backend/services/ si no se usa
  - Confirmar con grep
  - Eliminar directorio services/
```

### Wave 3: Consolidación
```
Tarea 3: Consolidar router + routes
  - Decidir directorio canonical
  - Mover archivos si es necesario
  - Actualizar imports
```

### Wave 4: Documentación
```
Tarea 5: Actualizar AGENTS.md
  - Documentar estructura nueva
  - Documentar lo eliminado
  - Actualizar ANTI-PATTERNS
```

---

## Anti-Patrones a Documentar

- ❌ NO usar servicios externos sin integrar: eliminar `services/` si no se usa
- ❌ NO mantener dos patrones de routing (`router/` y `routes/`)
- ❌ NO arquitectura de microservicio: todo en backend monolith espreferible para este proyecto

---

## Verification Strategy

**QA Policy**: 
- Verificar que `server.js` inicia sin errores (`npm start`)
- Verificar que frontend (`npm run dev`) funciona
- Verificar que transacciones API responde

**Test**: NO HAY - proyecto no tiene tests

---

## Success Criteria

- [x] `backend/services/` NO eliminado (SÍ está en uso)
- [x] Solo un directorio de routing (`routes/`) - consolidado
- [x] AGENTS.md actualizado con cambios
- [x] Server inicia correctamente
- [x] Frontend funciona correctamente