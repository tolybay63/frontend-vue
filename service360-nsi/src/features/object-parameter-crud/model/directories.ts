/** Файл: src/features/object-parameter-crud/model/directories.ts
 *  Назначение: вспомогательные утилиты для работы с директориями параметров обслуживаемых объектов.
 *  Использование: импортируйте генераторы lookup и сортировок в хуках и компонентах фичи.
 */
import type {
  DirectoryLookup,
  DirectoryOption,
  LoadedObjectParameter,
} from '@entities/object-parameter'

export function createDirectoryLookup<Option extends DirectoryOption>(
  options: Option[],
): DirectoryLookup<Option> {
  return options.reduce<DirectoryLookup<Option>>((acc, option) => {
    acc[String(option.id)] = option
    return acc
  }, {})
}

export function sortByNameRu<Option extends { name: string }>(options: Option[]): Option[] {
  return [...options].sort((a, b) => a.name.localeCompare(b.name, 'ru'))
}

export function sortParameters(
  items: LoadedObjectParameter[],
  options?: { sourceFirst?: boolean },
): LoadedObjectParameter[] {
  const sourceFirst = options?.sourceFirst ?? true
  const sorted = [...items]

  sorted.sort((a, b) => {
    if (sourceFirst) {
      const sourceA = a.sourceName ?? ''
      const sourceB = b.sourceName ?? ''
      const sourceCompare = sourceA.localeCompare(sourceB, 'ru')
      if (sourceCompare !== 0) return sourceCompare
    }

    return a.name.localeCompare(b.name, 'ru')
  })

  return sorted
}
