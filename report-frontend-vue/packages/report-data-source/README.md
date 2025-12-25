# @company/report-data-source

Клиент для загрузки данных отчётных представлений с поддержкой удалённых источников и джоинов.

## Использование

```js
import { createRemoteDataSourceClient } from '@company/report-data-source'
import fetch from 'node-fetch'

const client = createRemoteDataSourceClient({
  requestData: (request) => fetch(request.url, { method: request.method, headers: request.headers, body: JSON.stringify(request.body) }).then((res) => res.json()),
  loadSources: () => myRepository.listSources(),
  fetchJoinPayload: (payload) => fetch(payload.url, { method: payload.method, headers: payload.headers, body: JSON.stringify(payload.body) }).then((res) => res.json()),
})

const records = await client.fetchRemoteRecords(template.remoteSource)
```

Функция `createRemoteDataSourceClient` возвращает методы:

- `fetchRemoteRecords(source, options)` — получить записи с применением джоинов.
- `clearCache()` — очистить кеш запросов.
- `preloadRemoteSources()` — загрузить справочник удалённых источников, используемый джоинами.

Все зависимости (HTTP-клиент, загрузка источников, получение джоинов) передаются через параметры, поэтому пакет можно использовать и на фронтенде, и на бэкенде.***
