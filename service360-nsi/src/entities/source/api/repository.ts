import { rpc } from '@shared/api/rpcClient'
import { mapDepartments, mapSources, normalizeSaveResponse, normalizeSourceDetails } from '../model/normalize'
import type { Department, Source, SourceDetails } from '../model/types'
import type {
  RawSourceDetails,
  SaveDepartmentPayload,
  SaveSourceCollectionInsPayload,
  SaveSourceCollectionUpdPayload,
} from '../model/dto'

export async function fetchDepartments(): Promise<Department[]> {
  const response = await rpc<unknown>('data/loadDepartments', ['Typ_Location', 'Prop_LocationMulti'])
  return mapDepartments(response)
}

export async function fetchSources(): Promise<Source[]> {
  const response = await rpc<unknown>('data/loadSourceCollections', [0])
  return mapSources(response)
}

export async function fetchSourceDetails(sourceId: number): Promise<SourceDetails> {
  const normalizedId = Number(sourceId)
  if (!Number.isFinite(normalizedId)) {
    return { departmentIds: [], files: [] }
  }

  const response = await rpc<RawSourceDetails>('data/loadDepartmentsWithFile', [normalizedId])
  return normalizeSourceDetails(response)
}

export async function createSource(payload: SaveSourceCollectionInsPayload): Promise<Source> {
  const response = await rpc<unknown>('data/saveSourceCollections', ['ins', payload])
  return normalizeSaveResponse(response)
}

export async function updateSource(payload: SaveSourceCollectionUpdPayload): Promise<Source> {
  const response = await rpc<unknown>('data/saveSourceCollections', ['upd', payload])
  return normalizeSaveResponse(response)
}

export async function saveSourceDepartments(sourceId: number, ids: number[]): Promise<void> {
  const payload: SaveDepartmentPayload = {
    isObj: 1,
    metamodel: 'dtj',
    model: 'nsidata',
    obj: sourceId,
    ids,
  }

  await rpc('data/saveDepartment', [payload])
}

export async function deleteSource(id: number): Promise<void> {
  await rpc('data/deleteOwnerWithProperties', [id, 1])
}
