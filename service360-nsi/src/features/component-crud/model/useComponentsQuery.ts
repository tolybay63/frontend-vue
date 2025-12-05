/** Файл: src/features/component-crud/model/useComponentsQuery.ts
 *  Назначение: обёртка vue-query для загрузки снимка компонентов.
 *  Использование: вызывайте хук на страницах для получения ComponentsSnapshot.
 */
import { useQuery } from '@tanstack/vue-query'
import { fetchComponentsSnapshot } from '@entities/component'

export function useComponentsQuery() {
  return useQuery({ queryKey: ['components'], queryFn: fetchComponentsSnapshot })
}
