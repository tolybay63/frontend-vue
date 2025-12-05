import { useQuery } from '@tanstack/vue-query'
import { fetchSources } from '@entities/source'
import { sourceQueryKeys } from './sourceQueryKeys'

export function useSourcesQuery() {
  return useQuery({ queryKey: sourceQueryKeys.all, queryFn: fetchSources })
}
