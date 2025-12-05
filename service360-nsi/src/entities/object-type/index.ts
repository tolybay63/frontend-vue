/** Публичный API сущности "тип объекта" */
export * from './api/repository'
export type {
  ObjectType,
  LoadedObjectType,
  GeometryKind,
  GeometryPair,
  ObjectTypesSnapshot,
} from './model/types'
export type {
  RawObjectTypeRecord,
  RawRelRecord,
  RawGeometryRecord,
  RawComponentRecord,
  SaveObjectTypeRecord,
} from './model/dto'
