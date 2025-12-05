/** Файл: src/shared/api/user.ts
 *  Назначение: обёртки приложенческого уровня над RPC-клиентом для общих сценариев.
 *  Использование: импортируйте функции из этого модуля для получения текущего пользователя и др.
 */
import { rpc } from './rpcClient'

export type CurUser = {
  id: number | string
  login: string
  fullname?: string
  target?: string
  [k: string]: unknown
}

function isCurUser(value: unknown): value is CurUser {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  const { id, login } = record
  const hasValidId = typeof id === 'string' || typeof id === 'number'
  const hasValidLogin = typeof login === 'string' && login.length > 0
  return hasValidId && hasValidLogin
}

export async function getCurUserInfo(): Promise<CurUser> {
  const data = await rpc<CurUser | { result?: CurUser }>('data/getCurUserInfo', [])
  if (isCurUser(data)) return data
  if (data && typeof data === 'object' && 'result' in data) {
    const result = (data as { result?: unknown }).result
    if (isCurUser(result)) return result
  }
  throw new Error('Invalid user payload')
}
