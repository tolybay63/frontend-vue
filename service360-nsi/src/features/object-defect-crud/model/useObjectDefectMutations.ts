/** Файл: src/features/object-defect-crud/model/useObjectDefectMutations.ts
 *  Назначение: Настраивает vue-query мутации для создания, обновления и удаления дефектов объекта.
 *  Использование: Подключайте хук в компонентах для управления дефектами и инвалидации кэша.
 */
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import {
  createDefect,
  deleteDefect,
  updateDefect,
  type CreateObjectDefectPayload,
  type UpdateObjectDefectPayload,
  type ObjectDefectsSnapshot,
  type LoadedObjectDefect,
} from '@entities/object-defect'

export interface RemoveObjectDefectPayload {
  id: string | number
}

export function useObjectDefectMutations() {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: ['object-defects'] })

  const create = useMutation({
    mutationFn: (payload: CreateObjectDefectPayload) => createDefect(payload),
    onSuccess: (created: LoadedObjectDefect) => {
      // Пытаемся обновить кеш без полного рефетча, чтобы не дёргать data/loadComponentDefect
      const prev = qc.getQueryData<ObjectDefectsSnapshot>(['object-defects'])
      if (prev) {
        const nextItems = [created, ...prev.items].sort((a, b) => a.name.localeCompare(b.name, 'ru'))
        qc.setQueryData<ObjectDefectsSnapshot>(['object-defects'], { ...prev, items: nextItems })
      } else {
        invalidate()
      }
    },
  })

  const update = useMutation({
    mutationFn: (payload: UpdateObjectDefectPayload) => updateDefect(payload),
    onSuccess: () => invalidate(),
  })

  const remove = useMutation({
    mutationFn: ({ id }: RemoveObjectDefectPayload) => deleteDefect(id),
    onSuccess: () => invalidate(),
  })

  return { create, update, remove }
}
