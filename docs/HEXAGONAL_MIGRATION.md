# 🔶 Migración a Arquitectura Hexagonal Liviana — agenda-service

Guía de migración incremental del microservicio de agenda desde el estilo actual
(*fat routes / transaction scripts*) hacia **arquitectura hexagonal liviana**
(ports & adapters sin ceremonia).

> **Regla de oro de toda la migración:** los 52 tests HTTP existentes son la red
> de seguridad. Cada fase termina con la suite en verde y un deploy en producción
> verificado. Si una fase no puede completarse sin romper tests, se corta ahí.

---

## 1. Objetivo y alcance

**Objetivo:** separar `agenda-service` en dominio puro, casos de uso y adaptadores,
de forma que:

- Las reglas de negocio (anti-solapamiento, pricing, series recurrentes, excepciones)
  sean testeables **sin Supabase, sin Express y sin mocks de HTTP**.
- Supabase quede confinado a **un solo directorio** (adaptador de persistencia).
- El scoping multi-tenant (`account_id`) se garantice en **un solo lugar** (repositorios),
  no repetido en cada query de cada handler.
- Los bugs de normalización/serialización (como el de `is_recurring`/`status` NULL)
  tengan **un único punto** donde prevenirse.

**Alcance:** solo `agenda-service/`. El `backend/` queda fuera (solo consume la API).
No cambia **nada** del contrato HTTP: mismas rutas, mismos payloads, mismas respuestas.

**No-objetivos (explícitos):**

- ❌ Migrar a TypeScript (opcional a futuro, no en esta migración)
- ❌ CQRS, event sourcing, buses de eventos
- ❌ Contenedores de DI (Awilix/Inversify)
- ❌ Capas de DTOs/mappers entre fronteras
- ❌ Cambiar el esquema de base de datos
- ❌ Cambiar el comportamiento observable de la API

---

## 2. Diagnóstico del estado actual

```
agenda-service/
├── api/index.js                  # wrapper serverless de Vercel (require('../server'))
├── server.js                     # bootstrap Express + WebSocket (135 líneas)
├── config/supabase.js            # cliente global singleton (16 líneas)
├── config/timezones.js           # constantes IANA (11 líneas)
├── middleware/auth.js            # JWT + verificación de cuenta/bloqueo (69 líneas)
├── routes/agenda.js              # ⚠️ 783 líneas: TODA la lógica
├── utils/dateUtils.js            # funciones puras de fechas (209 líneas)
├── utils/gracePeriodUtils.js     # política de período de gracia (191 líneas)
├── utils/responseUtils.js        # middleware de normalización de fechas (79 líneas)
└── __tests__/                    # 5 suites / 52 tests vía supertest + supabaseMock
```

**Problema central:** `routes/agenda.js` mezcla 4 responsabilidades por handler:

| Responsabilidad | Ejemplo en `POST /rentals` |
|---|---|
| HTTP | parseo de body, status codes, `res.json` |
| Reglas de negocio | anti-solapamiento, cálculo `hours × rate`, defaults de `status`/`is_recurring` |
| Persistencia | `supabase.from('rentals').insert([...])` inline |
| Serialización | qué claves van al INSERT, normalización de fechas |

**Evidencia de costo:** los bugs de doble reserva y del NOT NULL (`agenda.js:196-204`)
eran exactamente lógica de negocio conviviendo con detalles de persistencia, y el
`supabaseMock` (75 líneas de builder encadenable) existe solo porque los tests no
pueden testear la lógica sin simular el cliente de BD completo.

**Activo a favor:** `utils/dateUtils.js` ya contiene funciones **puras y testeables**
(`doPeriodsOverlap`, `calculateHours`, `validateDate`, conversión de timezones con Luxon).
Es el embrión natural del dominio.

### Inventario de endpoints (contrato a congelar)

