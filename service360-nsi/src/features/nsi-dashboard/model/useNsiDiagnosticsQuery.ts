import { useQuery } from '@tanstack/vue-query'
import { fetchNsiDiagnostics } from '@entities/nsi-dashboard'
import { nsiDashboardQueryKeys } from './queryKeys'

export function useNsiDiagnosticsQuery() {
  return useQuery({ queryKey: nsiDashboardQueryKeys.diagnostics, queryFn: fetchNsiDiagnostics })
}
