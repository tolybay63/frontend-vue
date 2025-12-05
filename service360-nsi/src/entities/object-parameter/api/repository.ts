/** Файл: src/entities/object-parameter/api/repository.ts
 *  Назначение: адаптер RPC-методов для справочника параметров обслуживаемых объектов.
 *  Использование: импортируйте функции в фичах и страницах для загрузки и мутаций данных.
 */
import { rpc } from '@shared/api'

import type {
  CreateParameterPayload,
  DeleteParameterPayload,
  DirectoryLookup,
  DirectoryOption,
  LoadedObjectParameter,
  ObjectParametersSnapshot,
  ParameterComponentOption,
  ParameterDetails,
  ParameterMeasureOption,
  ParameterSourceOption,
  UpdateParameterPayload,
} from '../model/types'

interface RpcDirectoryItem {
  [key: string]: unknown
}

interface RpcParameterItem {
  [key: string]: unknown
}

interface RpcParamsComponentRecord {
  [key: string]: unknown
}

const STRING_TRUE = new Set(['1', 'true', 'yes', 'y'])
const REL_TYP_PARAMS_COMPONENT = 1002
const RELCLS_PARAMS_COMPONENT = 1074
const PARAMETER_RCM = 1148
const DEFAULT_PARAMETER_CLASS = 1041
const DEFAULT_ACCESS_LEVEL = 1

