/** Файл: src/entities/object-defect/model/types.ts
 *  Назначение: доменные типы и структуры снапшота для сущности «Дефект обслуживаемого объекта».
 *  Использование: импортируйте в репозитории, фичах и страницах при работе со справочником дефектов.
 */

export interface DefectCategoryOption {
  fvId: string
  pvId: string
  name: string
}

export interface DefectComponentOption {
  id: string
  name: string
  pvId: string | null
}

export interface ObjectDefect {
  id: string
  name: string
  componentId: string | null
  componentPvId: string | null
  categoryFvId: string | null
  categoryPvId: string | null
  index: string | null
  note: string | null
}

export interface LoadedObjectDefect extends ObjectDefect {
  componentName: string | null
  categoryName: string | null
}

export interface ObjectDefectsSnapshot {
  items: LoadedObjectDefect[]
  categories: DefectCategoryOption[]
  components: DefectComponentOption[]
}

export interface CreateObjectDefectPayload {
  name: string
  componentId: string | null
  componentPvId: string | null
  categoryFvId: string | null
  categoryPvId: string | null
  index: string | null
  note: string | null
}

export interface UpdateObjectDefectPayload extends CreateObjectDefectPayload {
  id: string
}