| # | Ruta (`/api/agenda`) | Función | Caso de uso futuro |
|---|---|---|---|
| 1 | `GET /calendar/view` | rentals regulares + series recurrentes con excepciones aplicadas | `GetCalendarView` |
| 2 | `POST /rentals` | crear alquiler (valida cliente/cancha, pricing, anti-solape) | `CreateRental` |
| 3 | `PUT /rentals/:id` | editar/reschedule (recalcula, anti-solape excluyéndose) | `UpdateRental` |
| 4 | `PUT /rentals/:id/status` | cambiar estado (excepciones si es serie) | `UpdateRentalStatus` |
| 5 | `GET /rentals/:id/exceptions` | listar excepciones de una serie | `ListExceptions` |
| 6 | `POST /rentals/:id/exceptions` | crear excepción de serie | `CreateException` |
| 7 | `DELETE /rentals/:id/exceptions/:date` | quitar excepción | `DeleteException` |

---

## 3. Arquitectura objetivo

```
agenda-service/src/
├── domain/                              # 💎 PURO: cero require de express/supabase/luxon-config
│   ├── model/
│   │   ├── rental.js                    # entidad + createRental(input) → valida invariantes
│   │   └── time-range.js                # value object: start/end UTC + validaciones
│   ├── services/
│   │   ├── overlap-policy.js            # ← nace de utils/dateUtils.doPeriodsOverlap
│   │   ├── pricing-calculator.js        # ← nace de calculateHours × hourly_rate
│   │   └── recurring-series.js          # reglas de series y excepciones (puras)
│   ├── errors.js                        # DomainError, NotFoundError, ValidationError, ConflictError
│   └── ports/
│       ├── rental-repository.js         # contrato documentado (JSDoc + factory)
│       ├── court-repository.js
│       ├── client-repository.js
│       └── notification-port.js         # hoy: broadcastRentalUpdate por WebSocket
│
├── application/
│   └── use-cases/                       # orquestan dominio + puertos. Sin HTTP, sin SQL
│       ├── create-rental.js
│       ├── update-rental.js
│       ├── update-rental-status.js
│       ├── get-calendar-view.js
│       └── exceptions/
│           ├── create-exception.js
│           ├── delete-exception.js
│           └── list-exceptions.js
│
├── infrastructure/
│   ├── http/                            # ADAPTADOR ENTRANTE
│   │   ├── middleware/auth.js           # (se mantiene; ver Fase 4-b)
│   │   ├── middleware/date-standardization.js  # ← utils/responseUtils
│   │   └── routes/agenda.routes.js      # controllers FINOS: parseo + status codes
│   ├── persistence/                     # ADAPTADOR SALIENTE: lo único que conoce Supabase
│   │   ├── supabase-client.js           # ← config/supabase.js
│   │   ├── supabase-rental.repository.js
│   │   ├── supabase-court.repository.js
│   │   ├── supabase-client.repository.js
│   │   └── supabase-exception.repository.js
│   └── realtime/
│       └── ws-notifier.js               # ← lógica de broadcast de server.js
│
├── server.js                            # composition root: wiring explícito (sin contenedor DI)
└── api/index.js                         # wrapper Vercel (sin cambios)

# Convivencia durante la migración (se borra al final):
├── routes/agenda.js                     # legacy, se va vaciando endpoint por endpoint
└── utils/, config/                      # re-exportan a src/ hasta la Fase 4
```

### Reglas de dependencia (las únicas 4 que importan)

1. `domain/` **no requiere nada** de `application/`, `infrastructure/` ni librerías de
   infraestructura. Solo Luxon como librería de valores de tiempo (aceptada como
   dependencia de dominio).
2. `application/` solo requiere `domain/`. Recibe puertos **por parámetro** (factory).
3. `infrastructure/` implementa puertos y expone adapters. Conoce todo, nadie la conoce.
4. Las dependencias **apuntan hacia adentro**. Un `require` que viole esto rompe el build
   (ver guard en Fase 5).

### Qué significa "liviano" aquí (y qué prohibirse)

| ❌ Ceremonia que NO agregamos | ✅ Qué hacemos en su lugar |
|---|---|
| Interfaces/clases abstractas formales | Puerto = módulo factory con JSDoc del contrato |
| Contenedor de DI (Awilix, Inversify) | Pasar dependencias como argumentos |
| DTOs + mappers en cada frontera | Objetos planos de JS |
| Clases base para use cases | Funciones factory: `makeCreateRental(deps)` |
| Result/Either monads para errores | `throw` de errores de dominio tipados (`errors.js`) |
| CQRS / bus de eventos / mediators | Llamadas directas entre use cases si hiciera falta |

