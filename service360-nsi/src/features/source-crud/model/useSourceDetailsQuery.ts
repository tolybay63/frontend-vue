import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { fetchSourceDetails } from '@entities/source'
import { sourceQueryKeys } from './sourceQueryKeys'

export function useSourceDetailsQuery(sourceId: MaybeRefOrGetter<number | null | undefined>) {
  return useQuery({
    queryKey: computed(() => sourceQueryKeys.details(toValue(sourceId) ?? null)),
    queryFn: () => fetchSourceDetails(Number(toValue(sourceId) ?? 0)),
    enabled: () => Boolean(toValue(sourceId)),
  })
}
