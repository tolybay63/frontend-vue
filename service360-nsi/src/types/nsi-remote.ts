/** Файл: src/types/nsi-remote.ts
 *  Назначение: общие типы данных NSI для фронтенда.
 *  Использование: импортируйте при описании DTO и контрактов.
 */
import type { GeometryKind } from './nsi'

export interface RemoteObjectType {
  id: string
  name: string
  geometryId: string | null
  geometryName?: string | null
}

export type LoadTypesObjectsResponse = RemoteObjectType[]

export interface FactorValueOption {
  id: string
  name: string
  code?: string | null
  value?: string | null
}

export type LoadFvForSelectResponse = FactorValueOption[]

export interface RemoteComponentItem {
  id: string
  objectTypeId: string | null
  name: string
}

export type LoadComponentsObject2Response = RemoteComponentItem[]

export interface ComponentOption {
  id: string
  name: string
}

export type ComponentsByType = Record<string, ComponentOption[]>

export interface SaveTypeObjectRequest {
  id?: string
  name: string
  geometryId: string | null
  componentIds: string[]
}

export interface SaveTypeObjectResponse {
  id: string
}

export interface DeleteTypeObjectRequest {
  id: string
}

const GEOMETRY_ALIASES: Record<GeometryKind, string[]> = {
  точка: ['точка', 'point', 'pt', 'p', '1', 'g1', 'point_z', 'pointz'],
  линия: ['линия', 'line', 'linestring', 'polyline', '2', 'g2'],
  полигон: ['полигон', 'polygon', 'poly', 'area', 'surface', '3', 'g3'],
}

function matchGeometryAlias(value: string): GeometryKind | null {
  const normalized = value.trim().toLowerCase()
  if (!normalized) return null

  for (const [kind, aliases] of Object.entries(GEOMETRY_ALIASES) as [
    GeometryKind,
    string[],
  ][]) {
    if (aliases.includes(normalized)) return kind
  }

  return null
}

export function normalizeGeometry(
  raw: string | number | null | undefined,
  options?: LoadFvForSelectResponse,
): GeometryKind {
  const normalizedRaw =
    typeof raw === 'number' ? raw.toString() : (raw ?? '').toString()
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
      const candidates = [
        matchedOption.name,
        matchedOption.value,
        matchedOption.code,
        matchedOption.id,
      ]

      for (const candidate of candidates) {
        const alias = matchGeometryAlias((candidate ?? '').toString())
        if (alias) return alias
      }
    }
  }

  return 'точка'
}
