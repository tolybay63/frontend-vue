/** Файл: src/entities/object-defect/api/repository.ts
 *  Назначение: RPC-доступ к справочнику дефектов объектов и сопутствующим словарям.
 *  Использование: вызывать из фич и страниц для загрузки списков, форм и выполнения CRUD.
 */
import { rpc } from '@shared/api'
import {
  extractRecords,
  firstRecord,
  normalizeText,
  trimmedString,
  toOptionalString,
} from '@shared/lib'
import {
  normalizeDefectIndex,
  normalizeDefectName,
  normalizeDefectNote,
  normalizeOptionName,
  type RawDefectCategoryRecord,
  type RawDefectComponentRecord,
  type RawDefectRecord,
  type SaveDefectRecord,
} from '../model/dto'
import type {
  CreateObjectDefectPayload,
  DefectCategoryOption,
  DefectComponentOption,
  LoadedObjectDefect,
  ObjectDefect,
  ObjectDefectsSnapshot,
  UpdateObjectDefectPayload,
} from '../model/types'

const LOAD_DEFECTS_METHOD = 'data/loadDefects'
const LOAD_COMPONENT_DEFECT_METHOD = 'data/loadComponentDefect'
const LOAD_CATEGORIES_METHOD = 'data/loadFvForSelect'
const SAVE_DEFECTS_METHOD = 'data/saveDefects'
const DELETE_DEFECTS_METHOD = 'data/deleteDefects'
const DELETE_OWNER_WITH_PROPERTIES_METHOD = 'data/deleteOwnerWithProperties'

const COMPONENT_DEFECT_ARGS = ['Typ_Components', 'Prop_DefectsComponent'] as const
const FACTOR_DEFECTS = ['Factor_Defects'] as const

type DirectoryMaps = {
  categoriesByFv: Map<string, DefectCategoryOption>
  categoriesByPv: Map<string, DefectCategoryOption>
  componentsById: Map<string, DefectComponentOption>
  componentsByPv: Map<string, DefectComponentOption>
}

function buildCategoryOptions(
  raw: RawDefectCategoryRecord[],
): {
  options: DefectCategoryOption[]
  categoriesByFv: Map<string, DefectCategoryOption>
  categoriesByPv: Map<string, DefectCategoryOption>
} {
  const unique = new Map<string, DefectCategoryOption>()
  const categoriesByFv = new Map<string, DefectCategoryOption>()
  const categoriesByPv = new Map<string, DefectCategoryOption>()

  for (const record of raw) {
    const fvId =
      toOptionalString(record.fv ?? record.FV ?? record.id ?? record.ID) ?? undefined
    const pvId = toOptionalString(record.pv ?? record.PV) ?? undefined
    if (!fvId || !pvId) continue

    const name =
      normalizeOptionName(record.name ?? record.value ?? record.code, pvId, fvId) ||
      pvId ||
      fvId

    const option: DefectCategoryOption = { fvId, pvId, name }

    const nameKey = normalizeText(name) || pvId || fvId
    const canonical = unique.get(nameKey)
    if (!canonical) {
      unique.set(nameKey, option)
      categoriesByFv.set(fvId, option)
      categoriesByPv.set(pvId, option)
      continue
    }

    categoriesByFv.set(fvId, canonical)
    categoriesByPv.set(pvId, canonical)
  }

  const options = Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name, 'ru'))

  const categoriesByFvSorted = new Map<string, DefectCategoryOption>()
  const categoriesByPvSorted = new Map<string, DefectCategoryOption>()

  for (const [fv, option] of categoriesByFv.entries()) {
    const key = normalizeText(option.name) || option.pvId || option.fvId
    const canonical = unique.get(key) ?? option
    categoriesByFvSorted.set(fv, canonical)
  }

  for (const [pv, option] of categoriesByPv.entries()) {
    const key = normalizeText(option.name) || option.pvId || option.fvId
    const canonical = unique.get(key) ?? option
    categoriesByPvSorted.set(pv, canonical)
  }

  return { options, categoriesByFv: categoriesByFvSorted, categoriesByPv: categoriesByPvSorted }
}

