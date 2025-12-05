export function formatDateIsoToRu(date: string | null | undefined, empty = '—'): string {
  if (!date) return empty
  const normalized = date.trim()
  if (!normalized) return empty
  const [year, month, day] = normalized.split('-')
  if (year && month && day) {
    return `${day.padStart(2, '0')}.${month.padStart(2, '0')}.${year}`
  }
  return empty
}

export function formatPeriod(
  start: string | null | undefined,
  end: string | null | undefined,
  empty = '—',
): string {
  const startText = formatDateIsoToRu(start, '')
  const endText = formatDateIsoToRu(end, '')

  if (!startText && !endText) return empty
  if (startText && endText) return `${startText} — ${endText}`
  if (startText) return `${startText} —`
  return `— ${endText}`
}

export function isoDateToTimestamp(value: string | null | undefined): number | null {
  if (!value) return null
  const normalized = value.trim()
  if (!normalized) return null
  const [yearRaw, monthRaw, dayRaw] = normalized.split('-')
  const year = Number.parseInt(yearRaw ?? '', 10)
  const month = Number.parseInt(monthRaw ?? '', 10)
  const day = Number.parseInt(dayRaw ?? '', 10)
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null
  const date = new Date(year, month - 1, day)
  return Number.isNaN(date.getTime()) ? null : date.getTime()
}

export function timestampToIsoDate(value: number | null | undefined): string | null {
  if (value == null) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
