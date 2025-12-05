/** Файл: src/features/object-defect-crud/model/useObjectDefectsQuery.ts
 *  Назначение: Определяет vue-query запрос для получения снимка дефектов объекта.
 *  Использование: Вызывайте хук в компонентах для загрузки актуального списка дефектов.
 */
import { useQuery } from '@tanstack/vue-query'
import { fetchObjectDefectsSnapshot } from '@entities/object-defect'

export function useObjectDefectsQuery() {
  return useQuery({ queryKey: ['object-defects'], queryFn: fetchObjectDefectsSnapshot })
}
