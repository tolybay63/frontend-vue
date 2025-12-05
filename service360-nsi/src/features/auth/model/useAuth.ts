/** Файл: src/features/auth/model/useAuth.ts
 *  Назначение: фасад авторизации поверх Pinia-стора.
 *  Использование: подключайте в компонентах через useAuth() и работайте только с фичей.
 */
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import type { AuthFacade, LoginCredentials } from './types'

export function useAuth(): AuthFacade {
  const store = useAuthStore()
  const { isAuthenticated, isAuthenticating, user, error } = storeToRefs(store)

  const login = async (credentials: LoginCredentials) => await store.login(credentials)
  const logout = async () => await store.logout()
  const fetchMe = async () => await store.fetchMe()

  return {
    isAuthenticated,
    isAuthenticating,
    user,
    error,
    login,
    logout,
    fetchMe,
    clearError: () => store.clearError(),
    setRedirectPath: (path: string | null) => store.setRedirectPath(path),
    consumeRedirectPath: () => store.consumeRedirectPath(),
    can: (permission: string) => store.can(permission),
    canAny: (list: string[]) => store.canAny(list),
  }
}
