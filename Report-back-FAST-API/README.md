Report-back-FAST-API

Backend сервис отчётов (FastAPI, Docker-дистрибутив)

Назначение

Сервис предоставляет backend для отчётного модуля.
Разворачивается отдельно от существующего backend и подключается через Nginx.

Рекомендуемый маршрут в Nginx:
/api/report-fast

Состав дистрибутива

report-back-fast-api_1.0.0.tar — Docker-образ сервиса

.env.example — шаблон переменных окружения

(опционально) README.md — эта инструкция

Требования

Docker (Docker Engine / Docker Desktop)

Nginx (для проксирования, если используется)

Установка и запуск

1. Загрузить Docker-образ
   docker load -i report-back-fast-api_1.0.0.tar

Проверка:

docker images | grep report-back-fast-api

2. Подготовить переменные окружения

Скопировать шаблон и заполнить значения:

cp .env.example .env

Пример .env:

SERVICE360_BASE_URL=http://45.8.116.32
REPORT_FILTERS_MAX_VALUES=200
REPORT_FILTERS_CACHE_TTL=30
REPORT_FILTERS_CACHE_MAX=20
REPORT_DEBUG_FILTERS=0
REPORT_DEBUG_JOINS=0

3. Запустить контейнер
   docker rm -f report-back-fast-api 2>/dev/null || true

docker run -d \
 --name report-back-fast-api \
 -p 127.0.0.1:8001:8000 \
 --env-file .env \
 report-back-fast-api:1.0.0

Пояснения:

контейнер слушает порт 8000

наружу проброшен на 127.0.0.1:8001

сервис доступен только локально (через Nginx)

4. Проверка работы сервиса
   docker ps
   docker logs --tail 100 report-back-fast-api
   curl -I http://127.0.0.1:8001/docs

Ожидаемый результат:

контейнер в статусе Up

/docs отвечает (HTTP 200)

Swagger UI:

http://127.0.0.1:8001/docs

Подключение через Nginx

Рекомендуемый конфиг:

location /api/report-fast/ {
proxy_pass http://127.0.0.1:8001/;
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
}

Использование во фронте

Во фронтенде используются два backend:

VITE_REPORT_API_BASE=/dtj/api/report
VITE_REPORT_BACKEND_URL=/api/report-fast

/dtj/api/report — существующий backend

/api/report-fast — новый FastAPI backend

Обслуживание

Остановить контейнер:

docker stop report-back-fast-api

Перезапустить:

docker start report-back-fast-api

Удалить контейнер:

docker rm report-back-fast-api

Логи:

docker logs -f report-back-fast-api

Примечания

Docker-образ не содержит .env — переменные передаются только при запуске

Образ версионируется тегами (1.0.0, 1.0.1, …)

Сервис не конфликтует с текущим backend

Запуск через docker-compose (рекомендуется)
docker load -i report-back-fast-api_1.0.0.tar
docker compose up -d

Остановка:

docker compose down

Логи:

docker compose logs -f

3️⃣ Проверка у тебя локально (по желанию)
docker rm -f report-back-fast-api 2>/dev/null || true
docker compose up -d
docker compose logs -f

Swagger:

http://localhost:8001/docs
===================================
Деплой без Докера:
1. Выполнить команды:
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m pip install pyinstaller
python -m PyInstaller --onefile --name report-fast --clean --paths . run_server.py

2. Запустить файл
.\dist\report-fast.exe

