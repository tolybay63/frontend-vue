import { useMutation, useQueryClient } from '@tanstack/vue-query'
import {
  createSource,
  deleteSource,
  saveSourceDepartments,
  updateSource,
  type SaveSourceCollectionInsPayload,
  type SaveSourceCollectionUpdPayload,
} from '@entities/source'
import { sourceQueryKeys } from './sourceQueryKeys'

export function useSourceMutations() {
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: (payload: SaveSourceCollectionInsPayload) => createSource(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: sourceQueryKeys.all })
    },
  })

  const updateMutation = useMutation({
    mutationFn: (payload: SaveSourceCollectionUpdPayload) => updateSource(payload),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: sourceQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: sourceQueryKeys.details(variables.id) }),
      ])
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteSource(id),
    onSuccess: async (_, id) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: sourceQueryKeys.all }),
        queryClient.removeQueries({ queryKey: sourceQueryKeys.details(id), exact: true }),
      ])
    },
  })

  const saveDepartmentsMutation = useMutation({
    mutationFn: ({ id, ids }: { id: number; ids: number[] }) => saveSourceDepartments(id, ids),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: sourceQueryKeys.details(variables.id) })
    },
  })

  return {
    createMutation,
    updateMutation,
    deleteMutation,
    saveDepartmentsMutation,
  }
}
