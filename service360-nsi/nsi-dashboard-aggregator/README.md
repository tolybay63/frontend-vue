# NSI Dashboard Aggregator

"Тонкий" агрегатор, собирающий метрики НСИ с существующих RPC/REST-методов и отдающий компактные JSON-контракты для фронтенда Service 360.

## Возможности

- Fan-out ко всем справочникам (источники, типы, компоненты, параметры, дефекты, работы) с параллельными вызовами и таймаутами.
- Кэширование ответов `coverage`, `diagnostics`, `relations-counts`, `activity` с TTL (по умолчанию 3 секунды, настраивается переменной `NSI_DASHBOARD_TTL_MS`).
- Проброс авторизационных заголовков, контроль дедлайна (`NSI_DASHBOARD_TIMEOUT_MS`, по умолчанию 3000 мс).
- Частичные ответы без 5xx: отсутствующие коллекции помечаются `partial: true`, числовые поля обнуляются.
- Диагностики по обязательным полям и связям, fallback активности и поиска при отсутствии специализированных RPC.
- Адаптеры для Express (через `registerNsiDashboardRoutes`) и NestJS (см. `src/adapters/nest.ts`).

## Конфигурация

| Переменная | Назначение | Значение по умолчанию |
|------------|------------|------------------------|
| `NSI_DASHBOARD_ENABLED` | Feature-flag, отключает модуль, если `false` | `true` |
| `NSI_DASHBOARD_TTL_MS` | TTL in-memory кэша | `3000` |
| `NSI_DASHBOARD_TIMEOUT_MS` | Общий дедлайн для fan-out | `3000` |

## Подключение

### Express / Fastify

```ts
import express from 'express'
import { NsiDashboardAggregatorService } from './nsi-dashboard-aggregator/src/core'
import { registerNsiDashboardRoutes } from './nsi-dashboard-aggregator/src/adapters/express'

const app = express()
const service = new NsiDashboardAggregatorService(existingClients)
registerNsiDashboardRoutes(app, service)
```

`existingClients` — объект с методами `fetchSources`, `fetchTypes`, `fetchComponents`, `fetchParams`, `fetchDefects`, `fetchWorks` и, опционально, `fetchActivity`, `search`. Каждый метод должен принимать `{ signal, headers, timeoutMs }` и возвращать массив записей.

### NestJS

Файл `src/adapters/nest.ts` содержит `NsiDashboardModule` и `NsiDashboardController`. Подключите модуль и предоставьте `NsiDashboardAggregatorService` через DI. Для типобезопасности добавьте зависимость `@nestjs/common` и опишите провайдер существующих клиентов.

## Тесты

- `vitest --config nsi-dashboard-aggregator/vitest.config.ts`
  - Юнит: корректность подсчётов, частичная деградация (`tests/aggregator.service.test.ts`).
  - Интеграция (адаптер Express + кэш TTL) — `tests/express-adapter.test.ts`.

## Возвращаемые эндпоинты

| Метод | Путь | Ответ |
|-------|------|-------|
| `GET` | `/nsi/dashboard/coverage` | `NsiCoverage & { partial?: boolean }` |
| `GET` | `/nsi/dashboard/diagnostics` | `{ items: DiagnosticItem[]; partial?: boolean }` |
| `GET` | `/nsi/dashboard/relations-counts` | `RelationsCounts & { partial?: boolean }` |
| `GET` | `/nsi/dashboard/activity` | `{ items: ActivityItem[]; partial?: boolean }` |
| `GET` | `/nsi/search?q=…` | `MixedSearchItem[]` |

## Как прогнать локально

```bash
npm install
npx vitest run --config nsi-dashboard-aggregator/vitest.config.ts
```

> ⚠️ Модуль не модифицирует существующие сервисы: подключается через адаптер и использует текущие RPC-клиенты.
