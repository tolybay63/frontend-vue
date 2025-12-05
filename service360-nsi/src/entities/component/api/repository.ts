/** Файл: src/entities/component/api/repository.ts
 *  Назначение: RPC-доступ к справочнику компонентов и управлению связями с типами, параметрами и дефектами.
 *  Использование: импортировать функции снапшота и CRUD из @entities/component.
 */
import { rpc } from '@shared/api'
import {
  extractRecords,
  firstRecord,
  normalizeText,
  trimmedString,
  toOptionalString,
} from '@shared/lib'
import { listDefectCategories } from '@entities/object-defect'
import type { DefectCategoryOption, RawDefectRecord } from '@entities/object-defect'

import type {
  Component,
  ComponentRelation,
  ComponentsSnapshot,
  CreateComponentPayload,
  DirectoryOptionWithMeta,
  LoadedComponentWithRelations,
  UpdateComponentPayload,
} from '../model/types'
import type { ComponentRecord, ComponentSaveRecord } from '../model/dto'

const LOAD_COMPONENTS_METHOD = 'data/loadComponents'
const LOAD_DEFECTS_METHOD = 'data/loadDefects'
const SAVE_COMPONENTS_METHOD = 'data/saveComponents'
const DELETE_COMPONENTS_METHOD = 'data/deleteOwnerWithProperties'

const OBJECT_TYPE_REL_ARGS = ['RT_Components', 'Typ_ObjectTyp', 'Typ_Components'] as const
const PARAMETER_REL_ARGS = ['RT_ParamsComponent', 'Typ_Parameter', 'Typ_Components'] as const

interface RawRelationRecord {
  idro?: string | number | null
  idrom1?: string | number | null
  clsrom1?: string | number | null
  namerom1?: string | null
  idrom2?: string | number | null
  clsrom2?: string | number | null
  namerom2?: string | null
}

interface InternalComponentRecord {
  id: string
  numericId: number | null
  cls: string | null
  numericCls: number | null
  accessLevel: number | null
  name: string
  objectTypeLinks: ComponentRelation[]
  parameterLinks: ComponentRelation[]
  defectLinks: ComponentRelation[]
}

const memoryComponents = new Map<string, InternalComponentRecord>()
const memoryObjectTypes = new Map<string, DirectoryOptionWithMeta>()
const memoryParameters = new Map<string, DirectoryOptionWithMeta>()
const memoryDefects = new Map<string, DirectoryOptionWithMeta>()

let lastComponentId = 0
let lastObjectTypeId = 0
let lastParameterId = 0
let lastDefectId = 0

const toFiniteNumber = (value: unknown): number | null => {
  const num = typeof value === 'number' ? value : Number(String(value ?? '').trim())
  return Number.isFinite(num) ? num : null
}

const normalizeName = (value: string | null | undefined, fallback: string): string => {
  const primary = trimmedString(value)
  if (primary) return primary
  return fallback
}

function ensureDirectoryOption(
  map: Map<string, DirectoryOptionWithMeta>,
  id: string,
  name: string,
  cls?: string | null,
  extras?: Partial<DirectoryOptionWithMeta>,
): DirectoryOptionWithMeta {
  const normalizedId = id.trim()
  const existing = map.get(normalizedId)
  if (existing) {
    if (extras) {
      map.set(normalizedId, { ...existing, ...extras })
    }
    return map.get(normalizedId) ?? existing
  }
  const option: DirectoryOptionWithMeta = {
    id: normalizedId,
    name: normalizeName(name, normalizedId),
    cls: cls ?? null,
    ...extras,
  }
  map.set(normalizedId, option)
  return option
}

const createRelation = (
  option: DirectoryOptionWithMeta,
  relationId: string | null,
): ComponentRelation => ({
  id: option.id,
  name: option.name,
  cls: option.cls ?? null,
  relationId,
  categoryId: option.categoryId ?? null,
  categoryName: option.categoryName ?? null,
})

