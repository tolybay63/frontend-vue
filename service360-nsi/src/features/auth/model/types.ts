/** Файл: src/features/auth/model/types.ts
 *  Назначение: типы фасада авторизации для переиспользования в страницах и макетах.
 *  Использование: импортируйте LoginCredentials/AuthFacade из @features/auth.
 */
import type { Ref } from 'vue'
import type { LoginCredentials as AuthLoginCredentials } from '@shared/api'
import type { CurUser } from '@shared/api'

export type LoginCredentials = AuthLoginCredentials

export interface AuthStateRefs {
  isAuthenticated: Readonly<Ref<boolean>>
  isAuthenticating: Readonly<Ref<boolean>>
  user: Readonly<Ref<CurUser | null>>
  error: Readonly<Ref<string | null>>
}

export interface AuthFacade extends AuthStateRefs {
  login(credentials: LoginCredentials): Promise<{ ok: true }>
  logout(): Promise<void> | void
  fetchMe(): Promise<void>
  clearError(): void
  setRedirectPath(path: string | null): void
  consumeRedirectPath(): string | null
  can(permission: string): boolean
  canAny(list: string[]): boolean
}