**Prueba de que quedó liviano:** testear `CreateRental` requiere < 15 líneas con objetos
fake y cero frameworks de mock.

---

## 4. Estrategia de testing (3 niveles)

| Nivel | Qué testea | Dónde | Cantidad objetivo |
|---|---|---|---|
| **A. Dominio puro** | políticas y value objects: solapes, pricing, series, time-range | `src/domain/__tests__/` | nuevos, ~20-30 casos |
| **B. Use cases con fakes** | orquestación: orden de llamadas, errores de dominio, scoping | `src/application/__tests__/` | fakes de repositorio en ~10 líneas c/u |
| **C. HTTP end-to-end** | contrato completo con Supabase mockeado | `__tests__/` (existentes, intactos) | los 52 actuales — **no se reescriben** |

Los tests de nivel C se mantienen **intactos durante toda la migración**: como prueban
vía `supertest` contra `server.js`, siguen pasando aunque cambie por completo el interior.
Son la definición de "no rompí el contrato".

---

## 5. Fases de migración

> Cada fase = 1+ commits, suite en verde, deploy a Vercel, verificación de los endpoints
> migrados contra producción. Las fases 1-3 pueden integrarse por separado sin riesgo.

### Fase 0 — Preparación y baseline (½ día)

**Tareas:**

- [ ] Congelar el contrato: guardar snapshots de request/response reales de los 7 endpoints
      (manual con curl contra producción, o copiar los de los tests) en
      `docs/agenda-api-snapshots.md` como referencia de equivalencia
- [ ] Agregar script `"test": "jest"` ya existente + `"test:coverage"` al `package.json`
- [ ] Registrar cobertura actual de `routes/agenda.js` (baseline numérico para el final)
- [ ] Verificar que `npm test` y `npm start` corren limpios desde cero
      (`rm -rf node_modules && npm i && npm test`)

**Criterio de aceptación:** suite verde documentada, snapshots del contrato guardados.

---

### Fase 1 — Dominio puro (1 día) · *riesgo: mínimo, no toca endpoints*

**Tareas:**

- [ ] Crear esqueleto `src/domain/` con `errors.js`
      (`DomainError`, `NotFoundError`, `ValidationError`, `ConflictError`)
- [ ] Mover/adapter `utils/dateUtils.js` → `src/domain/services/time.js`
      (Luxon queda como única dependencia; `validateDate`, `parseToUTC`,
      `localDateTimeToISOStringWithTimezone` se movieron casi tal cual)
- [ ] `src/domain/services/overlap-policy.js`:
      `assertNoOverlap({ start, end, existing: [{start, end}] })` → lanza `ConflictError`
      ⚠️ Incorporar la regla del fix `45bff41`: rentals con `status: null` cuentan como activos
- [ ] `src/domain/services/pricing-calculator.js`:
      `calculateTotal({ start, end, hourlyRate })` → `{ hours, totalAmount }` (ceil por hora)
- [ ] `src/domain/model/time-range.js`: value object `TimeRange.from(start, end)`
      que valida `start < end` (reemplaza los `if (start >= end)` dispersos)
- [ ] `src/domain/model/rental.js`: factory `createRental(input)` que aplica los defaults
      de negocio `status ?? 'pending'`, `is_recurring ?? false` (hoy en `agenda.js:199-203`)
- [ ] Tests de nivel A para todo lo anterior (incluidos casos borde: medianoche, DST,
      rangos de 30 min con ceil, solape de exactamente 1 ms)

**Criterio de aceptación:** 100% de `src/domain/` sin ningún `require` de express/supabase;
tests A verdes; suite C (52) sigue en verde; **ningún endpoint cambió**.

**Commits sugeridos:** `refactor(domain): extract time utils`, `feat(domain): overlap policy + pricing + rental model`.

---

### Fase 2 — Puertos y adaptador Supabase (1-1.5 días) · *riesgo: bajo*

**Tareas:**

- [ ] `src/domain/ports/rental-repository.js` — contrato:

