# STRUCTURE.md

## Слои проекта (Feature-Sliced Design)

- **app/** — точка инициализации приложения: провайдеры, роутер, тема. **Запрещена** бизнес-логика.
- **shared/** — утилиты, API-клиенты, глобальные стили и токены, UI-компоненты без доменной привязки.
- **entities/** — модели/репозитории предметной области (DTO, нормализация, API); никаких Vue-хуков.
- **features/** — прикладные сценарии (хуки/компоненты), собирающие сущности под задачу.
- **widgets/** — комплексные UI-блоки из нескольких фич/сущностей, многократно используемые.
- **pages/** — страницы-презентеры, связывающие фичи/виджеты с роутером и layout; не работают с сырими API.
- **layouts/** — макеты, навигация, header/footer, **без** бизнес-логики.

---

## Правила импортов

- **pages** → можно импортировать `@features`, `@entities`, `@shared`, `@layouts`.
- **features** → можно импортировать `@entities`, `@shared`.
- **entities** → можно импортировать только `@shared`.
- **shared** → не импортирует вышележащие слои.
- Запрещены «сквозные» и обратные импорты.

### Линт-правила
- ESLint запрещает глубокие импорты (`@entities/*/api/*`, `@features/*/model/*`, `@shared/api/*`).  
  Используйте barrel-файлы (`index.ts`).  
- Для страниц запрещены зависимости от `@app`, `@pages`, `@widgets`, `@/stores`.  
- Для фич запрещены импорты `app/pages/layouts/widgets`.  
- Для сущностей запрещены любые импорты кроме `@shared`.

---

## Алиасы (Vite)

- `@` → `src/`
- `@app` → `src/app/`
- `@shared` → `src/shared/`
- `@entities` → `src/entities/`
- `@features` → `src/features/`
- `@widgets` → `src/widgets/`
- `@pages` → `src/pages/`
- `@layouts` → `src/layouts/`

**Примеры:**
```ts
import router from '@app/router'
import { http } from '@shared/api/httpClient'
import { useObjectTypesQuery } from '@features/object-type-crud'
import { objectTypeRepo } from '@entities/object-type'
import { useSourcesQuery } from '@features/source-crud'
import { fetchNsiCoverage } from '@entities/nsi-dashboard'
import { useUiSidebar } from '@features/ui'
```

---

## Работа с API

- Все HTTP и RPC-запросы идут через общий клиент в `@shared/api` (axios).
- RPC вызывается через `@shared/api/rpcClient`.
- REST-запросы идут через `@shared/api/httpClient`.
- Страницы/фичи используют **репозитории из entities/**, а не прямые вызовы.
- Базовый URL формируется из переменных окружения:  
  `VITE_API_BASE`, `VITE_API_DEV_PROXY_BASE`, `VITE_RPC_PATH`.
- В dev запросы идут на `VITE_API_DEV_PROXY_BASE` и переписываются Vite proxy.  
- В prod axios бьёт напрямую на `VITE_API_BASE`.

---

## Где лежат стили и токены

- Базовые CSS и токены: `src/shared/styles/globals.css`, `src/shared/styles/tokens.css`.
- Глобальные стили приложения Service360: `src/assets/styles/service360.css`.

---

## Именование и структура модулей

- Папки/файлы — `kebab-case`.  
- Компоненты Vue — `PascalCase`.  
- Публичный API слоя — через `index.ts` (barrel).  

### features
```
src/features/<name>/model/use<Name>.ts
src/features/<name>/ui/<Name>Widget.vue
src/features/<name>/index.ts
```

### entities
```
src/entities/<entity>/model/{types,dto}.ts
src/entities/<entity>/api/repository.ts
src/entities/<entity>/index.ts
```

### pages
```
src/pages/<ns>/NewPage.vue
<script setup lang="ts">
// импорт фич/виджетов
</script>

<template>
  <section class="page">
    <h2>New Page</h2>
  </section>
</template>
```

---

## Добавление нового модуля

1. Определите слой (entity / feature / widget / page).  
2. Создайте структуру `model/`, `api/`, `ui/` и barrel `index.ts`.  
3. Добавьте комментарий с назначением.  
4. Подключите через алиасы.  
5. Соблюдайте линт-правила (никаких глубоких импортов).  

---

## Чек-лист перед коммитом/PR

1. `npm run typecheck`
2. `npm run lint` (или `lint:fix`)
3. `npm run format` (или `format:fix`)
4. Скриншот/описание UI-изменений в PR
5. Обновите `.env.example` и документацию, если менялось окружение

---

## Codemods

- `node scripts/codemods/replace-nsi-dashboard-imports.mjs` — массовая замена импортов `@/services/nsiDashboard.api` на публичный API `@entities/nsi-dashboard`.
