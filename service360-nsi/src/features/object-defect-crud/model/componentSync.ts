/** Файл: src/features/object-defect-crud/model/componentSync.ts
 *  Назначение: Содержит утилиты для построения справочников компонентов и категорий дефектов и расчёта удалённых связей.
 *  Использование: Используйте функции при синхронизации данных дефектов с выбором пользователя.
 */
import { normalizeText } from '@shared/lib'
import type {
  DefectCategoryOption,
  DefectComponentOption,
  LoadedObjectDefect,
} from '@entities/object-defect'

export interface DefectComponentLookup {
  byId: Map<string, DefectComponentOption>
  byName: Map<string, DefectComponentOption>
  usageById: Map<string, LoadedObjectDefect[]>
  usageByName: Map<string, LoadedObjectDefect[]>
}

export interface DefectCategoryLookup {
  byFvId: Map<string, DefectCategoryOption>
  byPvId: Map<string, DefectCategoryOption>
  byName: Map<string, DefectCategoryOption>
  usageByFvId: Map<string, LoadedObjectDefect[]>
  usageByPvId: Map<string, LoadedObjectDefect[]>
  usageByName: Map<string, LoadedObjectDefect[]>
}

export function createDefectComponentLookup(
  items: LoadedObjectDefect[],
  options: DefectComponentOption[],
): DefectComponentLookup {
  const byId = new Map<string, DefectComponentOption>()
  const byName = new Map<string, DefectComponentOption>()
  const usageById = new Map<string, LoadedObjectDefect[]>()
  const usageByName = new Map<string, LoadedObjectDefect[]>()

  for (const option of options) {
    const id = option.id
    const normalizedName = normalizeText(option.name)

    byId.set(id, option)
    if (normalizedName) byName.set(normalizedName, option)
  }

  for (const defect of items) {
    const componentId = defect.componentId
    if (componentId) {
      const current = usageById.get(componentId)
      if (current) {
        current.push(defect)
      } else {
        usageById.set(componentId, [defect])
      }
    }

    if (defect.componentName) {
      const nameKey = normalizeText(defect.componentName)
      if (nameKey) {
        const current = usageByName.get(nameKey)
        if (current) {
          current.push(defect)
        } else {
          usageByName.set(nameKey, [defect])
        }
      }
    }
  }

  return { byId, byName, usageById, usageByName }
}

export function createDefectCategoryLookup(
  items: LoadedObjectDefect[],
  options: DefectCategoryOption[],
): DefectCategoryLookup {
  const byFvId = new Map<string, DefectCategoryOption>()
  const byPvId = new Map<string, DefectCategoryOption>()
  const byName = new Map<string, DefectCategoryOption>()
  const usageByFvId = new Map<string, LoadedObjectDefect[]>()
  const usageByPvId = new Map<string, LoadedObjectDefect[]>()
  const usageByName = new Map<string, LoadedObjectDefect[]>()

  for (const option of options) {
    const fvId = option.fvId
    const pvId = option.pvId
    const normalizedName = normalizeText(option.name)

    byFvId.set(fvId, option)
    if (pvId) byPvId.set(pvId, option)
    if (normalizedName) byName.set(normalizedName, option)
  }

  for (const defect of items) {
    if (defect.categoryFvId) {
      const current = usageByFvId.get(defect.categoryFvId)
      if (current) {
        current.push(defect)
      } else {
        usageByFvId.set(defect.categoryFvId, [defect])
      }
    }

    if (defect.categoryPvId) {
      const current = usageByPvId.get(defect.categoryPvId)
      if (current) {
        current.push(defect)
      } else {
        usageByPvId.set(defect.categoryPvId, [defect])
      }
    }

    if (defect.categoryName) {
      const nameKey = normalizeText(defect.categoryName)
      if (nameKey) {
        const current = usageByName.get(nameKey)
        if (current) {
          current.push(defect)
        } else {
          usageByName.set(nameKey, [defect])
        }
      }
    }
  }

  return { byFvId, byPvId, byName, usageByFvId, usageByPvId, usageByName }
}

export interface DefectSelection {
  componentId: string | null
  componentPvId: string | null
  categoryFvId: string | null
  categoryPvId: string | null
}

export interface DefectRemoveDiff {
  componentIds: string[]
  componentPvIds: string[]
  categoryFvIds: string[]
  categoryPvIds: string[]
}

export function resolveRemovedDefectValueIds(
  previous: Pick<LoadedObjectDefect, 'componentId' | 'componentPvId' | 'categoryFvId' | 'categoryPvId'> | null,
  next: Partial<DefectSelection> | null,
): DefectRemoveDiff {
  const componentIds = new Set<string>()
  const componentPvIds = new Set<string>()
  const categoryFvIds = new Set<string>()
  const categoryPvIds = new Set<string>()

  const nextComponentId = next?.componentId ?? null
  const nextComponentPvId = next?.componentPvId ?? null
  const nextCategoryFvId = next?.categoryFvId ?? null
  const nextCategoryPvId = next?.categoryPvId ?? null

  if (previous?.componentId) {
    if (!nextComponentId || nextComponentId !== previous.componentId) {
      componentIds.add(previous.componentId)
    }
  }

  if (previous?.componentPvId) {
    if (!nextComponentPvId || nextComponentPvId !== previous.componentPvId) {
      componentPvIds.add(previous.componentPvId)
    }
  }

  if (previous?.categoryFvId) {
    if (!nextCategoryFvId || nextCategoryFvId !== previous.categoryFvId) {
      categoryFvIds.add(previous.categoryFvId)
    }
  }

  if (previous?.categoryPvId) {
    if (!nextCategoryPvId || nextCategoryPvId !== previous.categoryPvId) {
      categoryPvIds.add(previous.categoryPvId)
    }
  }

  return {
    componentIds: Array.from(componentIds),
    componentPvIds: Array.from(componentPvIds),
    categoryFvIds: Array.from(categoryFvIds),
    categoryPvIds: Array.from(categoryPvIds),
  }
}
