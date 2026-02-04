# Report Constructor (Vue + Vite)

Новый фронт «report-frontend-vue» на базе стилей NSI.

## Старт

```bash
npm install
npm run dev
```

Откройте `http://localhost:5173`.

## Прокси/CORS

- Цель бэка задаётся в `.env.development` (`VITE_PROXY_TARGET`).
- Все запросы на `/api/**` проксируются Vite на указанный бэкэнд.
- Базовый URL клиента: `VITE_API_BASE` (по умолчанию `/api`).

## Структура

- `src/app` — оболочка приложения и провайдеры.
- `src/layouts` — каркасы страниц.
- `src/pages` — роутовые страницы (Данные/Представления/О проекте).
- `src/shared` — общие стили, api-клиент, конфиги, утилиты.
- `src/shared/styles` — токены/база, скопированные из NSI.
- `src/shared/assets` — логотип бренда.

## Добавление источников отчётов

- Расширяйте форму на главной странице (`src/pages/HomePage.vue`) и/или добавляйте новые сущности в `src/features`/`src/entities`.
- Отправляйте запросы через `api` из `src/shared/api/http.js` на нужные эндпоинты `/api/...` (будут проксированы на бэк).

## Линт

```bash
npm run lint
```

Используются ESLint + Prettier (Vue 3).
