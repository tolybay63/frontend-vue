/** Файл: src/features/object-parameter-crud/model/useObjectParameterMutations.ts
 *  Назначение: vue-query мутации создания, обновления и удаления параметров обслуживаемых объектов.
 *  Использование: подключайте хук в формах для выполнения операций и инвалидации кэша справочника.
 */
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import {
  createParameter,
  deleteParameter,
  linkParameterToComponent,
  updateParameter,
  type CreateParameterPayload,
  type DeleteParameterPayload,
  type LinkParameterToComponentPayload,
  type UpdateParameterPayload,
} from '@entities/object-parameter'

export type CreateObjectParameterPayload = CreateParameterPayload
export type UpdateObjectParameterPayload = UpdateParameterPayload
export type LinkObjectParameterPayload = LinkParameterToComponentPayload

export type RemoveObjectParameterPayload = DeleteParameterPayload

export function useObjectParameterMutations() {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: ['object-parameters'] })

  const create = useMutation({
    mutationFn: (payload: CreateObjectParameterPayload) => createParameter(payload),
    onSuccess: () => invalidate(),
  })

  const link = useMutation({
    mutationFn: (payload: LinkObjectParameterPayload) => linkParameterToComponent(payload),
    onSuccess: () => invalidate(),
  })

  const update = useMutation({
    mutationFn: (payload: UpdateObjectParameterPayload) => updateParameter(payload),
    onSuccess: () => invalidate(),
  })

  const remove = useMutation({
    mutationFn: (payload: RemoveObjectParameterPayload) => deleteParameter(payload),
    onSuccess: () => invalidate(),
  })

  return { create, link, update, remove }
}
