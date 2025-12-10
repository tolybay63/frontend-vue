Инструкция по интеграции s360-km-chart

1. Копирование бандла
   Получить папку dist.
   Скопируй содержимое dist в целевой проект в public/vendor/km-chart/dist.

2. Подключение скрипта
   В целевом Vite‑приложении добавь скрипт в корневой HTML. В index.html нужно поставить <script type="module" src="/vendor/km-chart/dist/index.es.js"></script> — убедись, что эта строка присутствует (ставить её нужно внутри <head> до монтирования приложения).

3. Типы для Vue
   Чтобы <s360-km-chart> не ругался в TypeScript, заведи файл src/types/km-chart.d.ts и опиши тег в JSX/HTMLElement:

---

declare namespace JSX {
interface IntrinsicElements {
's360-km-chart': Record<string, unknown>
}
}

declare global {
interface HTMLElementTagNameMap {
's360-km-chart': HTMLElement
}
}
export {}

---

(файл уже есть; скопируй его).

4. Настройка API-прокси для dev

Виджет делает POST на `/dtj-api`. Конфиг Vite уже умеет проксировать его на настоящий бекенд через `VITE_PROXY_TARGET`. Просто задай переменные в `.env.development`:

```
VITE_KM_CHART_DEV_PROXY_BASE=/dtj-api
VITE_KM_CHART_API_BASE=/dtj/api/inspections
VITE_PROXY_TARGET=http://<ip или домен стенда>
```

После изменения конфигов перезапусти `npm run dev`. В продакшене запрос уйдёт по относительному пути `/dtj/api/inspections`.

5. Использование в компоненте

Вставь тег в шаблон на своей странице

<section class="поставь тот который используешь на этой странице">
      <s360-km-chart-panel
        relobj="2525"
        thresholds="25,80,180"
        y="0,500"
        x="0,151"
        legend
        bandsopacity="0.15"
      >
      </s360-km-chart-panel>
    </section>

class можешь использовать свой

6. Smoke‑тест

Запусти npm run dev.
Открой страницу с виджетом → DevTools → Network. Убедись, что запрос POST /dtj-api возвращает 200.
Проверь визуально: график рендерится, тултипы/drag/zoom работают, стили подхватываются.
Если планируешь вставить в другой проект без Vite:

Скопируй dist.
Добавь <script src="/vendor/km-chart/dist/index.umd.js"></script> в HTML.
Вставь <s360-km-chart> и настрой атрибуты аналогично.
Готово: придерживаясь этих шагов, ты безболезненно подключишь виджет в любой сборке.
