/** Файл: src/features/auth/index.ts
 *  Назначение: реэкспорт фасада авторизации и типов для внешних слоёв.
 *  Использование: импортируйте useAuth и типы через @features/auth.
 */
export { useAuth } from './model/useAuth'
export type { LoginCredentials, AuthFacade, AuthStateRefs } from './model/types'
