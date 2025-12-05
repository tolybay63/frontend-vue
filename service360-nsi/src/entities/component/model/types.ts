/** Файл: src/entities/component/model/types.ts
 *  Назначение: доменные типы для компонентов инфраструктуры и их опций.
 *  Использование: импортировать в фичах (селект компонентов) и репозиториях.
 */
export interface Component {
  id: string
  name: string
}

export interface ComponentOption {
  id: string
  name: string
}

export interface ComponentRelation {
  /** Идентификатор связанной сущности (тип объекта, параметр, дефект) */
  id: string
  /** Отображаемое наименование */
  name: string
  /** Идентификатор связи (idro) для последующих обновлений */
  relationId: string | null
  /** Класс или дополнительная метаинформация, необходимая для RPC */
  cls?: string | null
  /** Дополнительная категория (используется для дефектов) */
  categoryName?: string | null
  /** Идентификатор категории (fv/pv) */
  categoryId?: string | null
}

export interface ComponentDetails {
  id: number
  cls: number | null
  accessLevel: number | null
}

export interface LoadedComponentWithRelations {
  id: string
  cls: string | null
  name: string
  objectTypes: ComponentRelation[]
  parameters: ComponentRelation[]
  defects: ComponentRelation[]
  details: ComponentDetails
}

export interface DirectoryOptionWithMeta {
  id: string
  name: string
  cls?: string | null
  categoryName?: string | null
  categoryId?: string | null
}

export interface ComponentsSnapshot {
  items: LoadedComponentWithRelations[]
  objectTypes: DirectoryOptionWithMeta[]
  parameters: DirectoryOptionWithMeta[]
  defects: DirectoryOptionWithMeta[]
}

export interface CreateComponentPayload {
  name: string
  objectTypeIds: string[]
  parameterIds: string[]
  defectIds: string[]
}

export interface UpdateComponentPayload extends CreateComponentPayload {
  id: number
  cls: number | null
  details: ComponentDetails
}
