/** Файл: src/features/object-defect-crud/index.ts
 *  Назначение: Собирает и переэкспортирует публичные хуки и утилиты CRUD дефектов объектов.
 *  Использование: Импортируйте из фичи при работе с дефектами объектов и их синхронизацией.
 */
/** Публичный API фичи CRUD дефектов объектов */
export { useObjectDefectsQuery } from './model/useObjectDefectsQuery'
export {
  useObjectDefectMutations,
  type RemoveObjectDefectPayload,
} from './model/useObjectDefectMutations'
export {
  createDefectComponentLookup,
  createDefectCategoryLookup,
  resolveRemovedDefectValueIds,
  type DefectComponentLookup,
  type DefectCategoryLookup,
  type DefectSelection,
  type DefectRemoveDiff,
} from './model/componentSync'
