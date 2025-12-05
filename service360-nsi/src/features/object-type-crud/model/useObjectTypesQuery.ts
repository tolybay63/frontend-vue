/** Файл: features/object-type-crud/model/useObjectTypesQuery.ts
 *  Назначение: хук загрузки снапшота типов обслуживаемых объектов с геометрией и связями.
 *  Использование: вызывайте useObjectTypesQuery() на странице для получения ObjectTypesSnapshot.
 */
import { useQuery } from '@tanstack/vue-query'
import { fetchObjectTypesSnapshot } from '@entities/object-type'

export function useObjectTypesQuery() {
  return useQuery({ queryKey: ['object-types'], queryFn: fetchObjectTypesSnapshot })
}