async function rpcWithDebug<T = unknown, TParams = unknown>(
  method: string,
  params: TParams,
  context: string,
): Promise<T> {
  try {
    return await rpc<T>(method, params)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[object-parameter] RPC ${method} failed at ${context}: ${message}`, { params })
    throw new Error(`${context}: ${message}`)
  }
}

function extractRpcFailureReason(response: unknown): string | null {
  if (!response || typeof response !== 'object') return null
  const keys = Object.keys(response as Record<string, unknown>)
  if (keys.length === 0) return null
  if ('error' in (response as Record<string, unknown>)) {
    const err = (response as Record<string, unknown>).error
    if (typeof err === 'string') return err
    if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') {
      return err.message
    }
  }
  return JSON.stringify(response)
}

function extractArray<T = unknown>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>

    for (const key of ['records', 'items', 'data', 'rows', 'result']) {
      const nested = record[key]
      if (Array.isArray(nested)) return nested as T[]
    }

    for (const nestedValue of Object.values(record)) {
      if (Array.isArray(nestedValue)) return nestedValue as T[]
    }
  }

  return []
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
}

function pickString(source: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const raw = source[key]

    if (typeof raw === 'string') {
      const trimmed = raw.trim()
      if (trimmed) return trimmed
    }

    if (typeof raw === 'number' && Number.isFinite(raw)) {
      return String(raw)
    }
  }

  return null
}

function pickNumber(source: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const raw = source[key]

    if (typeof raw === 'number' && Number.isFinite(raw)) {
      return raw
    }

    if (typeof raw === 'string') {
      const normalized = raw.replace(',', '.').trim()
      if (!normalized) continue
      const value = Number(normalized)
      if (!Number.isNaN(value)) return value
    }
  }

  return null
}

function pickBoolean(source: Record<string, unknown>, keys: string[]): boolean {
  for (const key of keys) {
    const raw = source[key]

    if (typeof raw === 'boolean') return raw
    if (typeof raw === 'number') return raw !== 0
    if (typeof raw === 'string') {
      const normalized = raw.trim().toLowerCase()
      if (!normalized) continue
      if (STRING_TRUE.has(normalized)) return true
      if (
        normalized === '0' ||
        normalized === 'false' ||
        normalized === 'no' ||
        normalized === 'n'
      ) {
        return false
      }
    }
  }

  return false
}

function toDirectoryOption(
  item: RpcDirectoryItem,
  fallbackId: string,
  idKeys: string[],
  nameKeys: string[],
): DirectoryOption {
  const record = asRecord(item)
  const id = pickString(record, idKeys) ?? fallbackId
  const name = pickString(record, nameKeys)

  return { id, name: name ?? id }
}

function createDirectoryLookup(options: DirectoryOption[]): DirectoryLookup {
  return options.reduce<DirectoryLookup>((acc, option) => {
    acc[String(option.id)] = option
    return acc
  }, {})
}

function toMeasureOption(
  item: RpcDirectoryItem,
  fallbackName: string,
): ParameterMeasureOption | null {
  const record = asRecord(item)
  const id = pickNumber(record, ['id', 'measureId', 'meaParamsMeasure'])
  const pv = pickNumber(record, ['pv', 'pvParamsMeasure'])
  const name = pickString(record, ['name', 'shortName', 'caption', 'title']) ?? fallbackName

  if (id === null || pv === null) return null

  return {
    id: Number(id),
    pv: Number(pv),
    name,
  }
}

function toSourceOption(
  item: RpcDirectoryItem,
  fallbackName: string,
): ParameterSourceOption | null {
  const record = asRecord(item)
  const id = pickNumber(record, ['id', 'collectionId', 'objCollections'])
  const pv = pickNumber(record, ['pv', 'pvCollections'])
  const name = pickString(record, ['name', 'caption', 'title', 'description']) ?? fallbackName

  if (id === null || pv === null) return null

  return {
    id: Number(id),
    pv: Number(pv),
    name,
  }
}

function toComponentOption(item: RpcParamsComponentRecord): ParameterComponentOption | null {
  const record = asRecord(item)

  const ent = pickNumber(record, ['ent', 'idrom2', 'id'])
  const cls = pickNumber(record, ['cls', 'clsrom2'])
  const relcls = pickNumber(record, ['relcls'])
  const rcm = pickNumber(record, ['rcm'])
  const name = pickString(record, ['name', 'namerom2'])

  if (ent === null || cls === null || relcls === null || rcm === null || !name) return null
  if (Number(ent) === 0) return null

  return {
    cls: Number(cls),
    relcls: Number(relcls),
    rcm: Number(rcm),
    ent: Number(ent),
    name,
  }
}

const compareByNameRu = (a: { name: string }, b: { name: string }) =>
  a.name.localeCompare(b.name, 'ru')

function mapParameter(
  item: RpcParameterItem,
  index: number,
  directories: {
    units: DirectoryLookup
    sources: DirectoryLookup
    measureNamesById: Record<string, string>
  },
): LoadedObjectParameter {
  const record = asRecord(item)
  const id = pickString(record, ['id', 'parameterId', 'parameter_id']) ?? `parameter-${index}`
  const numericId = pickNumber(record, ['id', 'ID', 'number'])
  const name =
    pickString(record, [
      'name',
      'parameterName',
      'parameter_name',
      'title',
      'ParamsName',
      'paramsName',
    ]) ?? `Параметр ${index + 1}`
  const code = pickString(record, ['code', 'parameterCode', 'mnemo', 'mnemonic'])
  const valueType =
    pickString(record, ['valueType', 'value_type', 'type']) ??
    pickString(record, ['dataType', 'data_type']) ??
    'string'
  const pvParamsMeasure = pickNumber(record, ['pvParamsMeasure'])
  const unitIdFallback =
    pickString(record, ['unitId', 'unit_id', 'measureId', 'measure_id']) ??
    pickString(record, ['unit', 'measure'])
  const unitDirectoryKey =
    pvParamsMeasure !== null
      ? String(pvParamsMeasure)
      : unitIdFallback != null
        ? unitIdFallback
        : null
  const unitId = pvParamsMeasure !== null ? String(pvParamsMeasure) : unitIdFallback
  const sourceId =
    pickString(record, [
      'objCollections',
      'objCollection',
      'sourceId',
      'source_id',
      'collectionId',
      'collection_id',
      'pvCollections',
    ]) ?? pickString(record, ['collection', 'source'])
  const minValue = pickNumber(record, ['minValue', 'min_value', 'min'])
  const maxValue = pickNumber(record, ['maxValue', 'max_value', 'max'])
  const isRequired = pickBoolean(record, ['isRequired', 'required', 'is_required', 'mandatory'])
  const note = pickString(record, ['note', 'comment', 'description', 'remark', 'ParamsComment'])
  const description = pickString(record, [
    'ParamsDescription',
    'description',
    'parameterDescription',
  ])
  const cls = pickNumber(record, ['cls', 'CLS'])
  const accessLevel = pickNumber(record, ['accessLevel'])
  const idCollections = pickNumber(record, ['idCollections'])
  const objCollections = pickNumber(record, ['objCollections'])
  const pvCollections = pickNumber(record, ['pvCollections'])
  const idParamsMeasure = pickNumber(record, ['idParamsMeasure'])
  const meaParamsMeasure = pickNumber(record, ['meaParamsMeasure'])
  const idParamsDescription = pickNumber(record, ['idParamsDescription'])

  const measureNameFromId =
    meaParamsMeasure !== null
      ? directories.measureNamesById[String(meaParamsMeasure)] ?? null
      : null

  const unitName =
    measureNameFromId ??
    (unitDirectoryKey ? directories.units[unitDirectoryKey]?.name : null) ??
    pickString(record, [
      'unitName',
      'unit_name',
      'measureName',
      'measure_name',
      'pvParamsMeasureName',
      'ParamsMeasureName',
    ])
  const sourceName =
    (sourceId ? directories.sources[sourceId]?.name : null) ??
    pickString(record, [
      'sourceName',
      'source_name',
      'collectionName',
      'collection_name',
      'idCollectionsName',
      'objCollectionName',
      'ParamsCollectionName',
    ])

  const details: ParameterDetails = {
    id: numericId !== null ? Number(numericId) : null,
    cls: cls !== null ? Number(cls) : null,
    accessLevel: accessLevel !== null ? Number(accessLevel) : null,
    measureRecordId: idParamsMeasure !== null ? Number(idParamsMeasure) : null,
    measureId: meaParamsMeasure !== null ? Number(meaParamsMeasure) : null,
    measurePv: pvParamsMeasure !== null ? Number(pvParamsMeasure) : null,
    sourceRecordId: idCollections !== null ? Number(idCollections) : null,
    sourceObjId: objCollections !== null ? Number(objCollections) : null,
    sourcePv: pvCollections !== null ? Number(pvCollections) : null,
    descriptionRecordId: idParamsDescription !== null ? Number(idParamsDescription) : null,
    componentRelationId: null,
    componentRelationName: null,
    componentCls: null,
    componentRelcls: null,
    componentRcm: null,
    componentEnt: null,
    limitMaxId: null,
    limitMinId: null,
    limitNormId: null,
  }

  return {
    id,
    name,
    code: code ?? null,
    valueType,
    unitId: unitId ?? null,
    sourceId: sourceId ?? null,
    componentId: null,
    minValue,
    maxValue,
    normValue: null,
    isRequired,
    note: note ?? null,
    description: description ?? null,
    unitName: unitName ?? null,
    sourceName: sourceName ?? null,
    componentName: null,
    details,
  }
}

export async function fetchObjectParametersSnapshot(): Promise<ObjectParametersSnapshot> {
  const [measureResponse, collectionResponse, parametersResponse] = await Promise.all([
    rpcWithDebug<RpcDirectoryItem[], ['Prop_Measure']>(
      'data/loadMeasure',
      ['Prop_Measure'],
      'Снапшот: загрузка единиц измерения',
    ),
    rpcWithDebug<RpcDirectoryItem[], ['Cls_Collections', 'Prop_Collections']>(
      'data/loadCollections',
      ['Cls_Collections', 'Prop_Collections'],
      'Снапшот: загрузка источников',
    ),
    rpcWithDebug<RpcParameterItem[], [number]>(
      'data/loadParameters',
      [0],
      'Снапшот: загрузка параметров',
    ),
  ])

  const relTypeId = await rpcWithDebug<number>(
    'data/getIdRelTyp',
    ['RT_ParamsComponent'],
    'Снапшот: получение идентификатора RT_ParamsComponent',
  ).catch(() => null)
  if (relTypeId !== null) {
    await rpc('data/loadRelObjMember', [0]).catch(() => null)
  }
  const paramsComponentResponse =
    relTypeId !== null
      ? await rpcWithDebug<unknown, [number]>(
          'data/loadParamsComponent',
          [REL_TYP_PARAMS_COMPONENT],
          'Снапшот: загрузка параметр-компонент связей',
        ).catch(() => null)
      : null

  // Дополнительно: связи параметр ↔ компонент и справочник компонентов
  const [relationsResponse, componentsResponse] = await Promise.all([
    rpcWithDebug(
      'data/loadComponentsObject2',
      ['RT_ParamsComponent', 'Typ_Parameter', 'Typ_Components'],
      'Снапшот: загрузка доп. связей',
    ).catch(() => null),
    rpcWithDebug('data/loadComponents', [0], 'Снапшот: загрузка справочника компонентов').catch(
      () => null,
    ),
  ])

  const unitItems = extractArray<RpcDirectoryItem>(measureResponse)
  const sourceItems = extractArray<RpcDirectoryItem>(collectionResponse)
  const parameterItems = extractArray<RpcParameterItem>(parametersResponse)
  const paramsComponentItems = extractArray<RpcParamsComponentRecord>(paramsComponentResponse)
  const relationItems = extractArray<Record<string, unknown>>(relationsResponse)
  const allComponentItems = extractArray<Record<string, unknown>>(componentsResponse)

  const measureNamesById: Record<string, string> = {}
  const unitOptions = unitItems.map((item, index) => {
    const option = toDirectoryOption(
      item,
      `unit-${index}`,
      ['pv', 'id', 'measureId', 'measure_id', 'unitId', 'unit_id'],
      [
        'name',
        'shortName',
        'short_name',
        'fullName',
        'full_name',
        'caption',
        'title',
        'ParamsMeasureName',
      ],
    )
    const record = asRecord(item)
    const measureId = pickNumber(record, ['id', 'measureId', 'measure_id'])
    if (measureId !== null) {
      measureNamesById[String(measureId)] = option.name
    }
    return option
  })

  const sourceOptions = sourceItems.map((item, index) =>
    toDirectoryOption(
      item,
      `source-${index}`,
      ['id', 'collectionId', 'collection_id', 'sourceId', 'source_id', 'pv'],
      ['name', 'caption', 'title', 'description', 'ParamsCollectionName'],
    ),
  )

  const unitDirectory = createDirectoryLookup(unitOptions)
  const sourceDirectory = createDirectoryLookup(sourceOptions)

  const items = parameterItems.map((item, index) =>
    mapParameter(item, index, {
      units: unitDirectory,
      sources: sourceDirectory,
      measureNamesById,
    }),
  )

  // Построение lookup-таблиц для сопоставления:
  // 1) Класс параметра по его id из ответа loadParameters
  const paramClsById = new Map<string, string>()
  for (const raw of parameterItems) {
    const rec = asRecord(raw)
    const id = pickString(rec, ['id', 'ID', 'number'])
    const cls = pickString(rec, ['cls', 'CLS'])
    if (id && cls) paramClsById.set(id, cls)
  }

  // 2) Связи параметр(idrom1, clsrom1) -> компонент(idrom2, clsrom2) + idro
  type RelInfo = { idro: string; compId: string; compCls: string }
  const relByParamKey = new Map<string, RelInfo>()
  for (const rel of relationItems) {
    const rec = asRecord(rel)
    const idro = pickString(rec, ['idro'])
    const idrom1 = pickString(rec, ['idrom1'])
    const clsrom1 = pickString(rec, ['clsrom1'])
    const idrom2 = pickString(rec, ['idrom2'])
    const clsrom2 = pickString(rec, ['clsrom2'])
    if (!idro || !idrom1 || !clsrom1 || !idrom2 || !clsrom2) continue
    relByParamKey.set(`${idrom1}|${clsrom1}`, { idro, compId: idrom2, compCls: clsrom2 })
  }

  // 3) Имя компонента по паре (id, cls) из loadComponents
  const compNameByKey = new Map<string, string>()
  for (const raw of allComponentItems) {
    const rec = asRecord(raw)
    const id = pickString(rec, ['id', 'ID', 'number'])
    const cls = pickString(rec, ['cls', 'CLS'])
    const name = pickString(rec, ['name', 'NAME'])
    if (id && cls && name) compNameByKey.set(`${id}|${cls}`, name)
  }

  // 4) Свойства связи (лимиты/комментарии) по idro из loadParamsComponent
  const propsByIdro = new Map<string, Record<string, unknown>>()
  for (const raw of paramsComponentItems) {
    const rec = asRecord(raw)
    const idro = pickString(rec, ['id', 'idro'])
    if (idro) propsByIdro.set(idro, rec)
  }

  // Присвоение componentName по связям и лимитов по idro
  for (const item of items) {
    const cls = paramClsById.get(item.id) ?? null
    if (!cls) continue
    const rel = relByParamKey.get(`${item.id}|${cls}`)
    if (!rel) continue

    // Имя и id компонента из справочника компонентов
    item.componentId = rel.compId
    item.componentName = compNameByKey.get(`${rel.compId}|${rel.compCls}`) ?? null
    item.details.componentRelationId = rel.idro ? Number(rel.idro) : null
    item.details.componentRelationName = item.componentName
    item.details.componentEnt = rel.compId ? Number(rel.compId) : null
    item.details.componentCls = rel.compCls ? Number(rel.compCls) : null
    item.details.componentRelcls = RELCLS_PARAMS_COMPONENT
    item.details.componentRcm = 1149

    // Лимиты и комментарии из loadParamsComponent по idro
    const props = propsByIdro.get(rel.idro)
    if (props) {
      const limitMin = pickNumber(props, ['ParamsLimitMin', 'limitMin', 'minValue'])
      if (limitMin !== null) item.minValue = limitMin

      const limitMax = pickNumber(props, ['ParamsLimitMax', 'limitMax', 'maxValue'])
      if (limitMax !== null) item.maxValue = limitMax

      const limitNorm = pickNumber(props, ['ParamsLimitNorm', 'limitNorm', 'normValue'])
      if (limitNorm !== null) item.normValue = limitNorm

      const comment = pickString(props, ['cmt', 'comment', 'note'])
      if (comment) item.note = comment

      const limitMaxId = pickNumber(props, ['idParamsLimitMax'])
      const limitMinId = pickNumber(props, ['idParamsLimitMin'])
      const limitNormId = pickNumber(props, ['idParamsLimitNorm'])
      if (limitMaxId !== null) item.details.limitMaxId = Number(limitMaxId)
      if (limitMinId !== null) item.details.limitMinId = Number(limitMinId)
      if (limitNormId !== null) item.details.limitNormId = Number(limitNormId)
      const relationName = pickString(props, ['name'])
      if (relationName) item.details.componentRelationName = relationName
    }
  }

  return { items, unitDirectory, sourceDirectory }
}

export async function loadParameterMeasures(): Promise<ParameterMeasureOption[]> {
  const response = await rpcWithDebug<RpcDirectoryItem[], ['Prop_Measure']>(
    'data/loadMeasure',
    ['Prop_Measure'],
    'Справочники формы: единицы измерения',
  )
  const items = extractArray<RpcDirectoryItem>(response)
  const unique = new Map<number, ParameterMeasureOption>()

  items.forEach((item, index) => {
    const option = toMeasureOption(item, `Единица измерения ${index + 1}`)
    if (option) unique.set(option.pv, option)
  })

  return Array.from(unique.values()).sort(compareByNameRu)
}

export async function loadParameterSources(): Promise<ParameterSourceOption[]> {
  const response = await rpcWithDebug<RpcDirectoryItem[], ['Cls_Collections', 'Prop_Collections']>(
    'data/loadCollections',// Лимиты и комментарии из loadParamsComponent по idro
    /* const props = propsByIdro.get(rel.idro)
    if (props) {
      const limitMin = pickNumber(props, ['ParamsLimitMin', 'limitMin', 'minValue'])
      if (limitMin !== null) item.minValue = limitMin

      const limitMax = pickNumber(props, ['ParamsLimitMax', 'limitMax', 'maxValue'])
      if (limitMax !== null) item.maxValue = limitMax

      const limitNorm = pickNumber(props, ['ParamsLimitNorm', 'limitNorm', 'normValue'])
      if (limitNorm !== null) item.normValue = limitNorm

      const comment = pickString(props, ['cmt', 'comment', 'note'])
      if (comment) item.note = comment

      const limitMaxId = pickNumber(props, ['idParamsLimitMax'])
      const limitMinId = pickNumber(props, ['idParamsLimitMin'])
      const limitNormId = pickNumber(props, ['idParamsLimitNorm'])
      if (limitMaxId !== null) item.details.limitMaxId = Number(limitMaxId)
      if (limitMinId !== null) item.details.limitMinId = Number(limitMinId)
      if (limitNormId !== null) item.details.limitNormId = Number(limitNormId)
      const relationName = pickString(props, ['name'])
      if (relationName) item.details.componentRelationName = relationName
    */
    ['Cls_Collections', 'Prop_Collections'],
    'Справочники формы: источники',
  )
  const items = extractArray<RpcDirectoryItem>(response)
  const unique = new Map<number, ParameterSourceOption>()

  items.forEach((item, index) => {
    const option = toSourceOption(item, `Источник ${index + 1}`)
    if (option) unique.set(option.id, option)
  })

  return Array.from(unique.values()).sort(compareByNameRu)
}

export async function loadParameterComponents(): Promise<ParameterComponentOption[]> {
  const response = await rpcWithDebug<RpcParamsComponentRecord[], [{ relTyp: number }]>(
    'data/loadAllMembers',
    [{ relTyp: REL_TYP_PARAMS_COMPONENT }],
    'Справочники формы: состав RT_ParamsComponent',
  )
  const items = extractArray<RpcParamsComponentRecord>(response)
  const unique = new Map<number, ParameterComponentOption>()

  items.forEach((item) => {
    const option = toComponentOption(item)
    if (!option) return
    if (option.rcm !== 1149) return
    unique.set(option.ent, option)
  })

  return Array.from(unique.values()).sort(compareByNameRu)
}

const ensureFiniteNumber = (value: number | null | undefined): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

export async function createParameter(
  payload: CreateParameterPayload,
): Promise<LoadedObjectParameter> {
  const name = payload.name.trim()
  if (!name) throw new Error('Укажите наименование параметра')

  const descriptionRaw = payload.description ?? ''
  const descriptionTrimmed = descriptionRaw.trim()
  const descriptionForResult = descriptionTrimmed || null

  const commentRaw = payload.limits.comment ?? ''
  const commentTrimmed = commentRaw.trim()
  const commentForResult = commentTrimmed || null

  const limitMax = ensureFiniteNumber(payload.limits.max)
  const limitMin = ensureFiniteNumber(payload.limits.min)
  const limitNorm = ensureFiniteNumber(payload.limits.norm)

  const accessLevel = payload.accessLevel ?? DEFAULT_ACCESS_LEVEL

  const saveParamsResponse = await rpcWithDebug(
    'data/saveParams',
    [
      'ins',
      {
        accessLevel,
        name,
        meaParamsMeasure: payload.measure.id,
        pvParamsMeasure: payload.measure.pv,
        objCollections: payload.source.id,
        pvCollections: payload.source.pv,
        ParamsDescription: descriptionTrimmed,
      },
    ],
    'Создание параметра: сохранение основной записи',
  )

  const savedRecords = extractArray<Record<string, unknown>>(saveParamsResponse)
  const savedRecord = savedRecords[0]
  if (!savedRecord) throw new Error('Не удалось сохранить параметр')

  const createdId = pickNumber(savedRecord, ['id', 'ID', 'number'])
  if (createdId === null) throw new Error('Не удалось определить идентификатор параметра')

  const createdCls = pickNumber(savedRecord, ['cls', 'CLS']) ?? DEFAULT_PARAMETER_CLASS
  const createdName = pickString(savedRecord, ['name', 'ParamsName', 'paramsName']) ?? name

  let previousMaxNumber = 0
  try {
    const beforeResponse = await rpcWithDebug<RpcParamsComponentRecord[], [number]>(
      'data/loadParamsComponent',
      [REL_TYP_PARAMS_COMPONENT],
      'Создание параметра: загрузка текущих связей',
    )
    const beforeRecords = extractArray<RpcParamsComponentRecord>(beforeResponse)
    previousMaxNumber = beforeRecords.reduce((acc, record) => {
      const num = pickNumber(asRecord(record), ['number'])
      return num !== null ? Math.max(acc, Number(num)) : acc
    }, 0)
  } catch {
    previousMaxNumber = 0
  }

  const parameterRelationEntry = {
    cls: Number(createdCls),
    relcls: RELCLS_PARAMS_COMPONENT,
    rcm: PARAMETER_RCM,
    ent: Number(createdId),
    name: createdName,
  }

  const componentRelationEntry = {
    cls: payload.component.cls,
    relcls: payload.component.relcls,
    rcm: payload.component.rcm,
    ent: payload.component.ent,
    name: payload.component.name,
  }

  await rpcWithDebug(
    'data/createGroupRelObj',
    [REL_TYP_PARAMS_COMPONENT, [[[parameterRelationEntry], [componentRelationEntry]]]],
    'Создание параметра: создание связи с компонентом',
  )

  const afterResponse = await rpcWithDebug<RpcParamsComponentRecord[], [number]>(
    'data/loadParamsComponent',
    [REL_TYP_PARAMS_COMPONENT],
    'Создание параметра: подтверждение связи',
  )
  const afterRecords = extractArray<RpcParamsComponentRecord>(afterResponse)
  const expectedRelationName = `${createdName} <=> ${componentRelationEntry.name}`
  const relationRecord = afterRecords.find((record) => {
    const recordObject = asRecord(record)
    const num = pickNumber(recordObject, ['number'])
    if (num !== null && num > previousMaxNumber) return true
    const relationName = pickString(recordObject, ['name'])
    return relationName === expectedRelationName
  })

  if (!relationRecord) {
    throw new Error('Не удалось получить созданную связь параметра с компонентом')
  }

  const relationObject = asRecord(relationRecord)
  const relationId = pickNumber(relationObject, ['id', 'idro'])
  const relationName = pickString(relationObject, ['name']) ?? expectedRelationName

  if (relationId === null) {
    throw new Error('Не удалось определить идентификатор связи параметра и компонента')
  }

  const limits: Array<{ codProp: string; value: number | null }> = [
    { codProp: 'Prop_ParamsLimitMax', value: limitMax },
    { codProp: 'Prop_ParamsLimitMin', value: limitMin },
    { codProp: 'Prop_ParamsLimitNorm', value: limitNorm },
  ]

  for (const { codProp, value } of limits) {
    if (value === null) continue
    await rpcWithDebug(
      'data/saveParamComponentValue',
      [
        {
          name: relationName,
          codProp,
          own: Number(relationId),
          isObj: 0,
          val: String(value),
          mode: 'ins',
        },
      ],
      `Создание параметра: сохранение значения ${codProp}`,
    )
  }

  if (commentForResult) {
    await rpcWithDebug(
      'data/editRelObj',
      [
        {
          id: Number(relationId),
          name: relationName,
          cmt: commentTrimmed,
        },
      ],
      'Создание параметра: сохранение комментария связи',
    )
  }

  let limitMaxId: number | null = pickNumber(relationObject, ['idParamsLimitMax'])
  let limitMinId: number | null = pickNumber(relationObject, ['idParamsLimitMin'])
  let limitNormId: number | null = pickNumber(relationObject, ['idParamsLimitNorm'])

  if (
    (limitMax !== null && limitMaxId === null) ||
    (limitMin !== null && limitMinId === null) ||
    (limitNorm !== null && limitNormId === null) ||
    commentForResult !== null
  ) {
    try {
      const refreshed = await rpcWithDebug<RpcParamsComponentRecord[], [number]>(
        'data/loadParamsComponent',
        [REL_TYP_PARAMS_COMPONENT],
        'Создание параметра: повторная загрузка связей',
      )
      const refreshedRecords = extractArray<RpcParamsComponentRecord>(refreshed)
      const refreshedRelation = refreshedRecords.find((record) => {
        const recordObject = asRecord(record)
        const idro = pickNumber(recordObject, ['id', 'idro'])
        return idro !== null && Number(idro) === Number(relationId)
      })
      if (refreshedRelation) {
        const refreshedObject = asRecord(refreshedRelation)
        limitMaxId = pickNumber(refreshedObject, ['idParamsLimitMax'])
        limitMinId = pickNumber(refreshedObject, ['idParamsLimitMin'])
        limitNormId = pickNumber(refreshedObject, ['idParamsLimitNorm'])
      }
    } catch {
      // ignore refresh errors
    }
  }

  const details: ParameterDetails = {
    id: Number(createdId),
    cls: Number(createdCls),
    accessLevel,
    measureRecordId: pickNumber(savedRecord, ['idParamsMeasure']),
    measureId: payload.measure.id,
    measurePv: payload.measure.pv,
    sourceRecordId: pickNumber(savedRecord, ['idCollections']),
    sourceObjId: payload.source.id,
    sourcePv: payload.source.pv,
    descriptionRecordId: pickNumber(savedRecord, ['idParamsDescription']),
    componentRelationId: Number(relationId),
    componentRelationName: relationName,
    componentCls: payload.component.cls,
    componentRelcls: payload.component.relcls,
    componentRcm: payload.component.rcm,
    componentEnt: payload.component.ent,
    limitMaxId: limitMaxId !== null ? Number(limitMaxId) : null,
    limitMinId: limitMinId !== null ? Number(limitMinId) : null,
    limitNormId: limitNormId !== null ? Number(limitNormId) : null,
  }

  return {
    id: String(createdId),
    name: createdName,
    code: null,
    valueType: 'number',
    unitId: String(payload.measure.pv),
    sourceId: String(payload.source.id),
    componentId: String(componentRelationEntry.ent),
    minValue: limitMin,
    maxValue: limitMax,
    normValue: limitNorm,
    isRequired: false,
    note: commentForResult,
    description: descriptionForResult,
    unitName: payload.measure.name,
    sourceName: payload.source.name,
    componentName: componentRelationEntry.name,
    details,
  }
}

interface SaveParamComponentValuePayload {
  codProp: string
  value: number | null
  valueId: number | null | undefined
}

function resolveLimitIdKey(codProp: string): string | null {
  if (codProp === 'Prop_ParamsLimitMax') return 'idParamsLimitMax'
  if (codProp === 'Prop_ParamsLimitMin') return 'idParamsLimitMin'
  if (codProp === 'Prop_ParamsLimitNorm') return 'idParamsLimitNorm'
  return null
}

async function getIdValFromLoadParamsComponent(
  relationId: number,
  codProp: string,
): Promise<number | null> {
  try {
    const response = await rpcWithDebug<unknown, [number]>(
      'data/loadParamsComponent',
      [REL_TYP_PARAMS_COMPONENT],
      'Загрузка идентификаторов лимитов из loadParamsComponent',
    )
    const records = extractArray<Record<string, unknown>>(response)
    const match = records.find((rec) => {
      const obj = asRecord(rec)
      const idro = pickNumber(obj, ['id', 'ord', 'idro', 'idrom'])
      return idro !== null && Number(idro) === Number(relationId)
    })
    if (!match) return null
    const key = resolveLimitIdKey(codProp)
    if (!key) return null
    const obj = asRecord(match)
    const id = pickNumber(obj, [key])
    return id !== null ? Number(id) : null
  } catch {
    return null
  }
}

async function saveParamComponentValue(
  relationId: number,
  relationName: string,
  { codProp, value, valueId }: SaveParamComponentValuePayload,
) {
  if (value === null || value === undefined) return

  const candidateId =
    (await getIdValFromLoadParamsComponent(relationId, codProp)) ?? valueId ?? null
  const hasExistingValue = candidateId !== null && candidateId !== undefined
  const relationOwn = Number(relationId)
  const ensuredRelationOwn = Number.isFinite(relationOwn) ? relationOwn : relationId

  const basePayload: Record<string, unknown> = {
    name: relationName,
    codProp,
    own: ensuredRelationOwn,
    isObj: 0,
    val: String(value),
    mode: hasExistingValue ? 'upd' : 'ins',
  }

  if (hasExistingValue) {
    const numericId = Number(candidateId)
    const ensuredId = Number.isFinite(numericId) ? numericId : (candidateId as number)
    basePayload.idPropVal = ensuredId
    ;(basePayload as Record<string, unknown>).idVal = ensuredId

    if (typeof codProp === 'string' && codProp.startsWith('Prop_')) {
      const specificIdKey = `id${codProp.slice('Prop_'.length)}`
      basePayload[specificIdKey] = ensuredId
    }
  }

  try {
    await rpcWithDebug(
      'data/saveParamComponentValue',
      [basePayload],
      `Сохранение значения ${codProp}`,
    )
  } catch (error) {
    throw error
  }
}

function buildUpdatedDetails(
  prev: ParameterDetails,
  updates: Partial<ParameterDetails>,
): ParameterDetails {
  return {
    id: updates.id ?? prev.id,
    cls: updates.cls ?? prev.cls,
    accessLevel: updates.accessLevel ?? prev.accessLevel,
    measureRecordId: updates.measureRecordId ?? prev.measureRecordId,
    measureId: updates.measureId ?? prev.measureId,
    measurePv: updates.measurePv ?? prev.measurePv,
    sourceRecordId: updates.sourceRecordId ?? prev.sourceRecordId,
    sourceObjId: updates.sourceObjId ?? prev.sourceObjId,
    sourcePv: updates.sourcePv ?? prev.sourcePv,
    descriptionRecordId: updates.descriptionRecordId ?? prev.descriptionRecordId,
    componentRelationId: updates.componentRelationId ?? prev.componentRelationId,
    componentRelationName: updates.componentRelationName ?? prev.componentRelationName,
    componentCls: updates.componentCls ?? prev.componentCls,
    componentRelcls: updates.componentRelcls ?? prev.componentRelcls,
    componentRcm: updates.componentRcm ?? prev.componentRcm,
    componentEnt: updates.componentEnt ?? prev.componentEnt,
    limitMaxId: updates.limitMaxId ?? prev.limitMaxId,
    limitMinId: updates.limitMinId ?? prev.limitMinId,
    limitNormId: updates.limitNormId ?? prev.limitNormId,
  }
}

export async function updateParameter(
  payload: UpdateParameterPayload,
): Promise<LoadedObjectParameter> {
  const name = payload.name.trim()
  if (!name) throw new Error('Укажите наименование параметра')

  const descriptionRaw = payload.description ?? ''
  const descriptionTrimmed = descriptionRaw.trim()
  const descriptionForResult = descriptionTrimmed || null

  const commentRaw = payload.limits.comment ?? ''
  const commentTrimmed = commentRaw.trim()
  const commentForResult = commentTrimmed || null

  const limitMax = ensureFiniteNumber(payload.limits.max)
  const limitMin = ensureFiniteNumber(payload.limits.min)
  const limitNorm = ensureFiniteNumber(payload.limits.norm)

  const details = payload.details
  if (!details.id) throw new Error('Не удалось определить идентификатор параметра для обновления')

  const accessLevel = details.accessLevel ?? payload.accessLevel ?? DEFAULT_ACCESS_LEVEL
  const cls = details.cls ?? DEFAULT_PARAMETER_CLASS

  const paramsPayload: Record<string, unknown> = {
    accessLevel,
    id: details.id,
    cls,
    name,
    objCollections: payload.source.id,
    pvCollections: payload.source.pv,
    meaParamsMeasure: payload.measure.id,
    pvParamsMeasure: payload.measure.pv,
    ParamsDescription: descriptionTrimmed,
  }

  if (details.sourceRecordId !== null) paramsPayload.idCollections = details.sourceRecordId
  if (details.measureRecordId !== null) paramsPayload.idParamsMeasure = details.measureRecordId
  if (details.descriptionRecordId !== null)
    paramsPayload.idParamsDescription = details.descriptionRecordId

  const saveParamsResponse = await rpcWithDebug(
    'data/saveParams',
    ['upd', paramsPayload],
    'Обновление параметра: сохранение основной записи',
  )

  const saveRecords = extractArray<Record<string, unknown>>(saveParamsResponse)
  const saveRecord = saveRecords[0] ? asRecord(saveRecords[0]) : null

  const nextSourceRecordId = saveRecord
    ? (pickNumber(saveRecord, ['idCollections']) ?? details.sourceRecordId)
    : details.sourceRecordId
  const nextMeasureRecordId = saveRecord
    ? (pickNumber(saveRecord, ['idParamsMeasure']) ?? details.measureRecordId)
    : details.measureRecordId
  const nextDescriptionRecordId = saveRecord
    ? (pickNumber(saveRecord, ['idParamsDescription']) ?? details.descriptionRecordId)
    : details.descriptionRecordId

  const relationId = details.componentRelationId
  if (!relationId)
    throw new Error('Не удалось определить идентификатор связи параметра и компонента')
  console.debug('limit IDs before save', {
    max: details.limitMaxId,
    min: details.limitMinId,
    norm: details.limitNormId,
  })
  const relationName = `${name} <=> ${payload.component.name}`

  await saveParamComponentValue(relationId, relationName, {
    codProp: 'Prop_ParamsLimitMax',
    value: limitMax,
    valueId: details.limitMaxId,
  })
  await saveParamComponentValue(relationId, relationName, {
    codProp: 'Prop_ParamsLimitMin',
    value: limitMin,
    valueId: details.limitMinId,
  })
  await saveParamComponentValue(relationId, relationName, {
    codProp: 'Prop_ParamsLimitNorm',
    value: limitNorm,
    valueId: details.limitNormId,
  })

  await rpcWithDebug(
    'data/editRelObj',
    [
      {
        id: relationId,
        name: relationName,
        cmt: commentTrimmed,
      },
    ],
    'Обновление параметра: сохранение комментария связи',
  )

  const refreshed = await rpcWithDebug<RpcParamsComponentRecord[], [number]>(
    'data/loadParamsComponent',
    [REL_TYP_PARAMS_COMPONENT],
    'Обновление параметра: загрузка обновлённых связей',
  )
  const refreshedRecords = extractArray<RpcParamsComponentRecord>(refreshed)
  const refreshedRelation = refreshedRecords.find((record) => {
    const recordObject = asRecord(record)
    const idro = pickNumber(recordObject, ['id', 'idro'])
    return idro !== null && Number(idro) === relationId
  })

  let limitMaxId = details.limitMaxId
  let limitMinId = details.limitMinId
  let limitNormId = details.limitNormId
  let noteFromRelation: string | null = commentForResult

  if (refreshedRelation) {
    const refreshedObject = asRecord(refreshedRelation)
    const maxId = pickNumber(refreshedObject, ['idParamsLimitMax'])
    const minId = pickNumber(refreshedObject, ['idParamsLimitMin'])
    const normId = pickNumber(refreshedObject, ['idParamsLimitNorm'])
    if (maxId !== null) limitMaxId = Number(maxId)
    if (minId !== null) limitMinId = Number(minId)
    if (normId !== null) limitNormId = Number(normId)
    const refreshedComment = pickString(refreshedObject, ['cmt', 'comment', 'note'])
    if (refreshedComment !== null && refreshedComment !== undefined && refreshedComment.trim()) {
      noteFromRelation = refreshedComment
    }
  }

  const updatedDetails = buildUpdatedDetails(details, {
    accessLevel,
    sourceRecordId: nextSourceRecordId !== null ? Number(nextSourceRecordId) : null,
    measureId: payload.measure.id,
    measurePv: payload.measure.pv,
    measureRecordId: nextMeasureRecordId !== null ? Number(nextMeasureRecordId) : null,
    sourceObjId: payload.source.id,
    sourcePv: payload.source.pv,
    componentRelationName: relationName,
    descriptionRecordId:
      nextDescriptionRecordId !== null
        ? Number(nextDescriptionRecordId)
        : details.descriptionRecordId,
    componentCls: payload.component.cls,
    componentRelcls: payload.component.relcls,
    componentRcm: payload.component.rcm,
    componentEnt: payload.component.ent,
    limitMaxId,
    limitMinId,
    limitNormId,
  })

  return {
    id: String(payload.id),
    name,
    code: null,
    valueType: 'number',
    unitId: String(payload.measure.pv),
    sourceId: String(payload.source.id),
    componentId: payload.component ? String(payload.component.ent) : null,
    minValue: limitMin,
    maxValue: limitMax,
    normValue: limitNorm,
    isRequired: false,
    note: noteFromRelation,
    description: descriptionForResult,
    unitName: payload.measure.name,
    sourceName: payload.source.name,
    componentName: payload.component.name,
    details: updatedDetails,
  }
}

export async function deleteParameter({ id, relationId }: DeleteParameterPayload): Promise<void> {
  if (!Number.isFinite(id)) throw new Error('Не определён идентификатор параметра для удаления')

  if (relationId && Number.isFinite(relationId)) {
    const relationResponse = await rpcWithDebug(
      'data/deleteOwner',
      [Number(relationId), 0],
      'Удаление параметра: удаление связи параметр-компонент',
    )
    const relationError = extractRpcFailureReason(relationResponse)
    if (relationError) {
      throw new Error(`Невозможно удалить связь параметра с компонентом: ${relationError}`)
    }
  }

  const parameterResponse = await rpcWithDebug(
    'data/deleteOwnerWithProperties',
    [Number(id), 1],
    'Удаление параметра: удаление записи параметра',
  )
  const parameterError = extractRpcFailureReason(parameterResponse)
  if (parameterError) {
    throw new Error(`Параметр не удалён: ${parameterError}`)
  }
}
