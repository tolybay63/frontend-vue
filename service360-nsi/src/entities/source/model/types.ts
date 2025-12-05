/**
 * Типы сущности "Нормативный документ (источник)".
 */
export interface Department {
  id: number
  name: string
}

export interface SourceFile {
  id?: number | string
  name?: string
  fileName?: string
  filePath?: string
  title?: string
  url?: string
  href?: string
  link?: string
  [key: string]: unknown
}

export interface SourceDetails {
  departmentIds: number[]
  files: SourceFile[]
}

export interface Source {
  id: number
  name: string
  DocumentNumber: string
  DocumentApprovalDate: string | null
  DocumentAuthor: string | null
  DocumentStartDate: string | null
  DocumentEndDate: string | null
  idDocumentNumber: number | null
  idDocumentApprovalDate: number | null
  idDocumentAuthor: number | null
  idDocumentStartDate: number | null
  idDocumentEndDate: number | null
}
