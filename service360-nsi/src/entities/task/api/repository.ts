/** Файл: src/entities/task/api/repository.ts
 *  Назначение: RPC-адаптер для работы со справочником «Задачи».
 *  Использование: импортируйте loadTasks/createTask/updateTask/deleteTask в страницах и фичах.
 */
import { rpc } from '@shared/api'
import { extractRecords } from '@shared/lib'
import { toRpcId, toRpcValue } from '@shared/lib/numbers'

import type { RawTaskRecord, Task, TaskMutationInput } from '../model/types'

const RPC_CONTEXT = '[task-repository]'

const DEFAULT_TASK_LABEL = 'Новая задача'

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
}

function pickString(source: RawTaskRecord, keys: string[]): string | null {
  const record = asRecord(source)
  for (const key of keys) {
    const raw = record[key]
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

function pickNumber(source: RawTaskRecord, keys: string[]): number | null {
  const record = asRecord(source)
  for (const key of keys) {
    const raw = record[key]
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

function normalizeTask(record: RawTaskRecord, index: number): Task {
  const name =
    pickString(record, ['name', 'NAME', 'caption', 'title']) ?? `${DEFAULT_TASK_LABEL} ${index + 1}`
  const fullName = pickString(record, ['fullName', 'FullName', 'FULLNAME', 'full_name'])
  const description = pickString(record, ['description', 'Description', 'note', 'NOTE'])

  const idNumber = pickNumber(record, ['obj', 'OBJ', 'id', 'ID'])
  const idRaw = pickString(record, ['obj', 'OBJ', 'id', 'ID'])

  const cls = pickNumber(record, ['cls', 'CLS'])

  const measureRecordId = pickNumber(record, ['idMeasure', 'IDMEASURE'])
  const measureRecordRaw = pickString(record, ['idMeasure', 'IDMEASURE'])
  const measureObjId = pickNumber(record, ['meaMeasure', 'MEAMEASURE', 'measureId', 'mea'])
  const measurePvId = pickNumber(record, ['pvMeasure', 'PVMEASURE', 'pv'])
  const measureName = pickString(record, [
    'nameMeasure',
    'NAMEMEASURE',
    'measureName',
    'unitName',
    'ParamsMeasureName',
    'MeasureName',
  ])
  const descriptionRecordId = pickNumber(record, ['idDescription', 'IDDESCRIPTION'])
  const descriptionRecordRaw = pickString(record, ['idDescription', 'IDDESCRIPTION'])

  return {
    id: idNumber,
    rawId: idRaw,
    cls: cls ?? null,
    name,
    fullName: fullName ?? null,
    description: description ?? null,
    measureRecordId: measureRecordId ?? null,
    measureRecordRawId: measureRecordRaw,
    measureObjId: measureObjId ?? null,
    measurePvId: measurePvId ?? null,
    measureName: measureName ?? null,
    descriptionRecordId: descriptionRecordId ?? null,
    descriptionRecordRawId: descriptionRecordRaw,
  }
}

function ensureTaskIdentifier(task: Task): string | number {
  if (task.id != null && Number.isFinite(task.id)) return task.id
  if (task.rawId != null && task.rawId !== '') return task.rawId
  throw new Error('Task identifier is missing')
}

function resolveMeasureName(input: TaskMutationInput, fallback: Task | null): string | null {
  if (input.measure?.name && input.measure.name.trim()) return input.measure.name.trim()
  return fallback?.measureName ?? null
}

export async function loadTasks(): Promise<Task[]> {
  try {
    const response = await rpc<unknown>('data/loadTask', [0])
    const records = extractRecords<RawTaskRecord>(response)
    const normalized = records.map((record, index) => normalizeTask(record, index))

    const unique = new Map<string, Task>()
    normalized.forEach((task, index) => {
      const keyBase = task.rawId ?? (task.id != null ? String(task.id) : `row-${index}`)
      const key = keyBase ?? `row-${index}`
      const existing = unique.get(key)
      if (!existing) {
        unique.set(key, task)
        return
      }

      const existingDescriptionId = existing.descriptionRecordId ?? -1
      const nextDescriptionId = task.descriptionRecordId ?? existingDescriptionId
      if (nextDescriptionId >= existingDescriptionId) {
        unique.set(key, task)
      }
    })

    return Array.from(unique.values())
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    console.error(`${RPC_CONTEXT} loadTasks failed: ${reason}`)
    throw new Error(`Не удалось загрузить задачи: ${reason}`)
  }
}

export async function createTask(payload: TaskMutationInput): Promise<void> {
  const name = payload.name.trim()
  const measureId = payload.measure?.objId
  const measurePv = payload.measure?.pvId

  if (!name) throw new Error('Наименование задачи не задано')
  if (!Number.isFinite(measureId) || !Number.isFinite(measurePv)) {
    throw new Error('Единица измерения не выбрана')
  }

  const measureName = resolveMeasureName(payload, null)
  const fullName = measureName ? `${name}, ${measureName}` : name
  const description = payload.description?.trim() ?? ''

  const rpcPayload: Record<string, unknown> = {
    name,
    fullName,
    meaMeasure: toRpcValue(measureId),
    pvMeasure: toRpcValue(measurePv),
    Description: description,
  }

  if (measureName) rpcPayload.nameMeasure = measureName

  try {
    await rpc('data/saveTask', ['ins', rpcPayload])
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    console.error(`${RPC_CONTEXT} createTask failed: ${reason}`, { payload: rpcPayload })
    throw new Error(`Не удалось создать задачу: ${reason}`)
  }
}

export async function updateTask(task: Task, payload: TaskMutationInput): Promise<void> {
  const identifier = ensureTaskIdentifier(task)
  const name = payload.name.trim()
  const measureId = payload.measure?.objId
  const measurePv = payload.measure?.pvId

  if (!name) throw new Error('Наименование задачи не задано')
  if (!Number.isFinite(measureId) || !Number.isFinite(measurePv)) {
    throw new Error('Единица измерения не выбрана')
  }

  const measureName = resolveMeasureName(payload, task)
  const fullName = measureName ? `${name}, ${measureName}` : name
  const description =
    payload.description != null ? payload.description.trim() : task.description ?? ''

  const rpcPayload: Record<string, unknown> = {
    id: toRpcId(identifier),
    name,
    fullName,
    meaMeasure: toRpcValue(measureId),
    pvMeasure: toRpcValue(measurePv),
    Description: description,
  }

  if (task.cls != null) rpcPayload.cls = toRpcValue(task.cls)
  if (task.measureRecordId != null) rpcPayload.idMeasure = toRpcValue(task.measureRecordId)
  if (task.descriptionRecordId != null)
    rpcPayload.idDescription = toRpcValue(task.descriptionRecordId)

  if (measureName) rpcPayload.nameMeasure = measureName

  try {
    await rpc('data/saveTask', ['upd', rpcPayload])
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    console.error(`${RPC_CONTEXT} updateTask failed: ${reason}`, {
      id: identifier,
      payload: rpcPayload,
    })
    throw new Error(`Не удалось обновить задачу: ${reason}`)
  }
}

export async function deleteTask(task: Task): Promise<void> {
  const identifier = ensureTaskIdentifier(task)
  try {
    await rpc('data/deleteOwnerWithProperties', [toRpcId(identifier), 1])
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    console.error(`${RPC_CONTEXT} deleteTask failed: ${reason}`, { id: identifier })
    throw new Error(`Не удалось удалить задачу: ${reason}`)
  }
}
