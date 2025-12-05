/** Файл: src/entities/object-type/model/dto.ts
 *  Назначение: описать структуры RPC-ответов и маппинг геометрии из справочника.
 *  Использование: использовать в репозиториях ObjectType при парсинге ответов.
 */
import type { GeometryKind } from './types'

export interface RawObjectTypeRecord {
  id?: string | number | null
  name?: string | null
  nameCls?: string | null
  fvShape?: string | number | null
  pvShape?: string | number | null
  cls?: string | number | null
  idShape?: string | number | null
  number?: string | number | null
}

export interface RawRelRecord {
  idro?: string | number | null
  idrom1?: string | number | null
  clsrom1?: string | number | null
  namerom1?: string | null
  idrom2?: string | number | null
  clsrom2?: string | number | null
  namerom2?: string | null
}

export interface RawGeometryRecord {
  id?: string | number | null
  ID?: string | number | null
  pv?: string | number | null
  PV?: string | number | null
  name?: string | null
  value?: string | null
  code?: string | null
}

export type RawComponentRecord = {
  id?: string | number | null
  ID?: string | number | null
  number?: string | number | null
  cls?: string | number | null
  CLS?: string | number | null
  name?: string | null
  NAME?: string | null
}

export interface SaveObjectTypeRecord {
  id?: string | number | null
  ID?: string | number | null
  number?: string | number | null
  cls?: string | number | null
  CLS?: string | number | null
  name?: string | null
  NAME?: string | null
}

const GEOMETRY_ALIASES: Record<GeometryKind, string[]> = {
  точка: ['точка', 'point', 'pt', 'p', '1', 'g1', 'point_z', 'pointz'],
  линия: ['линия', 'line', 'linestring', 'polyline', '2', 'g2'],
  полигон: ['полигон', 'polygon', 'poly', 'area', 'surface', '3', 'g3'],
}

function matchGeometryAlias(value: string): GeometryKind | null {
  const normalized = value.trim().toLowerCase()
  if (!normalized) return null
  for (const [kind, aliases] of Object.entries(GEOMETRY_ALIASES) as [GeometryKind, string[]][]) {
    if (aliases.includes(normalized)) return kind
  }
  return null
}

export function normalizeGeometry(
  raw: string | number | null | undefined,
  options?: Array<{ id: string; name: string; value?: string | null; code?: string | null }>,
): GeometryKind {
  const normalizedRaw = typeof raw === 'number' ? raw.toString() : (raw ?? '').toString()
  const direct = matchGeometryAlias(normalizedRaw)
  if (direct) return direct

  const lowered = normalizedRaw.trim().toLowerCase()
  if (options?.length) {
    const matchedOption = options.find((option) =>
      [option.id, option.name, option.value, option.code]
        .map((candidate) => (candidate ?? '').toString().trim().toLowerCase())
        .includes(lowered),
    )

    if (matchedOption) {
      const candidates = [matchedOption.name, matchedOption.value, matchedOption.code, matchedOption.id]
      for (const candidate of candidates) {
        const alias = matchGeometryAlias((candidate ?? '').toString())
        if (alias) return alias
      }
    }
  }

  return 'точка'
}