function buildComponentOptions(
  raw: RawDefectComponentRecord[],
): {
  options: DefectComponentOption[]
  componentsById: Map<string, DefectComponentOption>
  componentsByPv: Map<string, DefectComponentOption>
} {
  const unique = new Map<string, DefectComponentOption>()
  const componentsById = new Map<string, DefectComponentOption>()
  const componentsByPv = new Map<string, DefectComponentOption>()

  for (const record of raw) {
    const id =
      toOptionalString(
        record.objDefectsComponent ?? record.id ?? record.ID ?? record.number,
      ) ?? undefined
    if (!id) continue

    const pvId = toOptionalString(record.pvDefectsComponent ?? record.pv ?? record.PV)
    const name =
      normalizeOptionName(
        record.nameDefectsComponent ?? record.name ?? record.NAME,
        pvId ?? undefined,
        id,
      ) || id

    const option: DefectComponentOption = { id, name, pvId: pvId ?? null }

    const nameKey = normalizeText(name) || id
    const canonical = unique.get(nameKey)
    if (!canonical) {
      unique.set(nameKey, option)
      componentsById.set(id, option)
      if (pvId) componentsByPv.set(pvId, option)
      continue
    }

    componentsById.set(id, canonical)
    if (pvId) componentsByPv.set(pvId, canonical)
  }

  const options = Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name, 'ru'))

  const componentsByIdSorted = new Map<string, DefectComponentOption>()
  const componentsByPvSorted = new Map<string, DefectComponentOption>()

  for (const [idValue, option] of componentsById.entries()) {
    const key = normalizeText(option.name) || option.id
    const canonical = unique.get(key) ?? option
    componentsByIdSorted.set(idValue, canonical)
  }

  for (const [pvValue, option] of componentsByPv.entries()) {
    const key = normalizeText(option.name) || option.id
    const canonical = unique.get(key) ?? option
    componentsByPvSorted.set(pvValue, canonical)
  }

  return { options, componentsById: componentsByIdSorted, componentsByPv: componentsByPvSorted }
}

function mapLoadedDefect(
  record: RawDefectRecord | SaveDefectRecord | null | undefined,
  directories?: Partial<DirectoryMaps>,
): LoadedObjectDefect | null {
  if (!record) return null

  const id = toOptionalString(record.idDefects ?? record.ID ?? record.id ?? record.number)
  if (!id) return null

  const componentIdRaw = toOptionalString(record.objDefectsComponent)
  const componentPvRaw = toOptionalString(
    record.pvDefectsComponent ?? record.pv ?? record.PV,
  )
  const categoryFvRaw = toOptionalString(record.fvDefectsCategory)
  const categoryPvRaw = toOptionalString(record.pvDefectsCategory)

  const categoryOption =
    (categoryFvRaw && directories?.categoriesByFv?.get(categoryFvRaw)) ||
    (categoryPvRaw && directories?.categoriesByPv?.get(categoryPvRaw)) ||
    null

  const componentOption =
    (componentIdRaw && directories?.componentsById?.get(componentIdRaw)) ||
    (componentPvRaw && directories?.componentsByPv?.get(componentPvRaw)) ||
    null

  const resolvedComponentId = componentIdRaw ?? componentOption?.id ?? null
  const resolvedComponentPvId = componentPvRaw ?? componentOption?.pvId ?? null
  const resolvedCategoryFvId = categoryFvRaw ?? categoryOption?.fvId ?? null
  const resolvedCategoryPvId = categoryPvRaw ?? categoryOption?.pvId ?? null

  const name =
    normalizeDefectName(
      record.DefectsName ?? record.nameDefects ?? record.name,
      toOptionalString(record.DefectsIndex),
      id,
    ) || id

  const indexValue = normalizeDefectIndex(record.DefectsIndex)
  const noteValue = normalizeDefectNote(record.DefectsNote)

  const componentName =
    normalizeOptionName(
      record.nameDefectsComponent,
      componentOption?.name,
      resolvedComponentId ?? resolvedComponentPvId ?? undefined,
    ) || null

  const categoryName =
    normalizeOptionName(
      record.nameDefectsCategory,
      categoryOption?.name,
      resolvedCategoryPvId ?? resolvedCategoryFvId ?? undefined,
    ) || null

  return {
    id,
    name,
    componentId: resolvedComponentId,
    componentPvId: resolvedComponentPvId,
    categoryFvId: resolvedCategoryFvId,
    categoryPvId: resolvedCategoryPvId,
    index: indexValue ? indexValue : null,
    note: noteValue ? noteValue : null,
    componentName,
    categoryName,
  }
}

function mapDefect(
  record: RawDefectRecord | SaveDefectRecord | null | undefined,
  directories?: Partial<DirectoryMaps>,
): ObjectDefect | null {
  const loaded = mapLoadedDefect(record, directories)
  if (!loaded) return null
  return {
    id: loaded.id,
    name: loaded.name,
    componentId: loaded.componentId,
    componentPvId: loaded.componentPvId,
    categoryFvId: loaded.categoryFvId,
    categoryPvId: loaded.categoryPvId,
    index: loaded.index,
    note: loaded.note,
  }
}

function toNumericId(value: string | number | null | undefined): number {
  if (value == null) return 0

  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : 0
}

