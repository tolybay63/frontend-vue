/** Файл: features/components-select/model/useComponentsOptions.ts
 *  Назначение: загрузка и кэширование компонентов с возможностью создания нового по Enter.
 *  Использование: вызывать внутри ComponentsSelect.vue для доступа к options и createIfAgreed.
 */
import { computed, ref } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { useDialog, useMessage } from 'naive-ui'
import { normalizeText } from '@shared/lib'
import type { Component } from '@entities/component'
import * as componentRepo from '@entities/component'

export interface ComponentsOption {
  label: string
  value: string
  id: string
}

export function useComponentsOptions() {
  const qc = useQueryClient()
  const dialog = useDialog()
  const message = useMessage()
  const created = ref<Component[]>([])

  const listQuery = useQuery({
    queryKey: ['components', 'list'],
    queryFn: componentRepo.listComponents,
  })

  const baseComponents = computed<Component[]>(() => listQuery.data.value ?? [])

  const mapByName = computed(() => {
    const map = new Map<string, Component>()
    for (const item of baseComponents.value) map.set(normalizeText(item.name), item)
    for (const item of created.value) map.set(normalizeText(item.name), item)
    return map
  })

  const options = computed<ComponentsOption[]>(() => {
    const merged = new Map<string, Component>()
    for (const item of baseComponents.value) merged.set(normalizeText(item.name), item)
    for (const item of created.value) merged.set(normalizeText(item.name), item)
    return Array.from(merged.values())
      .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
      .map((item) => ({ label: item.name, value: item.name, id: item.id }))
  })

  const createMutation = useMutation({
    mutationFn: (name: string) => componentRepo.createComponent(name),
    onSuccess: (component) => {
      created.value = [...created.value.filter((item) => item.id !== component.id), component]
      message.success('Компонент создан')
      void qc.invalidateQueries({ queryKey: ['components', 'list'] })
    },
    onError: () => message.error('Не удалось создать компонент'),
  })

  async function confirmCreate(name: string): Promise<boolean> {
    return await new Promise<boolean>((resolve) => {
      let resolved = false
      const finish = (value: boolean) => {
        if (resolved) return
        resolved = true
        resolve(value)
      }

      dialog.warning({
        title: 'Создать компонент',
        content: `Создать новый компонент «${name}»?`,
        positiveText: 'Создать',
        negativeText: 'Отмена',
        maskClosable: false,
        onPositiveClick: () => finish(true),
        onNegativeClick: () => finish(false),
        onClose: () => finish(false),
      })
    })
  }

  async function createIfAgreed(name: string): Promise<Component | null> {
    const trimmed = name.trim()
    if (trimmed.length < 2) return null
    const key = normalizeText(trimmed)
    const existing = mapByName.value.get(key)
    if (existing) return existing

    const ok = await confirmCreate(trimmed)
    if (!ok) return null

    const component = await createMutation.mutateAsync(trimmed)
    return component
  }

  return {
    options,
    mapByName,
    isLoading: listQuery.isLoading,
    isFetching: listQuery.isFetching,
    reload: () => qc.invalidateQueries({ queryKey: ['components', 'list'] }),
    createIfAgreed,
    creating: createMutation.isPending,
  }
}