function composeSnapshotFromMemory(): ComponentsSnapshot {
  const items = Array.from(memoryComponents.values())
    .map<LoadedComponentWithRelations>((record) => ({
      id: record.id,
      cls: record.cls,
      name: record.name,
      objectTypes: record.objectTypeLinks.map((link) => ({ ...link })),
      parameters: record.parameterLinks.map((link) => ({ ...link })),
      defects: record.defectLinks.map((link) => ({ ...link })),
      details: {
        id: record.numericId ?? toFiniteNumber(record.id) ?? 0,
        cls: record.numericCls ?? toFiniteNumber(record.cls) ?? null,
        accessLevel: record.accessLevel ?? 1,
      },
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'))

  const sortOptions = (map: Map<string, DirectoryOptionWithMeta>) =>
    Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'ru'))

  return {
    items,
    objectTypes: sortOptions(memoryObjectTypes),
    parameters: sortOptions(memoryParameters),
    defects: sortOptions(memoryDefects),
  }
}

function resetCounters() {
  lastComponentId = 0
  lastObjectTypeId = 0
  lastParameterId = 0
  lastDefectId = 0
}

function bumpCounters() {
  for (const record of memoryComponents.values()) {
    const numId = toFiniteNumber(record.id)
    if (numId != null) lastComponentId = Math.max(lastComponentId, numId)
  }
  for (const option of memoryObjectTypes.values()) {
    const numId = toFiniteNumber(option.id)
    if (numId != null) lastObjectTypeId = Math.max(lastObjectTypeId, numId)
  }
  for (const option of memoryParameters.values()) {
    const numId = toFiniteNumber(option.id)
    if (numId != null) lastParameterId = Math.max(lastParameterId, numId)
  }
  for (const option of memoryDefects.values()) {
    const numId = toFiniteNumber(option.id)
    if (numId != null) lastDefectId = Math.max(lastDefectId, numId)
  }
}

function updateMemoryFromRemote(
  componentsRaw: ComponentRecord[],
  typeLinks: RawRelationRecord[],
  parameterLinks: RawRelationRecord[],
  defectRecords: RawDefectRecord[],
  categories: DefectCategoryOption[],
) {
  memoryComponents.clear()
  memoryObjectTypes.clear()
  memoryParameters.clear()
  memoryDefects.clear()
  resetCounters()

  const categoriesByFv = new Map<string, DefectCategoryOption>()
  for (const category of categories) categoriesByFv.set(category.fvId, category)

  for (const raw of componentsRaw) {
    const id = toOptionalString(raw.id ?? raw.ID ?? raw.number)
    const name = toOptionalString(raw.name ?? raw.NAME)
    if (!id || !name) continue
    const cls = toOptionalString(raw.cls ?? raw.CLS)
    const numericId = toFiniteNumber(id)
    const numericCls = toFiniteNumber(cls)

    memoryComponents.set(id, {
      id,
      numericId,
      cls,
      numericCls,
      accessLevel: 1,
      name: normalizeName(name, id),
      objectTypeLinks: [],
      parameterLinks: [],
      defectLinks: [],
    })
  }

  const ensureComponent = (componentId: string): InternalComponentRecord | null => {
    const record = memoryComponents.get(componentId)
    if (record) return record
    const numericId = toFiniteNumber(componentId)
    const entry: InternalComponentRecord = {
      id: componentId,
      numericId,
      cls: null,
      numericCls: null,
      accessLevel: 1,
      name: componentId,
      objectTypeLinks: [],
      parameterLinks: [],
      defectLinks: [],
    }
    memoryComponents.set(componentId, entry)
    return entry
  }

  for (const rel of typeLinks) {
    const componentId = toOptionalString(rel.idrom2)
    const typeId = toOptionalString(rel.idrom1)
    if (!componentId || !typeId) continue

    const record = ensureComponent(componentId)
    if (!record) continue

    const typeName = toOptionalString(rel.namerom1) ?? typeId
    const option = ensureDirectoryOption(
      memoryObjectTypes,
      typeId,
      typeName,
      toOptionalString(rel.clsrom1),
    )

    const relationId = toOptionalString(rel.idro)
    record.objectTypeLinks.push(createRelation(option, relationId))
  }

  for (const rel of parameterLinks) {
    const componentId = toOptionalString(rel.idrom2)
    const parameterId = toOptionalString(rel.idrom1)
    if (!componentId || !parameterId) continue

    const record = ensureComponent(componentId)
    if (!record) continue

    const paramName = toOptionalString(rel.namerom1) ?? parameterId
    const option = ensureDirectoryOption(
      memoryParameters,
      parameterId,
      paramName,
      toOptionalString(rel.clsrom1),
    )

    const relationId = toOptionalString(rel.idro)
    record.parameterLinks.push(createRelation(option, relationId))
  }

  for (const raw of defectRecords) {
    const componentId = toOptionalString(
      raw.objDefectsComponent ?? raw.pvDefectsComponent ?? raw.idDefectsComponent,
    )
    if (!componentId) continue

    const record = ensureComponent(componentId)
    if (!record) continue

    const defectId =
      toOptionalString(raw.id ?? raw.idDefects ?? raw.ID ?? raw.number) ??
      toOptionalString(raw.pvDefectsComponent) ??
      toOptionalString(raw.idDefectsComponent)
    if (!defectId) continue

    const defectName = normalizeName(
      raw.name ?? raw.DefectsName ?? raw.nameDefects ?? raw.nameDefectsComponent,
      defectId,
    )

    const categoryId =
      toOptionalString(raw.fvDefectsCategory ?? raw.pvDefectsCategory) ?? undefined
    const categoryOption = categoryId ? categoriesByFv.get(categoryId) : undefined
    const categoryName =
      categoryOption?.name ?? raw.nameDefectsCategory ?? categoryOption?.pvId ?? null

    const option = ensureDirectoryOption(memoryDefects, defectId, defectName, toOptionalString(raw.cls), {
      categoryId: categoryId ?? null,
      categoryName: categoryName ?? null,
    })

    const relationId = toOptionalString(raw.idDefectsComponent ?? raw.pvDefectsComponent)
    record.defectLinks.push(createRelation(option, relationId))
  }

  bumpCounters()
}

export interface CreatedComponentPayload {
  id: number
  cls: number
  name: string
}

function toCreatedPayload(record: ComponentSaveRecord | null, fallbackName: string): CreatedComponentPayload {
  if (!record) throw new Error('Нет ответа с созданным компонентом')
  const idValue = toOptionalString(record.id ?? record.ID ?? record.number)
  const clsValue = toOptionalString(record.cls ?? record.CLS) ?? '1027'
  const nameValue = toOptionalString(record.name ?? record.NAME) ?? fallbackName
  if (!idValue) throw new Error('Нет идентификатора созданного компонента')
  return {
    id: Number(idValue),
    cls: Number(clsValue),
    name: nameValue,
  }
}

async function callCreateComponent(name: string): Promise<CreatedComponentPayload> {
  const response = await rpc<ComponentSaveRecord | { result?: ComponentSaveRecord }>(
    SAVE_COMPONENTS_METHOD,
    [
      'ins',
      {
        accessLevel: 1,
        cls: 1027,
        name,
      },
    ],
  )

  const record = firstRecord<ComponentSaveRecord>(response)
  return toCreatedPayload(record, name)
}

function applyPayload(
  record: InternalComponentRecord,
  payload: CreateComponentPayload | UpdateComponentPayload,
) {
  const safeName = trimmedString(payload.name) || `Компонент ${record.id}`
  record.name = safeName

  const existingTypeById = new Map(record.objectTypeLinks.map((rel) => [rel.id, rel]))
  record.objectTypeLinks = payload.objectTypeIds.map((id) => {
    const option =
      memoryObjectTypes.get(id) ?? ensureDirectoryOption(memoryObjectTypes, id, id, null)
    const preserved = existingTypeById.get(id)
    return preserved ? { ...preserved, name: option.name, cls: option.cls ?? null } : createRelation(option, null)
  })

  const existingParamById = new Map(record.parameterLinks.map((rel) => [rel.id, rel]))
  record.parameterLinks = payload.parameterIds.map((id) => {
    const option =
      memoryParameters.get(id) ?? ensureDirectoryOption(memoryParameters, id, id, null)
    const preserved = existingParamById.get(id)
    return preserved ? { ...preserved, name: option.name, cls: option.cls ?? null } : createRelation(option, null)
  })

  const existingDefectById = new Map(record.defectLinks.map((rel) => [rel.id, rel]))
  record.defectLinks = payload.defectIds.map((id) => {
    const option = memoryDefects.get(id) ?? ensureDirectoryOption(memoryDefects, id, id, null)
    const preserved = existingDefectById.get(id)
    return preserved
      ? {
          ...preserved,
          name: option.name,
          cls: option.cls ?? null,
          categoryId: option.categoryId ?? null,
          categoryName: option.categoryName ?? null,
        }
      : createRelation(option, null)
  })
}

function mapInternalToLoaded(record: InternalComponentRecord): LoadedComponentWithRelations {
  return {
    id: record.id,
    cls: record.cls,
    name: record.name,
    objectTypes: record.objectTypeLinks.map((rel) => ({ ...rel })),
    parameters: record.parameterLinks.map((rel) => ({ ...rel })),
    defects: record.defectLinks.map((rel) => ({ ...rel })),
    details: {
      id: record.numericId ?? toFiniteNumber(record.id) ?? 0,
      cls: record.numericCls ?? toFiniteNumber(record.cls) ?? null,
      accessLevel: record.accessLevel ?? 1,
    },
  }
}

export async function fetchComponentsSnapshot(): Promise<ComponentsSnapshot> {
  try {
    const [componentsResp, typeRelResp, parameterRelResp, defectsResp, categories] = await Promise.all([
      rpc<ComponentRecord[]>(LOAD_COMPONENTS_METHOD, [0]),
      rpc<RawRelationRecord[]>(
        'data/loadComponentsObject2',
        OBJECT_TYPE_REL_ARGS,
      ),
      rpc<RawRelationRecord[]>(
        'data/loadComponentsObject2',
        PARAMETER_REL_ARGS,
      ),
      rpc<RawDefectRecord[]>(LOAD_DEFECTS_METHOD, [0]),
      listDefectCategories().catch(() => [] as DefectCategoryOption[]),
    ])

    const componentRecords = extractRecords<ComponentRecord>(componentsResp)
    const typeRelations = extractRecords<RawRelationRecord>(typeRelResp)
    const parameterRelations = extractRecords<RawRelationRecord>(parameterRelResp)
    const defectRecords = extractRecords<RawDefectRecord>(defectsResp)

    updateMemoryFromRemote(componentRecords, typeRelations, parameterRelations, defectRecords, categories)
  } catch (error) {
    console.error('Не удалось загрузить компоненты', error)
  }

  return composeSnapshotFromMemory()
}

export async function listComponents(): Promise<Component[]> {
  const response = await rpc<ComponentRecord[]>(LOAD_COMPONENTS_METHOD, [0])
  const raw = extractRecords<ComponentRecord>(response)
  return raw
    .map<Component | null>((item) => {
      const id = toOptionalString(item.id ?? item.ID ?? item.number)
      const name = toOptionalString(item.name ?? item.NAME)
      if (!id || !name) return null
      return { id, name }
    })
    .filter((item): item is Component => item != null)
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
}

export async function createComponent(name: string): Promise<Component> {
  const created = await callCreateComponent(name)
  return {
    id: String(created.id),
    name: created.name,
  }
}

export async function createComponentIfMissing(name: string): Promise<CreatedComponentPayload> {
  return await callCreateComponent(name)
}

export async function createComponentEntry(
  payload: CreateComponentPayload,
): Promise<LoadedComponentWithRelations> {
  const baseName = trimmedString(payload.name) || 'Новый компонент'
  let created: CreatedComponentPayload
  try {
    created = await callCreateComponent(baseName)
  } catch (error) {
    console.error(error)
    lastComponentId += 1
    created = { id: lastComponentId, cls: 1027, name: baseName }
  }

  const record: InternalComponentRecord = {
    id: String(created.id),
    numericId: created.id,
    cls: String(created.cls),
    numericCls: created.cls,
    accessLevel: 1,
    name: created.name,
    objectTypeLinks: [],
    parameterLinks: [],
    defectLinks: [],
  }

  applyPayload(record, payload)
  memoryComponents.set(record.id, record)
  return mapInternalToLoaded(record)
}

export async function updateComponentEntry(
  payload: UpdateComponentPayload,
): Promise<LoadedComponentWithRelations> {
  const id = String(payload.id)
  const existing = memoryComponents.get(id)
  if (!existing) {
    const created = await createComponentEntry(payload)
    return created
  }

  try {
    await rpc(SAVE_COMPONENTS_METHOD, [
      'upd',
      {
        id: payload.id,
        cls: payload.cls ?? existing.numericCls ?? 1027,
        accessLevel: payload.details.accessLevel ?? existing.accessLevel ?? 1,
        name: payload.name,
      },
    ])
  } catch (error) {
    console.error('Не удалось обновить компонент', error)
  }

  applyPayload(existing, payload)
  memoryComponents.set(id, existing)
  return mapInternalToLoaded(existing)
}

export async function deleteComponentEntry(id: number | string): Promise<void> {
  const key = String(id)
  memoryComponents.delete(key)
  try {
    await rpc(DELETE_COMPONENTS_METHOD, [Number(id), 1])
  } catch (error) {
    console.error('Не удалось удалить компонент', error)
  }
}

function generateId(source: 'objectType' | 'parameter' | 'defect'): string {
  switch (source) {
    case 'objectType':
      lastObjectTypeId += 1
      return String(lastObjectTypeId)
    case 'parameter':
      lastParameterId += 1
      return String(lastParameterId)
    case 'defect':
      lastDefectId += 1
      return String(lastDefectId)
    default:
      return String(Date.now())
  }
}

export async function createObjectTypeOnTheFly(name: string): Promise<DirectoryOptionWithMeta> {
  const trimmed = trimmedString(name) || 'Новый тип объекта'
  const existing = Array.from(memoryObjectTypes.values()).find(
    (option) => normalizeText(option.name) === normalizeText(trimmed),
  )
  if (existing) return existing
  const id = generateId('objectType')
  const option = ensureDirectoryOption(memoryObjectTypes, id, trimmed, '1100')
  return option
}

export async function createParameterOnTheFly(name: string): Promise<DirectoryOptionWithMeta> {
  const trimmed = trimmedString(name) || 'Новый параметр'
  const existing = Array.from(memoryParameters.values()).find(
    (option) => normalizeText(option.name) === normalizeText(trimmed),
  )
  if (existing) return existing
  const id = generateId('parameter')
  const option = ensureDirectoryOption(memoryParameters, id, trimmed, '1041')
  return option
}

export async function createDefectOnTheFly(name: string): Promise<DirectoryOptionWithMeta> {
  const trimmed = trimmedString(name) || 'Новый дефект'
  const existing = Array.from(memoryDefects.values()).find(
    (option) => normalizeText(option.name) === normalizeText(trimmed),
  )
  if (existing) return existing
  const id = generateId('defect')
  const option = ensureDirectoryOption(memoryDefects, id, trimmed, '1034')
  return option
}
