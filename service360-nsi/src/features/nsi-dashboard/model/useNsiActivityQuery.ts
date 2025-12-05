import { useQuery } from '@tanstack/vue-query'
import { fetchNsiActivity } from '@entities/nsi-dashboard'
import { nsiDashboardQueryKeys } from './queryKeys'

export function useNsiActivityQuery(limit = 7) {
  return useQuery({
    queryKey: nsiDashboardQueryKeys.activity(limit),
    queryFn: () => fetchNsiActivity(limit),
    // Keep feed fresh but avoid spamming backend/RPC
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}
