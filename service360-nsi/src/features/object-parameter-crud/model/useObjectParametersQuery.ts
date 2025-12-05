/** Файл: src/features/object-parameter-crud/model/useObjectParametersQuery.ts
 *  Назначение: vue-query запрос для загрузки и подготовки справочника параметров обслуживаемых объектов.
 *  Использование: подключайте хук на страницах/в виджетах, чтобы получать снапшот и лукапы директорий.
 */
import { useQuery } from '@tanstack/vue-query'
import { fetchObjectParametersSnapshot } from '@entities/object-parameter'
import type {
  DirectoryLookup,
  DirectoryOption,
  ObjectParametersSnapshot,
} from '@entities/object-parameter'
import { sortByNameRu, sortParameters } from './directories'

type UnitOption = DirectoryOption
type SourceOption = DirectoryOption

export interface ObjectParametersQueryData extends ObjectParametersSnapshot {
  unitOptions: UnitOption[]
  sourceOptions: SourceOption[]
  unitLookup: DirectoryLookup<UnitOption>
  sourceLookup: DirectoryLookup<SourceOption>
}

export function useObjectParametersQuery() {
  return useQuery({
    queryKey: ['object-parameters'],
    queryFn: fetchObjectParametersSnapshot,
    select: (snapshot): ObjectParametersQueryData => {
      const unitOptions = sortByNameRu(Object.values(snapshot.unitDirectory))
      const sourceOptions = sortByNameRu(Object.values(snapshot.sourceDirectory))

      return {
        items: sortParameters(snapshot.items),
        unitDirectory: snapshot.unitDirectory,
        sourceDirectory: snapshot.sourceDirectory,
        unitOptions,
        sourceOptions,
        unitLookup: snapshot.unitDirectory,
        sourceLookup: snapshot.sourceDirectory,
      }
    },
  })
}
