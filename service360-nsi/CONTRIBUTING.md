# CONTRIBUTING.md

Добро пожаловать в **nsi-frontend-vue**! Этот документ описывает, как мы работаем с ветками, коммитами, PR и качеством кода.

## 1) Быстрый старт для контрибьютора
1. Форк/клонирование репозитория.
2. Создай `.env.local` на основе `.env.example` и запусти проект:
   ```bash
   npm install
   npm run dev        # фронтенд, порт 5173
   # по необходимости:
   npm run serve:api  # моки, порт 3000
   ```
3. Перед изменениями — изучи `docs/STRUCTURE.md` (слои, алиасы) и `README.md` (команды).

## 2) Git workflow
- Основные ветки: `main` (stable), `develop` (optional — если используется).
- Фича-ветки: `feature/<ticket-or-name>`
- Багфиксы: `fix/<issue-or-name>`
- Служебные задачи: `chore/<task>`
- Миграции/рефакторинги: `refactor/<name>`
- Пример: `chore/migrate-to-naive-ui`

Правила:
- Одна задача — одна ветка — один PR.
- Не коммить напрямую в `main`.

## 3) Коммиты (Conventional Commits)
Формат:
```
<type>(optional scope): <short summary>

[optional body]
[optional footer(s)]
```
Типы:
- `feat:` — новая функциональность
- `fix:` — исправление
- `refactor:` — рефакторинг без изменения поведения
- `chore:` — инфраструктура, настройки, обновления зависимостей
- `docs:` — документация
- `test:` — тесты
- `perf:` — производительность
- `build:` — сборка/CI
- `style:` — формат/линт без логики

Примеры:
```
feat(object-types): add filtering by component
fix(auth): handle empty response from /auth/login
chore: add .env.example and update README
```

## 4) Код-стайл и качество
- TypeScript: `npm run typecheck`
- ESLint: `npm run lint` / `npm run lint:fix`
- Prettier: `npm run format` / `npm run format:fix`
- Перед коммитом срабатывает Husky + lint-staged (автофиксы для staged-файлов).

Общие правила:
- Алиасы: см. `docs/STRUCTURE.md`. Не нарушать FSD-иерархию (импорты только вниз).
- Именование — `kebab-case` для файлов/папок, `PascalCase` для компонентов.
- Barrel-файлы `index.ts` в публичных пакетах слоёв.
- HTTP/RPC — только через общий клиент `@shared/api`.

## 5) PR-процесс
1. Обнови свою ветку от `main` (rebase/merge).
2. Убедись, что проходят проверки:
   ```bash
   npm run typecheck && npm run lint && npm run format
   npm run build
   ```
3. Открой PR в `main` (или `develop`, если используется):
   - Заполни чек-лист из шаблона.
   - Приложи скриншоты/видео UI (если менялся интерфейс).
   - Опиши, как проверять (шаги, окружение, тестовые данные).
4. Жди ревью (минимум 1 одобрение). Исправь замечания и обнови PR.

## 6) Чек-лист перед PR
- [ ] Нет «мусорных» логов/console.debug/закомментированного кода.
- [ ] Типы/линты/форматирование пройдены.
- [ ] Обновлены `.env.example`/доки при изменении окружения.
- [ ] Нет нарушений импортов (FSD), алиасы корректны.
- [ ] UI проверен в dev и preview, API-урлы верны.
- [ ] Есть юнит-тесты (если добавлялась логика) или мануальная проверка.

## 7) Release / теги (опционально)
- Используем семантическое версионирование: `vX.Y.Z`.
- Ченджлог формируется из Conventional Commits (если подключён releaser).

## 8) Работа с задачами/issue-ми
- Названия кратко и по делу: **что** и **зачем**.
- Метки: `bug`, `feature`, `docs`, `refactor`, `infra`.
- Свяжи PR с issue: `Closes #123`.

## 9) Подсказки по окружению
- Правила слэшей:
  - `VITE_API_BASE` — **без** завершающего `/`.
  - `VITE_RPC_PATH`, `VITE_AUTH_LOGIN_PATH`, `VITE_API_DEV_PROXY_BASE` — **с ведущим** `/`.
- В dev запросы идут через Vite proxy, в prod — на `VITE_API_BASE` напрямую.
- Подробнее: `README.md` и `docs/TROUBLESHOOTING.md`.
