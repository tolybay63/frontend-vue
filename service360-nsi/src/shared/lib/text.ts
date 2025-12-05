/** Файл: src/shared/lib/text.ts
 *  Назначение: утилиты нормализации текстовых значений (обрезка, сравнение без регистра).
 *  Использование: применять при маппинге RPC-ответов и проверки дубликатов по строкам.
 */
export const safeString = (value: unknown): string => (value ?? '').toString()

export const trimmedString = (value: unknown): string => safeString(value).trim()

export const normalizeText = (value: string | null | undefined): string =>
  trimmedString(value).toLowerCase()

export const toOptionalString = (value: unknown): string | null => {
  const trimmed = trimmedString(value)
  return trimmed ? trimmed : null
}
