# agenda-service

Microservicio de gestión de agenda (alquileres recurrentes, excepciones y
vista de calendario) para la app de alquiler de canchas.

**Arquitectura:** hexagonal liviana (ports & adapters sin ceremonia).
Migración completa documentada en [`docs/HEXAGONAL_MIGRATION.md`](../docs/HEXAGONAL_MIGRATION.md).

## Estructura

```
src/
├── domain/            # 💎 puro: sin express ni supabase (guard automático)
│   ├── model/         #   Rental, TimeRange (value objects)
│   ├── services/      #   anti-solapamiento, pricing, tiempo, series
│   ├── ports/         #   contratos de repositorios y notificaciones
│   └── errors.js      #   jerarquía de errores de dominio
├── application/       # casos de uso (orquestan dominio + puertos)
│   └── use-cases/
├── infrastructure/
│   ├── http/          # controllers finos + middleware (adaptador entrante)
│   ├── persistence/   # adaptadores Supabase (único lugar con supabase-js)
│   └── realtime/      # WebSocket notifier (adaptador saliente)
└── __tests__/         # guard de arquitectura
```

## Reglas de dependencia

1. `domain/` no requiere infraestructura (test lo hace cumplir).
2. `application/` solo conoce `domain/`; las dependencias llegan inyectadas.
3. `supabase-js` vive exclusivamente en `infrastructure/persistence/`.
4. El scoping multi-tenant (`account_id`) se aplica dentro de los repositorios.

## Desarrollo

```sh
npm install
npm start          # servidor + WebSocket en :3001
npm test           # 160+ tests (contrato HTTP, dominio puro, adaptadores)
npm run test:watch
```

## Endpoints

Todos bajo `/api/agenda` (JWT requerido):

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/calendar/view?start_date&end_date` | Vista calendario (rentals + excepciones) |
| POST | `/rentals` | Crear alquiler |
| PUT | `/rentals/:id` | Editar/reschedule |
| PUT | `/rentals/:id/status` | Cambiar estado |
| GET | `/rentals/:id/exceptions` | Excepciones de una serie |
| POST | `/rentals/:id/exceptions` | Crear excepción de ocurrencia |
| DELETE | `/rentals/:id/exceptions/:date` | Quitar excepción |

Despliegue: Vercel serverless (`api/index.js` → `server.js`).
