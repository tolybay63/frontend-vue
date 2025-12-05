/** Файл: src/composables/useCrud.ts
 *  Назначение: универсальные CRUD-хуки поверх REST-интерфейсов.
 *  Использование: создавайте экземпляр с ключом и базовым путем, чтобы получить list/create/update/remove.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { get, post, put, del } from '@shared/api'

type ID = string | number

export interface CrudOptions<TList = unknown, TItem = unknown> {
  key: readonly unknown[]
  basePath: string
  mapList?: (data: unknown) => TList[]
  mapItem?: (data: unknown) => TItem
}

function ensureArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

export function useCrud<TList = unknown, TItem = unknown>(opts: CrudOptions<TList, TItem>) {
  const qc = useQueryClient()
  const list = useQuery({
    queryKey: opts.key,
    queryFn: async () => {
      const data = await get<unknown>(opts.basePath)
      if (opts.mapList) return opts.mapList(data)
      return ensureArray<TList>(data)
    },
  })

  const create = useMutation({
    mutationFn: async (payload: Partial<TItem>) => {
      return await post<TItem, Partial<TItem>>(opts.basePath, payload)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: opts.key }),
  })

  const update = useMutation({
    mutationFn: async ({ id, payload }: { id: ID; payload: Partial<TItem> }) => {
      return await put<TItem, Partial<TItem>>(`${opts.basePath}/${id}`, payload)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: opts.key }),
  })

  const remove = useMutation({
    mutationFn: async (id: ID) => {
      return await del<unknown>(`${opts.basePath}/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: opts.key }),
  })

  return { list, create, update, remove }
}
