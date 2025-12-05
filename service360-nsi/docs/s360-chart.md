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

Виджет делает POST на /dtj-api. В vite.config.ts добавить прокси, который перенаправляет этот путь на http://45.8.116.32/dtj/api/inspections:

---

function createProxyConfig(env: Record<string, string>): Record<string, ProxyOptions> {
const proxies: Record<string, ProxyOptions> = {}

// KM-chart widget API (/dtj-api → http://45.8.116.32/dtj/api/inspections)
const kmChartProxyBase = normalizeProxyBase(env.VITE_KM_CHART_DEV_PROXY_BASE || '/dtj-api')
const rawKmChartBase = env.VITE_KM_CHART_API_BASE?.trim()

if (rawKmChartBase && ABSOLUTE_URL_PATTERN.test(rawKmChartBase)) {
try {
const kmChartURL = new URL(rawKmChartBase)
const target = `${kmChartURL.protocol}//${kmChartURL.host}`
const rewriteBase = normalizeRewriteBase(kmChartURL.pathname || '/dtj/api/inspections')
const pattern = new RegExp(`^${escapeForRegex(kmChartProxyBase)}`)

      proxies[kmChartProxyBase] = {
        target,
        changeOrigin: true,
        rewrite: (path) => path.replace(pattern, rewriteBase),
      }
    } catch {
      // Ignore
    }

}

if (!proxies[kmChartProxyBase]) {
const pattern = new RegExp(`^${escapeForRegex(kmChartProxyBase)}`)
proxies[kmChartProxyBase] = {
target: 'http://45.8.116.32',
changeOrigin: true,
rewrite: (path) => path.replace(pattern, '/dtj/api/inspections'),
}
}

return proxies
}

---

Если адрес или эндпоинт меняются, задай переменные:
.env.development: VITE_KM_CHART_DEV_PROXY_BASE=/dtj-api, VITE_KM_CHART_API_BASE=http://45.8.116.32/dtj/api/inspections.
После изменения конфигов перезапусти npm run dev.

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
