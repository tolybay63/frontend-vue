export interface SaveSourceCollectionInsPayload {
  accessLevel: number
  name: string
  DocumentNumber: string
  DocumentApprovalDate: string
  DocumentAuthor: string
  DocumentStartDate: string | null
  DocumentEndDate: string | null
}

export interface SaveSourceCollectionUpdPayload {
  accessLevel: number
  id: number
  cls: number
  name: string
  idDocumentNumber: number | null
  DocumentNumber: string
  idDocumentApprovalDate: number | null
  DocumentApprovalDate: string
  idDocumentAuthor: number | null
  DocumentAuthor: string
  idDocumentStartDate: number | null
  DocumentStartDate: string | null
  idDocumentEndDate: number | null
  DocumentEndDate: string | null
}

export interface RawDepartmentRecord {
  id?: number
  name?: string
}

export type RawSourceCollectionRecord = Partial<{
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
}>

export interface RawSourceDetails {
  departments?: string | null
  files?: RawSourceFileRecord | RawSourceFileRecord[] | null
  records?: RawSourceFileRecord[]
}

export interface RawSourceFileRecord {
  id?: number | string
  name?: string
  fileName?: string
  FileName?: string
  title?: string
  url?: string
  href?: string
  link?: string
  path?: string
  FilePath?: string
  [key: string]: unknown
}

export interface SaveDepartmentPayload {
  isObj: 1
  metamodel: 'dtj'
  model: 'nsidata'
  obj: number
  ids: number[]
}
