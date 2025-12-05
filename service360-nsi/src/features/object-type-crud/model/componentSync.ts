/** Синхронизация компонентов типов объектов (создание и удаление связей) */
import { normalizeText } from '@shared/lib'
import { listComponents, type Component, type ComponentOption } from '@entities/component'

export async function ensureComponentObjects(
  names: string[],
  createIfMissing: (name: string) => Promise<{ id: number; cls: number; name: string }>,
): Promise<Component[]> {
  const unique = Array.from(new Set(names.map((name) => name.trim()).filter(Boolean)))
  if (!unique.length) return []

  const existing = await listComponents()
  const byName = new Map(existing.map((item) => [normalizeText(item.name), item]))
  const result: Component[] = []

  for (const raw of unique) {
    const key = normalizeText(raw)
    let component = byName.get(key)
    if (!component) {
      const created = await createIfMissing(raw)
      component = { id: String(created.id), name: created.name }
      byName.set(key, component)
    }
    result.push(component)
  }

  return result
}

export type LinkEntry = { compId: string; linkId: string }

export function resolveRemoveLinkIds(
  typeId: string,
  linksByType: Record<string, LinkEntry[]>,
  allOptions: ComponentOption[],
  namesToRemove: string[],
): number[] {
  const byName = new Map(allOptions.map((item) => [normalizeText(item.name), item]))
  const links = linksByType[typeId] ?? []
  const ids: number[] = []

  for (const name of namesToRemove) {
    const option = byName.get(normalizeText(name))
    if (!option) continue
    const link = links.find((entry) => String(entry.compId) === String(option.id))
    if (link) {
      const numeric = Number(link.linkId)
      if (Number.isFinite(numeric)) ids.push(numeric)
    }
  }

  return ids
}
