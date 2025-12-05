/** Файл: src/entities/object-parameter/model/types.ts
 *  Назначение: доменные типы для работы со справочником параметров обслуживаемых объектов.
 *  Использование: импортируйте в репозитории, фичах и страницах при работе с параметрами.
 */

export type DirectoryOption = { id: string; name: string }

export type DirectoryLookup<Option extends DirectoryOption = DirectoryOption> = Record<string, Option>

export interface ParameterMeasureOption {
  id: number
  pv: number
  name: string
}

export interface ParameterSourceOption {
  id: number
  pv: number
  name: string
}

export interface ParameterComponentOption {
  cls: number
  relcls: number
  rcm: number
  ent: number
  name: string
}

export interface ParameterLimitValues {
  min: number | null
  max: number | null
  norm: number | null
  comment: string | null
}

export interface ParameterDetails {
  id: number | null
  cls: number | null
  accessLevel: number | null
  measureRecordId: number | null
  measureId: number | null
  measurePv: number | null
  sourceRecordId: number | null
  sourceObjId: number | null
  sourcePv: number | null
  descriptionRecordId: number | null
  componentRelationId: number | null
  componentRelationName: string | null
  componentCls: number | null
  componentRelcls: number | null
  componentRcm: number | null
  componentEnt: number | null
  limitMaxId: number | null
  limitMinId: number | null
  limitNormId: number | null
}

export interface DeleteParameterPayload {
  id: number
  relationId?: number | null
}

export interface CreateParameterPayload {
  name: string
  description: string | null
  measure: ParameterMeasureOption
  source: ParameterSourceOption
  component: ParameterComponentOption
  limits: ParameterLimitValues
  accessLevel?: number
}

export interface UpdateParameterPayload extends CreateParameterPayload {
  id: number
  details: ParameterDetails
}

export interface ObjectParameter {
  id: string
  name: string
  code: string | null
  valueType: string
  unitId: string | null
  sourceId: string | null
  componentId: string | null
  minValue: number | null
  maxValue: number | null
  normValue: number | null
  isRequired: boolean
  note: string | null
  description: string | null
}

export interface LoadedObjectParameter extends ObjectParameter {
  unitName: string | null
  sourceName: string | null
  componentName: string | null
  details: ParameterDetails
}

export interface ObjectParametersSnapshot {
  items: LoadedObjectParameter[]
  unitDirectory: DirectoryLookup
  sourceDirectory: DirectoryLookup
}
