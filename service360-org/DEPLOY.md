# Инструкция по развертыванию проекта

## Конфигурация окружений

Проект настроен для работы в двух режимах:

### 1. Development (Разработка)
Используется файл `.env`

```bash
npm run dev
```

Запустится dev-сервер на `http://localhost:3000`
- Vite proxy перенаправляет запросы на локальные API эндпоинты
- Используются локальные адреса `192.168.1.20:9177-9186`

### 2. Production (Продакшн)
Используется файл `.env.production`

```bash
npm run build
```

Создаст папку `dist` готовую для развертывания
- Приложение будет доступно по пути `/dtj/org/`
- Все API запросы идут на продакшн сервер `45.8.116.32`
- Все ассеты (JS, CSS) загружаются с префиксом `/dtj/org/`

## Важные изменения для продакшена

### 1. Base Path
В [vite.config.js](vite.config.js#L18) установлен:
```javascript
base: '/dtj/org/'
```
Это критично для работы приложения на сервере!

### 2. Router
В [src/app/router/index.js](src/app/router/index.js#L55) настроен:
```javascript
history: createWebHistory('/dtj/org/')
```

### 3. API Endpoints
Все эндпоинты в auth.js используют короткие пути:
- `/auth/login` вместо `/dtj/org/auth/login`
- `/userapi` вместо `/dtj/org/userapi`
- `/userinfo` вместо `/dtj/org/userinfo`

Nginx на продакшене автоматически добавит префикс `/dtj/org/`

## Развертывание на сервере

1. Собрать проект:
```bash
npm run build
```

2. Загрузить содержимое папки `dist` на сервер в директорию:
```
/var/www/html/dtj/org/
```

3. Nginx должен быть настроен на раздачу статики из этой директории и проксирование API запросов

## Структура файлов окружения

```
.env                # Development (локальная разработка)
.env.production     # Production (сборка для продакшена)
```

## Переменные окружения

### Development (.env)
- `VITE_LOCAL_HOST` - хост для локальных API (192.168.1.20)
- `VITE_*_URL` - URL к микросервисам с портами

### Production (.env.production)
- `VITE_*_URL` - URL к продакшн API через Nginx (без портов)

## Проверка перед деплоем

1. Убедитесь, что все изменения закоммичены
2. Запустите сборку: `npm run build`
3. Проверьте, что в `dist/index.html` все пути начинаются с `/dtj/org/`
4. Проверьте, что папка `dist/assets` содержит JS и CSS файлы

## Nginx конфигурация (пример)

```nginx
location /dtj/org {
    alias C:/dtj/web/org;
    try_files $uri $uri/ /dtj/org/index.html;

    # Debug headers
    add_header X-Debug-Location "dtj_org_frontend" always;
    add_header X-Debug-Request-URI $request_uri always;
}

location /dtj/api/ {
    proxy_pass http://backend_server;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```
