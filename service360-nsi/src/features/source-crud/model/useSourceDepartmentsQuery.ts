import { useQuery } from '@tanstack/vue-query'
import { fetchDepartments } from '@entities/source'
import { sourceQueryKeys } from './sourceQueryKeys'

export function useSourceDepartmentsQuery() {
  return useQuery({ queryKey: sourceQueryKeys.departments, queryFn: fetchDepartments })
}
