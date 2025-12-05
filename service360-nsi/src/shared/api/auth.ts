/** Файл: src/shared/api/auth.ts
 *  Назначение: функции аутентификации пользователя на REST-endpoint бекенда.
 *  Использование: импортируйте login() для выполнения входа по логину и паролю.
 */
import { postForm } from './httpClient'

export interface LoginCredentials {
  username: string
  password: string
}

export async function login(credentials: LoginCredentials): Promise<{ ok: true }> {
  const body = new URLSearchParams()
  body.set('username', credentials.username)
  body.set('password', credentials.password)

  const data = await postForm<string>(
    import.meta.env.VITE_AUTH_LOGIN_PATH || '/auth/login',
    body,
  )

  const text = (typeof data === 'string' ? data : '').trim().toLowerCase()
  if (text !== 'ok') throw new Error(text || '?? ??????? ????????? ????')
  return { ok: true }
}
