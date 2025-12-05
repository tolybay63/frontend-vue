/** Файл: src/entities/component/model/dto.ts
 *  Назначение: DTO-структуры RPC-ответов для сущности «Компонент».
 *  Использование: применять в репозиториях при парсинге ответов бекенда.
 */
export interface ComponentRecord {
  id?: string | number | null
  ID?: string | number | null
  number?: string | number | null
  cls?: string | number | null
  CLS?: string | number | null
  name?: string | null
  NAME?: string | null
}

export type ComponentSaveRecord = ComponentRecord
