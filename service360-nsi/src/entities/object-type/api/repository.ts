/** Файл: src/entities/object-type/api/repository.ts
 *  Назначение: инкапсулировать RPC-вызовы и маппинг для типов объектов и их связей.
 *  Использование: вызывать из фич и страниц для загрузки списков и выполнения CRUD.
 */
import { rpc } from '@shared/api'
import { extractRecords, firstRecord, normalizeText, trimmedString, toOptionalString } from '@shared/lib'
import type { ComponentOption } from '@entities/component'
import {
  normalizeGeometry,
  type RawComponentRecord,
  type RawGeometryRecord,
  type RawObjectTypeRecord,
  type RawRelRecord,
  type SaveObjectTypeRecord,
} from '../model/dto'
import type {
  ComponentLink,
  GeometryKind,
  GeometryPair,
  LoadedObjectType,
  ObjectTypesSnapshot,
} from '../model/types'
export const COMPONENT_REL_ARGS = ['RT_Components', 'Typ_ObjectTyp', 'Typ_Components'] as const
export type ComponentRelCode = typeof COMPONENT_REL_ARGS[0] // 'RT_Components'


function buildGeometryOptions(raw: RawGeometryRecord[]): Array<{
  id: string
  name: string
  code?: string | null
  value?: string | null
}> {
  return raw.map((option) => {
    const id = toOptionalString(option.id ?? option.ID) ?? ''
    const displayName =
      trimmedString(option.name ?? option.value ?? option.code) || id
    return {
      id,
      name: displayName,
      code: toOptionalString(option.code),
      value: toOptionalString(option.value),
    }
  })
}

function detectGeometryPairs(
  raw: RawGeometryRecord[],
  geometryOptions: Array<{
    id: string
    name: string
    code?: string | null
    value?: string | null
  }>,
): {
  geometryKindByFvId: Map<string, GeometryKind>
  geometryKindByPvId: Map<string, GeometryKind>
  geometryPairByKind: Partial<Record<GeometryKind, GeometryPair>>
} {
  const geometryKindByFvId = new Map<string, GeometryKind>()
  const geometryKindByPvId = new Map<string, GeometryKind>()
  const geometryPairByKind: Partial<Record<GeometryKind, GeometryPair>> = {}

  for (const option of raw) {
    const fvId = toOptionalString(option.id ?? option.ID)
    const pvId = toOptionalString(option.pv ?? option.PV)
    const geometryLabel = option.name ?? option.value ?? option.code ?? option.id ?? option.ID ?? ''
    const kind = normalizeGeometry(geometryLabel, geometryOptions)
    const prev = geometryPairByKind[kind] ?? { fv: null, pv: null }
    geometryPairByKind[kind] = {
      fv: prev.fv ?? fvId ?? null,
      pv: prev.pv ?? pvId ?? null,
    }

    if (fvId) geometryKindByFvId.set(fvId, kind)
    if (pvId) geometryKindByPvId.set(pvId, kind)
  }

  return { geometryKindByFvId, geometryKindByPvId, geometryPairByKind }
}

function mapRelRecords(raw: RawRelRecord[]) {
  const componentsByType = new Map<string, ComponentOption[]>()
  const linksByType = new Map<string, Array<{ compId: string; linkId: string }>>()
  const componentOptions = new Map<string, ComponentOption>()

  for (const rel of raw) {
    const typeId = toOptionalString(rel.idrom1)
    const compId = toOptionalString(rel.idrom2)
    const compName = toOptionalString(rel.namerom2)
    const idro = toOptionalString(rel.idro)
    if (!typeId || !compId || !compName || !idro) continue

    const option: ComponentOption = { id: compId, name: compName }
    componentOptions.set(compId, option)

    const current = componentsByType.get(typeId) ?? []
    if (!current.some((item) => item.id === compId)) current.push(option)
    componentsByType.set(typeId, current)

    const relEntries = linksByType.get(typeId) ?? []
    relEntries.push({ compId, linkId: idro })
    linksByType.set(typeId, relEntries)
  }

  return { componentsByType, linksByType, componentOptions }
}

function composeAllComponents(
  raw: RawComponentRecord[],
  fromRels: Map<string, ComponentOption>,
): ComponentOption[] {
  const map = new Map<string, ComponentOption>()

  for (const option of fromRels.values()) map.set(normalizeText(option.name), option)

  for (const record of raw) {
    const id = toOptionalString(record.id ?? record.ID ?? record.number)
    const name = toOptionalString(record.name ?? record.NAME)
    if (!id || !name) continue
    const key = normalizeText(name)
    if (!map.has(key)) map.set(key, { id, name })
  }

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'ru'))
}

function mapObjectTypes(
  raw: RawObjectTypeRecord[],
  geometryOptions: ReturnType<typeof buildGeometryOptions>,
  geometryKindByFvId: Map<string, GeometryKind>,
  geometryKindByPvId: Map<string, GeometryKind>,
  componentsByType: Map<string, ComponentOption[]>,
): LoadedObjectType[] {
  return raw
    .map<LoadedObjectType | null>((record) => {
      const id = toOptionalString(record.id ?? record.number)
      if (!id) return null

      const name = trimmedString(record.name ?? record.nameCls ?? '') || id
      const fvShape = toOptionalString(record.fvShape)
      const pvShape = toOptionalString(record.pvShape)

      const geometry =
        (fvShape && geometryKindByFvId.get(fvShape)) ||
        (pvShape && geometryKindByPvId.get(pvShape)) ||
        normalizeGeometry(record.fvShape ?? record.pvShape ?? record.name ?? '', geometryOptions)

      const relatedComponents = componentsByType.get(id) ?? []

      return {
        id,
        name,
        geometry,
        component: relatedComponents.map((item) => item.name),
        cls: toOptionalString(record.cls),
        idShape: toOptionalString(record.idShape),
        number: toOptionalString(record.number),
      }
    })
    .filter((item): item is LoadedObjectType => Boolean(item))
}

