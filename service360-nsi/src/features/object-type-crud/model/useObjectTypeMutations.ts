/** Файл: features/object-type-crud/model/useObjectTypeMutations.ts
 *  Назначение: сгруппировать сценарии мутаций (создание, обновление, миграция, связи, каскадное удаление).
 *  Использование: подключать в формах/страницах для вызова готовых мутаций и инвалидации кэша.
 */
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { normalizeText, toNumericOrUndefined } from '@shared/lib'
import type { GeometryPair, GeometryKind } from '@entities/object-type'
import * as objectTypeRepo from '@entities/object-type'
import * as componentRepo from '@entities/component'
import type { Component } from '@entities/component'

async function ensureComponents(names: string[]): Promise<Component[]> {
  if (!names.length) return []
  const uniqueNames = Array.from(new Set(names.map((name) => name.trim()).filter(Boolean)))

  const existing = await componentRepo.listComponents()
  const map = new Map(existing.map((item) => [normalizeText(item.name), item]))
  const result: Component[] = []

  for (const rawName of uniqueNames) {
    const normalized = normalizeText(rawName)
    const found = map.get(normalized)
    if (found) {
      result.push(found)
      continue
    }
    const created = await componentRepo.createComponentIfMissing(rawName)
    const normalizedComponent: Component = {
      id: String(created.id),
      name: created.name,
    }
    map.set(normalized, normalizedComponent)
    result.push(normalizedComponent)
  }

  return result
}

async function unlinkRelations(ids: Array<number | string>) {
  if (!ids.length) return
  await Promise.all(ids.map((idro) => objectTypeRepo.unlinkRelationByIdro(idro)))
}

async function linkComponents(params: {
  typeId: number
  typeCls: number
  typeName: string
  components: Component[]
}) {
  if (!params.components.length) return
  await Promise.all(
    params.components.map((component) =>
      (async () => {
        const componentId = Number(component.id)
        if (!Number.isFinite(componentId)) {
          throw new Error(`Некорректный идентификатор компонента: ${component.id}`)
        }
        await objectTypeRepo.linkComponent({
          uch1: params.typeId,
          cls1: params.typeCls,
          uch2: componentId,
          cls2: 1027,
          codRelTyp: 'RT_Components',
          name: `${params.typeName} <=> ${component.name}`,
        })
      })(),
    ),
  )
}

async function fetchLinksByType(typeId: number): Promise<
  Array<{ compId: string; linkId: string; componentName: string }>
> {
  const links = await objectTypeRepo.listComponentLinks()
  return links.filter((link) => Number(link.typeId) === Number(typeId)).map((link) => ({
    compId: String(link.componentId),
    linkId: String(link.idro),
    componentName: link.componentName,
  }))
}

export interface CreateTypePayload {
  name: string
  geometry: GeometryKind
  geometryPair: GeometryPair
  componentNames: string[]
}

export interface UpdateGeometryPayload {
  id: number
  cls: number
  name: string
  geometryPair: GeometryPair
  idShape?: number | string | null
  number?: number | string | null
}

export interface RenameWithMigrationPayload {
  oldId: number
  oldCls: number
  oldName: string
  oldComponentIds: number[]
  newName: string
  geometryPair: GeometryPair
  componentNames: string[]
}

export interface UpdateComponentsDiffPayload {
  typeId: number
  typeCls: number
  typeName: string
  add: Component[]
  removeLinkIds: Array<number | string>
}

export interface RemoveCascadePayload {
  typeId: number
}

