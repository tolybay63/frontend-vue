/** Файл: src/shared/lib/numbers.ts
 *  Назначение: приведение строковых идентификаторов и числовых значений к нужному типу для RPC.
 *  Использование: репозитории и фичи вызывают при подготовке payload для бекенда.
 */
export const toRpcId = (value: string | number): string | number => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : value
}

export const toRpcValue = (value: string | number | null | undefined): string | number | undefined => {
  if (value == null) return undefined
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : value
}

export const toNumericOrUndefined = (value: string | number | null | undefined): number | undefined => {
  if (value == null) return undefined
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : undefined
}
