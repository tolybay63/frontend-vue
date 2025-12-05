import { extractRecords, firstRecord } from '@shared/lib'
import type { Department, Source, SourceDetails, SourceFile } from './types'
import type {
  RawDepartmentRecord,
  RawSourceCollectionRecord,
  RawSourceDetails,
  RawSourceFileRecord,
} from './dto'

export function mapDepartments(raw: unknown): Department[] {
  const records = extractRecords<RawDepartmentRecord>(raw)
  return records
    .filter((item): item is RawDepartmentRecord & { id: number; name: string } => {
      return typeof item?.id === 'number' && typeof item?.name === 'string'
    })
    .map((item) => ({ id: item.id, name: item.name }))
}

export function mapSources(raw: unknown): Source[] {
  const records = extractRecords<RawSourceCollectionRecord>(raw)
  return records
    .filter((item): item is RawSourceCollectionRecord & { id: number; name: string } => {
      return typeof item?.id === 'number' && typeof item?.name === 'string'
    })
    .map((item) => ({
      id: item.id,
      name: item.name,
      DocumentNumber: item.DocumentNumber ?? '',
      DocumentApprovalDate: item.DocumentApprovalDate ?? null,
      DocumentAuthor: item.DocumentAuthor ?? null,
      DocumentStartDate: item.DocumentStartDate ?? null,
      DocumentEndDate: item.DocumentEndDate ?? null,
      idDocumentNumber: item.idDocumentNumber ?? null,
      idDocumentApprovalDate: item.idDocumentApprovalDate ?? null,
      idDocumentAuthor: item.idDocumentAuthor ?? null,
      idDocumentStartDate: item.idDocumentStartDate ?? null,
      idDocumentEndDate: item.idDocumentEndDate ?? null,
    }))
}

function parseDepartmentIds(input: unknown): number[] {
  if (typeof input !== 'string') return []
  return input
    .split(',')
    .map((item) => Number.parseInt(item.trim(), 10))
    .filter((id) => Number.isFinite(id))
}

function normalizeFiles(raw: unknown): SourceFile[] {
  const source = raw as RawSourceFileRecord | RawSourceFileRecord[] | null | undefined
  if (!source || typeof source !== 'object') return []

  const recordsCandidate = (source as RawSourceDetails).records ?? source
  if (Array.isArray(recordsCandidate)) {
    return recordsCandidate.filter((item): item is SourceFile => typeof item === 'object' && item !== null)
  }

  return []
}

export function normalizeSourceDetails(raw: unknown): SourceDetails {
  if (!raw || typeof raw !== 'object') {
    return { departmentIds: [], files: [] }
  }

  const departments = parseDepartmentIds((raw as RawSourceDetails).departments)
  const files = normalizeFiles((raw as RawSourceDetails).files)

  return { departmentIds: departments, files }
}

export function normalizeSaveResponse(raw: unknown): Source {
  const record = firstRecord<Source>(raw)
  if (record && typeof record.id === 'number') return record

  if (raw && typeof raw === 'object') {
    const direct = raw as Record<string, unknown>
    if (typeof direct.id === 'number') {
      return direct as unknown as Source
    }

    const result = (direct['result'] ?? null) as Record<string, unknown> | null
    if (result && typeof result.id === 'number') {
      return result as unknown as Source
    }
  }

  throw new Error('Не удалось сохранить документ: отсутствует идентификатор')
}