export function useObjectTypeMutations() {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: ['object-types'] })

  const create = useMutation({
    mutationFn: async (payload: CreateTypePayload) => {
      const components = await ensureComponents(payload.componentNames)
      const fvShape = toNumericOrUndefined(payload.geometryPair.fv) ?? payload.geometryPair.fv
      const pvShape = toNumericOrUndefined(payload.geometryPair.pv) ?? payload.geometryPair.pv
      const { id, cls } = await objectTypeRepo.createTypeIns({
        name: payload.name,
        fvShape: fvShape ?? null,
        pvShape: pvShape ?? null,
      })
      await linkComponents({
        typeId: id,
        typeCls: cls,
        typeName: payload.name,
        components,
      })
      return { id, cls }
    },
    onSuccess: () => invalidate(),
  })

  const updateGeometry = useMutation({
    mutationFn: async (payload: UpdateGeometryPayload) => {
      const fvShape = toNumericOrUndefined(payload.geometryPair.fv) ?? payload.geometryPair.fv ?? 0
      const pvShape = toNumericOrUndefined(payload.geometryPair.pv) ?? payload.geometryPair.pv ?? 0
      await objectTypeRepo.updateTypeGeometry({
        id: payload.id,
        cls: payload.cls,
        name: payload.name,
        fvShape,
        pvShape,
        idShape: payload.idShape ?? 0,
        number: payload.number ?? 1,
      })
    },
    onSuccess: () => invalidate(),
  })

  const renameWithMigration = useMutation({
    mutationFn: async (payload: RenameWithMigrationPayload) => {
      const components = await ensureComponents(payload.componentNames)
      const fvShape = toNumericOrUndefined(payload.geometryPair.fv) ?? payload.geometryPair.fv
      const pvShape = toNumericOrUndefined(payload.geometryPair.pv) ?? payload.geometryPair.pv

      let newId: number | null = null
      let newCls: number | null = null
      let oldLinks: Array<{ compId: string; linkId: string; componentName: string }> = []
      let oldLinksRemoved = false

      try {
        const created = await objectTypeRepo.createTypeIns({
          name: payload.newName,
          fvShape: fvShape ?? null,
          pvShape: pvShape ?? null,
        })
        newId = created.id
        newCls = created.cls

        await linkComponents({
          typeId: newId,
          typeCls: newCls,
          typeName: payload.newName,
          components,
        })

        oldLinks = await fetchLinksByType(payload.oldId)
        if (oldLinks.length) {
          await unlinkRelations(oldLinks.map((link) => Number(link.linkId)))
          oldLinksRemoved = true
        }

        await objectTypeRepo.deleteType(payload.oldId)

        return { newId, newCls }
      } catch (error) {
        if (newId) {
          const newLinks = await fetchLinksByType(newId)
          if (newLinks.length) {
            await unlinkRelations(newLinks.map((link) => Number(link.linkId)))
          }
          try {
            await objectTypeRepo.deleteType(newId)
          } catch {
            // ignore cleanup failure
          }
        }

        if (oldLinksRemoved && oldLinks.length) {
          await Promise.all(
            oldLinks.map((link) =>
              objectTypeRepo.linkComponent({
                uch1: payload.oldId,
                cls1: payload.oldCls,
                uch2: Number(link.compId),
                cls2: 1027,
                codRelTyp: 'RT_Components',
                name: `${payload.oldName} <=> ${link.componentName ?? link.compId}`,
              }),
            ),
          )
        }

        throw error
      }
    },
    onSuccess: () => invalidate(),
  })

  const updateComponentsDiff = useMutation({
    mutationFn: async (payload: UpdateComponentsDiffPayload) => {
      if (payload.removeLinkIds.length) {
        await unlinkRelations(payload.removeLinkIds)
      }
      if (payload.add.length) {
        await linkComponents({
          typeId: payload.typeId,
          typeCls: payload.typeCls,
          typeName: payload.typeName,
          components: payload.add,
        })
      }
    },
    onSuccess: () => invalidate(),
  })

  const removeCascade = useMutation({
    mutationFn: async (payload: RemoveCascadePayload) => {
      const links = await fetchLinksByType(payload.typeId)
      if (links.length) {
        await unlinkRelations(links.map((link) => Number(link.linkId)))
      }
      await objectTypeRepo.deleteType(payload.typeId)
    },
    onSuccess: () => invalidate(),
  })

  return { create, updateGeometry, renameWithMigration, updateComponentsDiff, removeCascade }
}