```js
/**
 * Todas las operaciones están FUERZOSAMENTE scoping por accountId.
 * @returns {Promise<Rental|null>} null si no existe o no pertenece a la cuenta
 */
export const makeRentalRepository = ({ supabase }) => ({
  findById: async (id, accountId) => {},
  findActiveByCourtBetween: async (courtId, accountId, start, end) => {}, // para anti-solape
  create: async (rental) => {},          // serializa SOLO aquí (defaults ya vienen del dominio)
  update: async (id, accountId, patch) => {},
  listByCourtAndRange: async (courtId, accountId, start, end) => {},
});
```

- [ ] `supabase-court.repository.js` (`findByIdWithRate`, `findAvailable`) y
      `supabase-client.repository.js` (`existsInAccount`) — mismos criterios
- [ ] `supabase-exception.repository.js` (upsert/list/delete de `rental_exceptions`)
- [ ] `src/domain/ports/notification-port.js` + `src/infrastructure/realtime/ws-notifier.js`
      (envuelve el `wss` de `server.js`; la interfaz es `notify(accountId, event, payload)`)
- [ ] Test del adaptador de rentals contra el `supabaseMock` existente (único lugar donde
      el mock se sigue usando)
- [ ] ⚠️ Revisar en este punto: la normalización de fechas de salida
      (`standardizeDatesInResponse` de `responseUtils`) queda en la capa HTTP, no en el
      repositorio (decisión documentada en este archivo si cambia)

**Criterio de aceptación:** Supabase importado **solo** en `src/infrastructure/persistence/`;
contratos de puertos documentados; suite C en verde (aún no se usan los puertos desde las rutas).

**Commit:** `feat(ports): repository contracts + supabase adapters`.

---

### Fase 3 — Use cases + primer endpoint migrado (1.5-2 días) · *riesgo: medio*

**Tareas:**

- [ ] `src/application/use-cases/create-rental.js` — reescribe `POST /rentals` (agenda.js:113-242):

```js
export const makeCreateRental = ({ rentalRepo, courtRepo, clientRepo, clock }) =>
  async (input) => {
    const client = await clientRepo.requireInAccount(input.clientId, input.accountId);   // NotFoundError
    const court  = await courtRepo.requireAvailable(input.courtId, input.accountId);     // NotFoundError/ConflictError
    const range  = TimeRange.from(input.start, input.end);                               // ValidationError
    const active = await rentalRepo.findActiveByCourtBetween(input.courtId, input.accountId, range);
    assertNoOverlap(range, active);                                                      // ConflictError
    const rental = createRental({ ...input, total: calculateTotal(range, court.hourlyRate) });
    return rentalRepo.create(rental);
  };
```

- [ ] `src/infrastructure/http/routes/agenda.routes.js` — controller fino de `POST /rentals`
      (mapear `DomainError` → 404/400/409/500 según tipo, en **un solo** error-middleware)
- [ ] Routing dual en `server.js` mientras migran los endpoints:
      `POST /rentals` → nuevo controller; resto → `routes/agenda.js` legacy
- [ ] Tests de nivel B para `CreateRental` con fakes (casos: cliente ajeno a cuenta,
      cancha no disponible, solape, éxito con y sin `status`/`is_recurring` en el input)
- [ ] Deploy y verificación del endpoint en producción (crear rental real de prueba)

**Criterio de aceptación:** `POST /rentals` responde byte a byte igual que antes
(snapshots de Fase 0); tests B verdes; suite C en verde.

**Commit:** `refactor(create-rental): use case + hexagonal wiring`.

---

### Fase 4 — Migrar los endpoints restantes y desmantelar el legacy (1.5-2 días)

**Tareas, en este orden (de menor a mayor complejidad):**

- [ ] 4-a. `GET /rentals/:id/exceptions`, `POST /rentals/:id/exceptions`,
      `DELETE /rentals/:id/exceptions/:date` → use cases de `exceptions/`
- [ ] 4-b. `PUT /rentals/:id/status` → `UpdateRentalStatus`
      (incluye la rama de excepciones para series; `validStatuses` pasa a dominio)
- [ ] 4-c. `GET /calendar/view` → `GetCalendarView` (el más complejo: combina rentals
      regulares + series + excepciones; testear con calendario que cruce fin de mes)
