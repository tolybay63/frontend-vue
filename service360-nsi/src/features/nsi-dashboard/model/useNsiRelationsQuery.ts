import { useQuery } from '@tanstack/vue-query'
import { fetchNsiRelationsCounts } from '@entities/nsi-dashboard'
import { nsiDashboardQueryKeys } from './queryKeys'

export function useNsiRelationsQuery() {
  return useQuery({ queryKey: nsiDashboardQueryKeys.relations, queryFn: fetchNsiRelationsCounts })
}
