/** Файл: src/entities/object-defect/api/categoryMeta.ts
 *  Назначение: создание категории дефектов (Factor_Defects) через Meta API.
 */
import { metaRpc } from '@shared/api'

export interface CreatedDefectCategoryPayload {
  id: number
  name: string
}

interface MetaFactorInsertRecord {
  id: number
  accessLevel: number
  parent: number
  cod: string
  name: string
  fullName: string
  ord?: number
}

interface MetaFactorInsertResult {
  records: MetaFactorInsertRecord[]
}

const DEFECT_CATEGORY_PARENT_ID = 1063

export async function createDefectCategory(name: string): Promise<CreatedDefectCategoryPayload> {
  const payload = {
    rec: {
      id: 0,
      cod: '',
      accessLevel: 1,
      name,
      fullName: name,
      cmt: null,
      parent: DEFECT_CATEGORY_PARENT_ID,
    },
  }

  const result = await metaRpc<MetaFactorInsertResult, [typeof payload]>('factor/insert', [payload])
  const record = Array.isArray(result.records) ? result.records[0] : null
  if (!record) throw new Error('Meta API: не удалось создать категорию дефектов')
  return { id: Number(record.id), name: record.name }
}

