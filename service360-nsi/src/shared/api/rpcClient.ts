/** Файл: src/shared/api/rpcClient.ts
 *  Назначение: единая точка вызова RPC-методов поверх httpClient.
 *  Использование: репозитории сущностей импортируют rpc() и вызывают методы бэкенда.
 *  Плюсы: общий клиент (интерсепторы, заголовки, базовый URL), отсутствие дублирования axios-кода.
 */
import { api, rpcPath } from './httpClient'

interface RpcPayload<TParams> {
  method: string
  params?: TParams
}

type RpcError = { message?: string } | string | null | undefined

type RpcEnvelope<TResult> =
  | { result: TResult; error?: undefined }
  | { result?: undefined; error: RpcError }
  | TResult

export async function rpc<T = unknown, TParams = unknown>(
  method: string,
  params?: TParams,
): Promise<T> {
  const payload: RpcPayload<TParams> = { method, params }
  const { data } = await api.post<RpcEnvelope<T>>(rpcPath, payload)

  if (data && typeof data === 'object') {
    if ('error' in data && data.error) {
      const message =
        typeof data.error === 'string'
          ? data.error
          : (data.error?.message ?? `RPC ${method} failed`)
      throw new Error(message)
    }

    if ('result' in data) {
      return (data.result ?? undefined) as T
    }
  }

  return data as T
}
