/** Публичный API фичи "CRUD источников" */
export * from './model/useSourcesQuery'
export * from './model/useSourceDepartmentsQuery'
export * from './model/useSourceDetailsQuery'
export * from './model/useSourceMutations'
export { sourceQueryKeys } from './model/sourceQueryKeys'
export { default as SourcesForm } from './ui/SourcesForm.vue'
export type { SourcesFormModel } from './ui/SourcesForm.vue'
