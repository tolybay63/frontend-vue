/** Файл: src/features/component-crud/model/useComponentMutations.ts
 *  Назначение: содержит мутации vue-query для CRUD операций с компонентами.
 *  Использование: подключайте хук на страницах для вызова create/update/delete.
 */
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import {
  createComponentEntry,
  updateComponentEntry,
  deleteComponentEntry,
  type CreateComponentPayload,
  type UpdateComponentPayload,
} from '@entities/component'

export function useComponentMutations() {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: ['components'] })

  const create = useMutation({
    mutationFn: (payload: CreateComponentPayload) => createComponentEntry(payload),
    // Invalidate explicitly after relations sync on the page to avoid double refresh here
    onSuccess: () => {},
  })

  const update = useMutation({
    mutationFn: (payload: UpdateComponentPayload) => updateComponentEntry(payload),
    onSuccess: () => invalidate(),
  })

  const remove = useMutation({
    mutationFn: (id: number | string) => deleteComponentEntry(id),
    onSuccess: () => invalidate(),
  })

  return { create, update, remove }
}
