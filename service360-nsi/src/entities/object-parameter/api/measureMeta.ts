/** Файл: src/entities/object-parameter/api/measureMeta.ts
 *  Назначение: создание единицы измерения через Meta API и включение её в список допустимых значений свойства.
 *  Использование: вызывайте createMeasureAndSelect(name) из фич/страниц.
 */
import { metaRpc } from '@shared/api'
import type { ParameterMeasureOption } from '../model/types'

type Nullable<T> = T | null | undefined

const FALSY_FLAGS = new Set(['0', 'false', 'no', 'n', 'off', 'unchecked', ''])

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function pickString(source: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const raw = source[key]
    if (typeof raw === 'string') {
      const trimmed = raw.trim()
      if (trimmed) return trimmed
    }
  }
  return null
}

function pickNumber(source: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const raw = source[key]

    if (typeof raw === 'number' && Number.isFinite(raw)) return raw
    if (typeof raw === 'string') {
      const normalized = raw.replace(',', '.').trim()
      if (!normalized) continue
      const parsed = Number(normalized)
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return null
}

function isChecked(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (FALSY_FLAGS.has(normalized)) return false
    return normalized.length > 0
  }
  return Boolean(value)
}

function ensureCheckedRecord(record: MetaPropRecord): MetaPropRecord {
  const base = { ...(record as Record<string, unknown>) }
  return {
    ...base,
    checked: true,
    leaf: base.leaf ?? true,
    level: base.level ?? 0,
  } as MetaPropRecord
}

function toMeasureOptionFromMeta(
  record: Nullable<MetaPropRecord>,
  fallback: MetaInsertMeasureRecord,
): ParameterMeasureOption {
  const createdId = Number(fallback.id)
  const base = asRecord(record ?? {})

  const id = pickNumber(base, ['id', 'measureId', 'meaParamsMeasure']) ?? createdId
  const pv =
    pickNumber(base, ['pv', 'pvId', 'pvParamsMeasure', 'propValId', 'propVal']) ?? id
  const name =
    pickString(base, ['name', 'caption', 'title', 'fullName']) ?? fallback.name ?? String(id)

  return { id: Number(id), pv: Number(pv), name }
}

function getRecordKey(record: MetaPropRecord): string {
  const base = asRecord(record)
  const id = pickNumber(base, ['id', 'measureId', 'meaParamsMeasure'])
  const pv = pickNumber(base, ['pv', 'pvId', 'pvParamsMeasure', 'propValId', 'propVal'])
  return `${id ?? ''}|${pv ?? ''}`
}

interface MetaInsertMeasureRecord {
  id: number
  cod: string
  accessLevel: number
  kFromBase: number
  name: string
  fullName: string
}

interface MetaInsertMeasureResult {
  records: MetaInsertMeasureRecord[]
}

interface MetaPropRecord {
  id: number | string
  cod?: string | null
  name: string
  fullName?: string | null
  checked?: unknown
  children?: unknown
  leaf?: unknown
  level?: unknown
  pv?: unknown
  pvId?: unknown
  pvParamsMeasure?: unknown
  propValId?: unknown
  propVal?: unknown
  [key: string]: unknown
}

interface MetaPropLoadResult {
  records: MetaPropRecord[]
}

const MEASURE_REF_PROP_ID = 1180

export async function insertMeasure(name: string): Promise<MetaInsertMeasureRecord> {
  const payload = {
    rec: {
      id: 0,
      cod: '',
      accessLevel: 1,
      kFromBase: 1,
      name,
      fullName: name,
      cmt: null,
      parent: null,
    },
  }

  const result = await metaRpc<MetaInsertMeasureResult, [typeof payload]>('measure/insert', [payload])
  const record = result.records?.[0]
  if (!record) throw new Error('Meta API: не вернулся созданный объект measure')
  return record
}

export async function loadMeasurePropValues(propId = MEASURE_REF_PROP_ID): Promise<MetaPropRecord[]> {
  const result = await metaRpc<MetaPropLoadResult, [number]>('prop/loadPropValForUpd', [propId])
  return Array.isArray(result.records) ? result.records : []
}

export async function saveMeasurePropSelected(
  records: MetaPropRecord[],
  propId = MEASURE_REF_PROP_ID,
): Promise<void> {
  await metaRpc<unknown, [number, MetaPropRecord[]]>('prop/savePropRefVal', [propId, records])
}

/**
 * Создаёт единицу измерения и отмечает её выбранной в справочном свойстве (prop 1180).
 * Возвращает опцию для UI и фич.
 */
export interface CreateMeasureOptions {
  propId?: number
}

export async function createMeasureAndSelect(
  name: string,
  options?: CreateMeasureOptions,
): Promise<ParameterMeasureOption> {
  const propId = options?.propId ?? MEASURE_REF_PROP_ID
  const created = await insertMeasure(name)

  let loadFailed = false
  let all: MetaPropRecord[] = []
  try {
    all = await loadMeasurePropValues(propId)
  } catch (error) {
    loadFailed = true
    console.error(
      '[measureMeta] Не удалось загрузить выбранные единицы измерения перед сохранением',
      error,
    )
  }

  const selectedByKey = new Map<string, MetaPropRecord>()
  for (const item of all) {
    if (!item) continue
    if (!isChecked((item as MetaPropRecord).checked)) continue
    const ensured = ensureCheckedRecord(item)
    selectedByKey.set(getRecordKey(ensured), ensured)
  }

  const createdId = Number(created.id)
  let createdRecord: MetaPropRecord | null = null

  for (const item of all) {
    const base = asRecord(item)
    const id = pickNumber(base, ['id', 'measureId', 'meaParamsMeasure'])
    const pv = pickNumber(base, ['pv', 'pvId', 'pvParamsMeasure', 'propValId', 'propVal'])
    if (id === createdId || pv === createdId) {
      createdRecord = item
      break
    }
  }

  if (createdRecord) {
    const ensured = ensureCheckedRecord(createdRecord)
    selectedByKey.set(getRecordKey(ensured), ensured)
  } else {
    const fallbackRecord: MetaPropRecord = {
      id: created.id,
      cod: created.cod,
      name: created.name,
      fullName: created.fullName,
      checked: true,
      leaf: true,
      level: 0,
      pv: created.id,
      propValId: created.id,
      children: null,
    }
    createdRecord = fallbackRecord
    selectedByKey.set(getRecordKey(fallbackRecord), ensureCheckedRecord(fallbackRecord))
  }

  const toSave = Array.from(selectedByKey.values())
  if (!loadFailed || toSave.length > 0) {
    try {
      await saveMeasurePropSelected(toSave, propId)
    } catch (error) {
      console.error(
        '[measureMeta] Не удалось сохранить выбранные единицы измерения',
        error,
      )
    }
  }

  return toMeasureOptionFromMeta(createdRecord, created)
}
