/** Файл: src/entities/object-defect/model/dto.ts
 *  Назначение: описывает структуры RPC-ответов и хелперы нормализации для дефектов объектов.
 *  Использование: применять в репозиториях object-defect при маппинге ответов API.
 */
import { trimmedString } from '@shared/lib'

export interface RawDefectRecord {
  idDefects?: string | number | null
  ID?: string | number | null
  id?: string | number | null
  number?: string | number | null
  DefectsName?: string | null
  nameDefects?: string | null
  name?: string | null
  DefectsIndex?: string | number | null
  DefectsNote?: string | null
  fvDefectsCategory?: string | number | null
  pvDefectsCategory?: string | number | null
  nameDefectsCategory?: string | null
  objDefectsComponent?: string | number | null
  pvDefectsComponent?: string | number | null
  pv?: string | number | null
  PV?: string | number | null
  nameDefectsComponent?: string | null
  idDefectsComponent?: string | number | null
  cls?: string | number | null
}

export interface RawDefectCategoryRecord {
  id?: string | number | null
  ID?: string | number | null
  fv?: string | number | null
  FV?: string | number | null
  pv?: string | number | null
  PV?: string | number | null
  name?: string | null
  value?: string | null
  code?: string | null
}

export interface RawDefectComponentRecord {
  objDefectsComponent?: string | number | null
  pvDefectsComponent?: string | number | null
  pv?: string | number | null
  PV?: string | number | null
  nameDefectsComponent?: string | null
  id?: string | number | null
  ID?: string | number | null
  number?: string | number | null
  name?: string | null
  NAME?: string | null
}

export interface SaveDefectRecord {
  id?: string | number | null
  idDefects?: string | number | null
  ID?: string | number | null
  number?: string | number | null
  DefectsName?: string | null
  nameDefects?: string | null
  name?: string | null
  DefectsIndex?: string | number | null
  DefectsNote?: string | null
  fvDefectsCategory?: string | number | null
  pvDefectsCategory?: string | number | null
  objDefectsComponent?: string | number | null
  pvDefectsComponent?: string | number | null
  pv?: string | number | null
  PV?: string | number | null
  nameDefectsComponent?: string | null
  nameDefectsCategory?: string | null
}

export function normalizeDefectName(
  value: string | null | undefined,
  fallback?: string | null | undefined,
  fallbackId?: string | null | undefined,
): string {
  const primary = trimmedString(value)
  if (primary) return primary
  const secondary = trimmedString(fallback)
  if (secondary) return secondary
  const tertiary = trimmedString(fallbackId)
  if (tertiary) return tertiary
  return ''
}

export function normalizeDefectIndex(value: string | number | null | undefined): string {
  const normalized = trimmedString(value)
  if (!normalized) return ''
  return normalized.replace(/\s+/g, ' ')
}

export function normalizeDefectNote(value: string | null | undefined): string {
  const normalized = trimmedString(value)
  if (!normalized) return ''
  return normalized.replace(/[\r\n]+/g, '\n')
}

export function normalizeOptionName(
  value: string | null | undefined,
  fallback?: string | null | undefined,
  fallbackId?: string | null | undefined,
): string {
  return normalizeDefectName(value, fallback, fallbackId)
}
