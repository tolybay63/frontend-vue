import { useMutation } from '@tanstack/vue-query'
import { searchNsi, type NsiSearchResult } from '@entities/nsi-dashboard'

export function useNsiSearch() {
  return useMutation<NsiSearchResult[], Error, string>({
    mutationFn: (query: string) => searchNsi(query),
  })
}
