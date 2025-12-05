/** Публичный API сущности "источник нормативных данных" */
export * from './api/repository'
export type { Department, Source, SourceDetails, SourceFile } from './model/types'
export type {
  SaveSourceCollectionInsPayload,
  SaveSourceCollectionUpdPayload,
} from './model/dto'
