import { useQuery } from '@tanstack/vue-query'
import { fetchNsiCoverage } from '@entities/nsi-dashboard'
import { nsiDashboardQueryKeys } from './queryKeys'

export function useNsiCoverageQuery() {
  return useQuery({ queryKey: nsiDashboardQueryKeys.coverage, queryFn: fetchNsiCoverage })
}
