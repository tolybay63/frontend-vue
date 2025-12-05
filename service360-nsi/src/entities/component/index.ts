/** Публичный API сущности "компонент" */
export * from './api/repository'
export type {
  Component,
  ComponentOption,
  ComponentRelation,
  ComponentDetails,
  LoadedComponentWithRelations,
  ComponentsSnapshot,
  DirectoryOptionWithMeta,
  CreateComponentPayload,
  UpdateComponentPayload,
} from './model/types'
export type { ComponentRecord, ComponentSaveRecord } from './model/dto'
