/** Файл: src/entities/object-type/model/types.ts
 *  Назначение: доменные типы и мапперы для сущности «Тип обслуживаемого объекта».
 *  Использование: применять в репозиториях, фичах и виджетах при работе с типами.
 */
import type { ComponentOption } from '@entities/component'

export type GeometryKind = 'точка' | 'линия' | 'полигон'

export interface ObjectType {
  id: string
  name: string
  geometry: GeometryKind
  component: string[]
}

export interface LoadedObjectType extends ObjectType {
  cls?: string | null
  idShape?: string | null
  number?: string | null
}

export interface ComponentLink {
  idro: number
  typeId: string
  typeName: string
  componentId: string
  componentName: string
}

export type GeometryPair = { fv: string | null; pv: string | null }

export interface ObjectTypesSnapshot {
  items: LoadedObjectType[]
  componentsByType: Record<string, ComponentOption[]>
  geometryOptions: Array<{ id: string; name: string; code?: string | null; value?: string | null }>
  geometryPairByKind: Partial<Record<GeometryKind, GeometryPair>>
  allComponents: ComponentOption[]
  linksByType: Record<string, Array<{ compId: string; linkId: string }>>
}
