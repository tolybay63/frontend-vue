/** Файл: src/types/nsi.ts
 *  Назначение: общие типы данных NSI для фронтенда.
 *  Использование: импортируйте при описании DTO и контрактов.
 */
export type ID = string
export type GeometryKind = 'точка' | 'линия' | 'полигон'

export interface ObjectType {
  id: ID
  name: string
  geometry: GeometryKind
  component: string[] // <<< массив НАЗВАНИЙ
}

export interface Component {
  id: ID
  name: string
}