export async function fetchObjectTypesSnapshot(): Promise<ObjectTypesSnapshot> {
  const [typesResp, geometryResp, relResp, allComponentsResp] = await Promise.all([
    rpc('data/loadTypesObjects', [0]),
    rpc('data/loadFvForSelect', ['Factor_Shape']),
    rpc('data/loadComponentsObject2', COMPONENT_REL_ARGS),
    rpc('data/loadComponents', [0]),
  ])

  const rawTypes = extractRecords<RawObjectTypeRecord>(typesResp)
  const rawGeometry = extractRecords<RawGeometryRecord>(geometryResp)
  const rawRelations = extractRecords<RawRelRecord>(relResp)
  const rawAllComponents = extractRecords<RawComponentRecord>(allComponentsResp)

  const geometryOptions = buildGeometryOptions(rawGeometry)
  const { geometryPairByKind, geometryKindByFvId, geometryKindByPvId } = detectGeometryPairs(
    rawGeometry,
    geometryOptions,
  )

  const { componentsByType, linksByType, componentOptions } = mapRelRecords(rawRelations)
  const allComponents = composeAllComponents(rawAllComponents, componentOptions)

  const items = mapObjectTypes(
    rawTypes,
    geometryOptions,
    geometryKindByFvId,
    geometryKindByPvId,
    componentsByType,
  )

  const componentsRecord: Record<string, ComponentOption[]> = {}
  for (const [typeId, options] of componentsByType.entries()) {
    componentsRecord[typeId] = [...options].sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  }

  const linksRecord: Record<string, Array<{ compId: string; linkId: string }>> = {}
  for (const [typeId, rels] of linksByType.entries()) {
    linksRecord[typeId] = rels
  }

  return {
    items,
    componentsByType: componentsRecord,
    geometryOptions,
    geometryPairByKind,
    allComponents,
    linksByType: linksRecord,
  }
}

export async function listComponentLinks(): Promise<ComponentLink[]> {
  const response = await rpc('data/loadComponentsObject2', COMPONENT_REL_ARGS)
  const rawRelations = extractRecords<RawRelRecord>(response)

  return rawRelations
    .map<ComponentLink | null>((record) => {
      const idro = toOptionalString(record.idro)
      const typeId = toOptionalString(record.idrom1)
      const typeName = toOptionalString(record.namerom1)
      const componentId = toOptionalString(record.idrom2)
      const componentName = toOptionalString(record.namerom2)
      if (!idro || !typeId || !componentId || !componentName) return null

      return {
        idro: Number(idro),
        typeId,
        typeName: typeName ?? '',
        componentId,
        componentName,
      }
    })
    .filter((item): item is ComponentLink => item != null)
}

export async function createTypeIns(payload: {
  name: string
  fullName?: string
  fvShape: number | string | null
  pvShape: number | string | null
}): Promise<{ id: number; cls: number }> {
  const response = await rpc<SaveObjectTypeRecord | { result?: SaveObjectTypeRecord }>('data/saveTypesObjects', [
    'ins',
    {
      accessLevel: 1,
      name: payload.name,
      fullName: payload.fullName ?? payload.name,
      fvShape: payload.fvShape,
      pvShape: payload.pvShape,
    },
  ])
  const record = firstRecord<SaveObjectTypeRecord>(response)
  if (!record) throw new Error('Пустой ответ при создании типа объекта')
  const idValue = toOptionalString(record.id ?? record.ID ?? record.number)
  const clsValue = toOptionalString(record.cls ?? record.CLS)
  if (!idValue || !clsValue) throw new Error('Нет идентификаторов созданного типа объекта')
  return {
    id: Number(idValue),
    cls: Number(clsValue),
  }
}

export async function updateTypeGeometry(payload: {
  id: number | string
  cls: number | string
  name: string
  fvShape: number | string | null
  pvShape: number | string | null
  idShape?: number | string | null
  number?: number | string | null
}): Promise<void> {
  await rpc('data/saveTypesObjects', [
    'upd',
    {
      accessLevel: 1,
      number: payload.number ?? 1,
      id: payload.id,
      cls: payload.cls,
      name: payload.name,
      nameCls: payload.name,
      idShape: payload.idShape ?? 0,
      pvShape: payload.pvShape ?? 0,
      fvShape: payload.fvShape ?? 0,
    },
  ])
}

export async function deleteType(id: number | string): Promise<void> {
  await rpc('data/deleteTypesObjects', [id])
}

export async function linkComponent(payload: {
  uch1: number | string
  cls1: number | string
  uch2: number | string
  cls2: number | string
  codRelTyp: ComponentRelCode
  name: string
}): Promise<void> {
  await rpc('data/saveRelObj', [payload])
}

export async function unlinkRelationByIdro(idro: number | string): Promise<void> {
  await rpc('data/deleteOwnerWithProperties', [idro, 0])
}
