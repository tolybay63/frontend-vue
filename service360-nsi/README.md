# nsi-frontend-vue

Фронтенд **Service 360** на Vue 3 + Vite.  
Документация ниже поможет настроить окружение, собрать приложение и развивать его архитектурно последовательно.

---

## Требования к окружению
- **Node.js:** `^20.19.0` или `>=22.12.0`  
- **npm:** версия из дистрибутива Node.js (проект тестировался с npm 10)

Убедитесь, что ваша версия Node.js соответствует [engines в package.json](package.json).

---

## Скрипты npm

| Скрипт              | Назначение |
|---------------------|------------|
| `npm run dev`       | Запуск Vite dev-сервера с HMR. Читает настройки из `.env.local`. |
| `npm run serve:api` | Поднимает локальный REST-мок на [json-server](https://github.com/typicode/json-server), порт 3000, данные из [`db.json`](db.json). |
| `npm run dev:all`   | Одновременный запуск `serve:api` и `dev` через `concurrently`. |
| `npm run build`     | Production-сборка в `dist/`. |
| `npm run preview`   | Локальный предпросмотр production-сборки (SPA-режим, порт 4173). |
| `npm run typecheck` | Проверка типов TypeScript (`vue-tsc`). |
| `npm run lint`      | ESLint-проверка кода. (`npm run lint:fix` — авто-фиксы) |
| `npm run format`    | Проверка форматирования Prettier. (`npm run format:fix` — авто-правка) |
| `npm run prepare`   | Включает Husky hooks для pre-commit. |

---

## Структура проекта и точки входа
- [`src/main.ts`](src/main.ts) — bootstrap приложения, подключает роутер и провайдеры (`@app`).  
- [`src/App.vue`](src/App.vue) — корневой компонент, layout и глобальные слои.  
- [`src/router/index.ts`](src/router/index.ts) — маршруты, guard'ы.  
- [`src/stores`](src/stores) — Pinia-хранилища (`auth`, `counter`).  
- [`src/pages`](src/pages) — страницы-оркестраторы (например, [`ObjectTypesPage.vue`](src/pages/nsi/ObjectTypesPage.vue)).  
- [`src/features`](src/features), [`src/entities`](src/entities), [`src/shared`](src/shared) — слои по FSD. Подробности в [docs/STRUCTURE.md](docs/STRUCTURE.md).  
- Глобальные стили: [`src/assets/main.css`](src/assets/main.css), [`src/assets/styles/service360.css`](src/assets/styles/service360.css), токены — `src/shared/styles/`.  
- Конфиг Vite (алиасы, прокси): [`vite.config.ts`](vite.config.ts).  
- HTTP- и RPC-клиенты: [`httpClient.ts`](src/shared/api/httpClient.ts), [`rpcClient.ts`](src/shared/api/rpcClient.ts), [`auth.ts`](src/shared/api/auth.ts).  

---

## Переменные окружения

Формат `.env.local` / `.env.production`.  
Загружаются через `import.meta.env` (см. [`env.d.ts`](env.d.ts)).  
Слэши нормализуются в [`httpClient.ts`](src/shared/api/httpClient.ts).

| Переменная             | Назначение | Правила |
|-------------------------|------------|---------|
| `VITE_API_BASE`         | Базовый URL REST API (абсолютный или относительный). | Без завершающего `/`. Относительные начинаются с `/`. |
| `VITE_API_DEV_PROXY_BASE` | Префикс для dev-прокси Vite. | Относительный, с ведущим `/`, без завершающего. Обычно `/api`. |
| `VITE_RPC_PATH`         | Относительный путь к RPC-эндпоинту. | Всегда начинается с `/`. Чаще `/api`. |
| `VITE_AUTH_LOGIN_PATH`  | Endpoint логина (используется в [`auth.ts`](src/shared/api/auth.ts)). | Всегда начинается с `/`. |

### Примеры `.env.local`

**1) Бэкенд на том же домене под `/api`:**
```ini
VITE_API_BASE=/api
VITE_API_DEV_PROXY_BASE=/api
VITE_RPC_PATH=/api
VITE_AUTH_LOGIN_PATH=/auth/login
```

**2) Стенд `https://example.com/dtj/ind`, REST под `.../dtj/ind/api`:**
```ini
VITE_API_BASE=https://example.com/dtj/ind
VITE_API_DEV_PROXY_BASE=/api
VITE_RPC_PATH=/api
VITE_AUTH_LOGIN_PATH=/dtj/ind/auth/login
# если логин внутри API:
# VITE_AUTH_LOGIN_PATH=/dtj/ind/api/auth/login
```

⚠️ Избегайте двойных `//` и завершающих `/`.

---

## Dev-прокси и fallback

- В dev Vite-прокси настраивается в [`vite.config.ts`](vite.config.ts) функцией `createProxyConfig`.  
- Запросы на `VITE_API_DEV_PROXY_BASE` (по умолчанию `/api`) переписываются на `VITE_API_BASE`.  
- В старых версиях был жёсткий fallback на `http://45.8.116.32/dtj/ind/api` — рекомендуется удалить или закомментировать, чтобы не ходить на внешний сервер случайно.  

---

## Как добавить новую страницу или фичу

1. Определи слой: страница (`pages`), фича (`features`), сущность (`entities`).  
2. Создай структуру: `model/`, `api/`, `ui/`, `index.ts`.  
3. Используй общий клиент: `@shared/api/httpClient` или `@shared/api/rpcClient`.  
4. Зарегистрируй маршрут в [`router/index.ts`](src/router/index.ts).  
5. Для глобального состояния используй Pinia (`stores`), для локального — Vue Query или внутренние стойки фич.  
6. Стили: глобальные в `assets/styles` или `shared/styles`, локальные — в `<style scoped>`.

---

## Справочник параметров обслуживаемых объектов

- Страница `/nsi/object-parameters` отображает список параметров с поиском, пагинацией и сортировкой по наименованию и единице измерения.
- Операции создания, редактирования и удаления пока выступают заглушками: при нажатии выводятся информационные сообщения, а реальные запросы к API будут добавлены позднее.

---

## Деплой

### Vercel
1. `npm run build` (сборка).  
2. В Settings → Environment Variables укажи:  
   - `VITE_API_BASE`  
   - `VITE_RPC_PATH`  
   - `VITE_AUTH_LOGIN_PATH`  
   - (опц.) `VITE_API_DEV_PROXY_BASE`  
3. Build Command: `npm run build`, Output: `dist`.  
4. SPA rewrite настраивается через `vercel.json`.  

### NGINX / другой статический сервер
1. `npm ci && npm run build`.  
2. Скопируй `dist/` на сервер.  
3. Конфиг:
   ```nginx
   server {
     listen 80;
     server_name myapp.example.com;
     root /var/www/nsi-frontend-vue/dist;
     index index.html;

     location / {
       try_files $uri /index.html;
     }

    location /api/ {
      proxy_pass https://backend.example.com/dtj/ind/api/;
       proxy_set_header Host $host;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
     }
   }
   ```
4. Все `VITE_*` переменные должны быть заданы при сборке (`.env.production` или ENV).  

---

## Troubleshooting

Смотри [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md).  
Типовые ошибки:
- **404/405** — не совпали `VITE_API_BASE` и прокси-префиксы.  
- **CORS** — неверный origin или отключён proxy.  
- **RPC** — уточни `VITE_RPC_PATH`.  
- **Логин** — путь в `VITE_AUTH_LOGIN_PATH` не совпадает с API.  
