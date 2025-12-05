/** Файл: src/shared/lib/rpc.ts
 *  Назначение: удобные функции для работы с ответами RPC (достать записи, извлечь первую).
 *  Использование: использовать в репозиториях сущностей при маппинге данных.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function extractArray(source: Record<string, unknown>, keys: string[]): unknown[] | undefined {
  for (const key of keys) {
    const candidate = source[key]
    if (Array.isArray(candidate)) return candidate
  }
  return undefined
}

function resolveRecords(payload: unknown): unknown[] | undefined {
  if (Array.isArray(payload)) return payload
  if (!isRecord(payload)) return undefined

  const direct = extractArray(payload, ['records', 'data'])
  if (direct) return direct

  const result = payload.result
  if (isRecord(result)) {
    const fromResult = extractArray(result, ['records', 'data'])
    if (fromResult) return fromResult
  }

  return undefined
}

export function extractRecords<T>(payload: unknown): T[] {
  const records = resolveRecords(payload)
  return Array.isArray(records) ? (records as T[]) : []
}

export function firstRecord<T>(payload: unknown): T | null {
  const records = resolveRecords(payload)
  if (Array.isArray(records) && records.length > 0) {
    return records[0] as T
  }
  return null
}

export function getErrorMessage(error: unknown): string {
  if (!error) return ''
  if (error instanceof Error) return error.message
  return String(error)
}