- [ ] 4-d. `PUT /rentals/:id` → `UpdateRental` (reschedule + recálculo + anti-solape
      excluyéndose a sí mismo)
- [ ] 4-e. **Borrar** `routes/agenda.js` y eliminar el routing dual
- [ ] 4-f. `utils/responseUtils.js` → `src/infrastructure/http/middleware/date-standardization.js`;
      `utils/gracePeriodUtils.js` → `src/domain/services/grace-period.js` (es regla de negocio
      pura; el middleware `auth.js` pasa a consumirla desde dominio)
- [ ] 4-g. `config/` → `src/infrastructure/persistence/supabase-client.js` +
      `src/domain/services/time.js`; eliminar carpetas legacy

**Criterio de aceptación:** `routes/agenda.js` no existe; `wc -l` de cada controller < 40
líneas; suite C en verde; deploy verificado.

**Commits:** uno por endpoint (`refactor(update-rental): ...`) + `chore: remove legacy fat routes`.

---

### Fase 5 — Guardas y cierre (½ día)

**Tareas:**

- [ ] Test de arquitectura (guard de dependencias, ~30 líneas con `node --test` o jest):
      escanear `src/domain/**/*.js` y fallar si algún archivo contiene
      `require('express')`, `require('supabase')`, `from('../infrastructure` o `from('../../application`
- [ ] Comparar cobertura de `src/` contra el baseline de Fase 0 (objetivo: sube)
- [ ] Actualizar `docs/` (README del servicio + este documento con estado final)
- [ ] Revisión final de los 4 principios de "liviano" (sección 3): ¿algún lugar donde
      se nos coló ceremonia? Sacarlo.

**Criterio de aceptación:** guard integrado a CI/test suite; documentación actualizada.

---

## 6. Riesgos y mitigaciones

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| Cambio sutil de comportamiento (fechas, status codes, shape de respuesta) | Media | Snapshots de Fase 0 + suite C intacta + verificación en producción por fase |
| El mock `supabaseMock` no matchea las nuevas queries del adaptador | Alta | El mock solo se usa en tests del adaptador (Fase 2); se ajusta ahí, aislado |
| Routing dual genera confusión durante Fases 3-4 | Media | Máximo 2 endpoints en dual a la vez; tabla de estado en este doc |
| Scope creep ("ya que estamos, lo pasamos a TS / agregamos Zod / rehacemos auth") | Alta | Sección 1 (no-objetivos) es vinculante; cualquier extra = issue nuevo, no entra |
| Serverless: cold start por más archivos | Baja | Impacto despreciable (~ms); no condiciona decisiones |
| Doble mantención legacy/nuevo durante Fases 3-4 | Media | Fixes de bugs van SIEMPR E al código nuevo; el legacy se congeló |

---

## 7. Definition of Done

- [ ] `routes/agenda.js` eliminado; 7 endpoints servidos por controllers finos
- [ ] `supabase-js` importado únicamente en `src/infrastructure/persistence/`
- [ ] `src/domain/` sin dependencias de infraestructura (guard automático en verde)
- [ ] Anti-solapamiento, pricing y defaults de rental viven en `domain/` con tests puros
- [ ] El scoping por `account_id` se aplica solo dentro de los repositorios
- [ ] Los 52 tests HTTP originales pasan **sin modificaciones**
- [ ] Cobertura de dominio + use cases ≥ 90%
- [ ] Deploy en producción verificado endpoint por endpoint
- [ ] Este documento actualizado con el estado final

---

## 8. Tabla de estado de la migración

> Actualizar al cerrar cada fase. Fuente de verdad del avance.

| Fase | Estado | Deploy verificado | Commit de cierre |
|---|---|---|---|
| 0 — Baseline | ⬜ pendiente (suite baseline: 52 tests OK) | — | — |
| 1 — Dominio puro | ✅ completada | pendiente de push | `0a6df4c` + `d84b681` |
| 2 — Puertos + Supabase | ✅ completada | pendiente de push | `7205387` |
| 3 — CreateRental | ✅ completada | ✅ verificado en producción | `682e79f` |
| 4 — Resto de endpoints | ✅ completada | pendiente de verificación | `50dfedd` + `a23e9f7` |
| 5 — Guardas y cierre | ⬜ pendiente | — | — |
