import axios from 'axios';
import { isMutation } from './rpcClassifier';
import { enqueueRequest } from './syncQueue';

const API_URLS = [
  import.meta.env.VITE_REPAIR_URL,
  import.meta.env.VITE_OBJECT_URL,
  import.meta.env.VITE_NSI_URL,
  import.meta.env.VITE_INSPECTIONS_URL,
  import.meta.env.VITE_PLAN_URL,
  import.meta.env.VITE_INCIDENTS_URL,
  import.meta.env.VITE_RESOURCE_URL,
  import.meta.env.VITE_PERSONAL_URL,
  import.meta.env.VITE_LOCATION_URL,
].filter(Boolean);

function isApiUrl(url) {
  return API_URLS.some(base => url?.startsWith(base) || url === base);
}

export function setupOfflineInterceptor() {
  axios.interceptors.request.use(async (config) => {
    // Только POST-запросы к нашим API
    if (config.method !== 'post' || !isApiUrl(config.url)) {
      return config;
    }

    // Пропускаем replay-запросы (избегаем бесконечного цикла)
    if (config.headers?.['X-Offline-Sync'] === 'true') {
      return config;
    }

    const rpcMethod = config.data?.method;
    if (!rpcMethod) return config;

    // Если офлайн и это мутация — ставим в очередь
    if (!navigator.onLine && isMutation(rpcMethod)) {
      const queueId = await enqueueRequest(
        config.url,
        rpcMethod,
        config.data.params
      );

      // Возвращаем ошибку с маркером для response interceptor
      return Promise.reject({
        __offlineQueued: true,
        queueId,
        config,
      });
    }

    return config;
  });

  // Response interceptor — перехватываем queued-ошибки
  axios.interceptors.response.use(
    response => response,
    error => {
      if (error?.__offlineQueued) {
        // Возвращаем синтетический успешный ответ
        return {
          data: {
            result: {
              __offline: true,
              queueId: error.queueId,
              message: 'Запрос сохранен для отправки при восстановлении связи',
            },
          },
          status: 200,
          statusText: 'Queued Offline',
        };
      }
      return Promise.reject(error);
    }
  );
}