function buildDefectPayload(payload: CreateObjectDefectPayload) {
  return {
    accessLevel: 1,
    name: trimmedString(payload.name) || null,
    objDefectsComponent: toNumericId(payload.componentId),
    pvDefectsComponent: toNumericId(payload.componentPvId),
    fvDefectsCategory: toNumericId(payload.categoryFvId),
    pvDefectsCategory: toNumericId(payload.categoryPvId),
    DefectsIndex: payload.index ?? null,
    DefectsNote: payload.note ?? null,
  }
}

export async function fetchObjectDefectsSnapshot(): Promise<ObjectDefectsSnapshot> {
  const [defectsResp, componentsResp, categoriesResp] = await Promise.all([
    rpc(LOAD_DEFECTS_METHOD, [0]),
    rpc(LOAD_COMPONENT_DEFECT_METHOD, COMPONENT_DEFECT_ARGS),
    rpc(LOAD_CATEGORIES_METHOD, FACTOR_DEFECTS),
  ])

  const rawDefects = extractRecords<RawDefectRecord>(defectsResp)
  const rawComponents = extractRecords<RawDefectComponentRecord>(componentsResp)
  const rawCategories = extractRecords<RawDefectCategoryRecord>(categoriesResp)

  const { options: categoryOptions, categoriesByFv, categoriesByPv } =
    buildCategoryOptions(rawCategories)
  const { options: componentOptions, componentsById, componentsByPv } =
    buildComponentOptions(rawComponents)

  const directories: DirectoryMaps = {
    categoriesByFv,
    categoriesByPv,
    componentsById,
    componentsByPv,
  }

  const items = rawDefects
    .map((record) => mapLoadedDefect(record, directories))
    .filter((item): item is LoadedObjectDefect => item != null)
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'))

  return {
    items,
    categories: categoryOptions,
    components: componentOptions,
  }
}

export async function listObjectDefects(): Promise<ObjectDefect[]> {
  const response = await rpc(LOAD_DEFECTS_METHOD, [0])
  const rawDefects = extractRecords<RawDefectRecord>(response)
  return rawDefects
    .map((record) => mapDefect(record))
    .filter((item): item is ObjectDefect => item != null)
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
}

/** Загрузить только список категорий дефектов (Factor_Defects) */
export async function listDefectCategories(): Promise<DefectCategoryOption[]> {
  const response = await rpc(LOAD_CATEGORIES_METHOD, FACTOR_DEFECTS)
  const raw = extractRecords<RawDefectCategoryRecord>(response)
  const { options } = buildCategoryOptions(raw)
  return options
}

export async function createDefect(
  payload: CreateObjectDefectPayload,
): Promise<LoadedObjectDefect> {
  const response = await rpc<SaveDefectRecord | { result?: SaveDefectRecord }>(
    SAVE_DEFECTS_METHOD,
    ['ins', buildDefectPayload(payload)],
  )
  const record = firstRecord<SaveDefectRecord>(response)
  if (!record) {
    throw new Error('Не удалось прочитать созданный дефект')
  }
  const mapped = mapLoadedDefect(record)
  if (!mapped) {
    throw new Error('Не удалось интерпретировать созданный дефект')
  }
  return mapped
}

export async function updateDefect(
  payload: UpdateObjectDefectPayload,
): Promise<LoadedObjectDefect> {
  const response = await rpc<SaveDefectRecord | { result?: SaveDefectRecord }>(
    SAVE_DEFECTS_METHOD,
    [
      'upd',
      {
        ...buildDefectPayload(payload),
        id: payload.id,
      },
    ],
  )
  const record = firstRecord<SaveDefectRecord>(response)
  if (!record) {
    throw new Error('Не удалось прочитать обновлённый дефект')
  }
  const mapped = mapLoadedDefect(record)
  if (!mapped) {
    throw new Error('Не удалось интерпретировать обновлённый дефект')
  }
  return mapped
}

export async function deleteDefect(id: string | number): Promise<void> {
  await rpc(DELETE_DEFECTS_METHOD, [id])
}

export type DeleteDefectOwnerResult =
  | { success: true; reason?: undefined }
  | { success: false; reason: string }

export async function deleteDefectOwnerWithProperties(
  defectId: string | number,
): Promise<DeleteDefectOwnerResult> {
  try {
    const response = await rpc<unknown>(DELETE_OWNER_WITH_PROPERTIES_METHOD, [defectId, 1])

    if (typeof response === 'string') {
      const trimmed = response.trim()
      if (trimmed.length > 0) {
        return { success: false, reason: trimmed }
      }
    }

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { success: false, reason: message }
  }
}
