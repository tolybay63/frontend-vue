<!-- Файл: features/components-select/ui/ComponentsSelect.vue
     Назначение: селект компонентов с режимами multiple/name и single/id.
     Использование:
       - По умолчанию multiple + valueKind='name' (совместимо с страницей типов).
       - Для одиночного выбора по id: :multiple="false" :value-kind="'id'". -->
<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { NButton, NSelect, useDialog, useMessage } from 'naive-ui'
import type { SelectOption } from 'naive-ui'
import { normalizeText } from '@shared/lib'
import { createComponentIfMissing } from '@entities/component'

interface ComponentCreatedPayload {
  id: string
  cls: number
  name: string
}

const props = withDefaults(
  defineProps<{
    value: string[] | string | null
    options: SelectOption[]
    placeholder?: string
    disabled?: boolean
    multiple?: boolean
    valueKind?: 'name' | 'id'
    clearable?: boolean
    loading?: boolean
  }>(),
  {
    multiple: true,
    valueKind: 'name',
  },
)

const emit = defineEmits<{
  (event: 'update:value', value: string[] | string | null): void
  (event: 'blur', payload: FocusEvent): void
  (event: 'created', component: ComponentCreatedPayload): void
}>()

const selectRef = ref<InstanceType<typeof NSelect> | null>(null)
const selectVisible = ref(false)
const search = ref('')
const creating = ref(false)

const dialog = useDialog()
const message = useMessage()

const extraOptions = ref<SelectOption[]>([])

const isMultiple = computed(() => props.multiple !== false)
const valueKind = computed(() => props.valueKind)
const isIdMode = computed(() => valueKind.value === 'id')

const normalizedName = (value: string) => normalizeText(value ?? '')
const normalizedId = (value: string) => String(value ?? '').trim()
const toArray = (value: string[] | string | null | undefined): string[] => {
  if (Array.isArray(value)) return [...value]
  if (typeof value === 'string' && value.length > 0) return [value]
  return []
}

watch(
  () => props.options,
  () => {
    const base = props.options ?? []
    extraOptions.value = extraOptions.value.filter((option) => {
      const optionKey = normalizedId(String(option.value))
      return !base.some((baseOption) => normalizedId(String(baseOption.value)) === optionKey)
    })
  },
  { deep: true },
)

const combinedOptions = computed<SelectOption[]>(() => {
  const map = new Map<string, SelectOption>()
  for (const option of props.options ?? []) {
    const key = normalizedId(String(option?.value))
    if (!key) continue
    map.set(key, option)
  }
  for (const option of extraOptions.value) {
    const key = normalizedId(String(option?.value))
    if (!key || map.has(key)) continue
    map.set(key, option)
  }
  return Array.from(map.values()).sort((a, b) =>
    String(a.label).localeCompare(String(b.label), 'ru'),
  )
})

const optionsByNormalizedLabel = computed(() => {
  const map = new Map<string, SelectOption>()
  for (const option of combinedOptions.value) {
    map.set(normalizedName(String(option.label ?? '')), option)
  }
  return map
})

const trimmedQuery = computed(() => search.value.trim())
const normalizedQuery = computed(() => normalizedName(trimmedQuery.value))

const canCreate = computed(() => {
  if (normalizedQuery.value.length < 2) return false
  // Проверяем дубликаты по имени (label), чтобы в режиме id не запрещать создание по value
  return !optionsByNormalizedLabel.value.has(normalizedQuery.value)
})

watch(selectVisible, (open) => {
  if (!open) search.value = ''
})

const emitValue = (next: string[] | string | null) => {
  if (Array.isArray(next)) {
    emit('update:value', Array.from(new Set(next)))
    return
  }
  if (next == null) {
    emit('update:value', next)
    return
  }
  emit('update:value', next)
}

const handleUpdateValue = (value: string[] | string | null) => {
  emitValue(value)
}

const handleBlur = (payload: FocusEvent) => {
  emit('blur', payload)
}

const keepFocus = async () => {
  await nextTick()
  selectVisible.value = true
  await nextTick()
  selectRef.value?.focus()
}

const confirmCreate = (name: string) => {
  return new Promise<boolean>((resolve) => {
    let settled = false
    const finish = (value: boolean) => {
      if (settled) return
      settled = true
      resolve(value)
    }

    dialog.warning({
      title: 'Создать компонент',
      content: `Создать компонент «${name}»?`,
      positiveText: 'Создать',
      negativeText: 'Отмена',
      maskClosable: false,
      onPositiveClick: () => finish(true),
      onNegativeClick: () => finish(false),
      onClose: () => finish(false),
    })
  })
}

const handleCreate = async () => {
  if (!canCreate.value || creating.value) return
  const name = trimmedQuery.value
  const ok = await confirmCreate(name)
  if (!ok) return

  creating.value = true
  try {
    const created = await createComponentIfMissing(name)
    const payload: ComponentCreatedPayload = {
      id: String(created.id),
      cls: created.cls,
      name: created.name,
    }
    const option: SelectOption = {
      label: payload.name,
      value: isIdMode.value ? payload.id : payload.name,
    }
    const existsInExtras = extraOptions.value.some(
      (item) => normalizedId(String(item.value)) === normalizedId(String(option.value)),
    )
    const existsInProps = (props.options ?? []).some(
      (item) => normalizedId(String(item.value)) === normalizedId(String(option.value)),
    )
    if (!existsInExtras && !existsInProps) {
      extraOptions.value = [...extraOptions.value, option]
    }
    emit('created', payload)
    if (isMultiple.value && !isIdMode.value) {
      const current = toArray(props.value)
      const normalizedExisting = new Set(current.map((name) => normalizedName(name)))
      const nextName = payload.name.trim()
      const result = normalizedExisting.has(normalizedName(nextName))
        ? current
        : [...current, nextName]
      emit('update:value', result)
    } else if (isMultiple.value) {
      const current = toArray(props.value)
      const normalizedExisting = new Set(current.map((value) => normalizedId(value)))
      const nextValue = String(option.value)
      emit(
        'update:value',
        normalizedExisting.has(normalizedId(nextValue)) ? current : [...current, nextValue],
      )
    } else {
      emitValue(String(option.value))
    }
    message.success('Компонент создан')
    search.value = ''
    await keepFocus()
  } catch (error) {
    console.error(error)
    message.error('Не удалось создать компонент')
  } finally {
    creating.value = false
  }
}

const handleSearch = (value: string) => {
  search.value = value
}

const inputProps = computed(() => ({
  onKeyup: (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      void handleCreate()
    }
  },
}))
</script>

<template>
  <NSelect
    ref="selectRef"
    :value="value as any"
    :options="combinedOptions"
    :multiple="isMultiple"
    filterable
    :clearable="clearable !== false"
    :input-props="inputProps"
    :loading="creating || !!loading"
    :disabled="disabled"
    :placeholder="placeholder ?? 'Начните вводить, чтобы найти компонент'"
    v-model:show="selectVisible"
    @update:value="handleUpdateValue"
    @search="handleSearch"
    @blur="handleBlur"
  >
    <template v-if="canCreate" #action>
      <div class="select-action">
        <NButton
          type="primary"
          text
          block
          :loading="creating"
          :disabled="creating"
          @click="handleCreate"
        >
          Создать «{{ trimmedQuery }}»
        </NButton>
      </div>
    </template>
    <template #empty>
      <div class="select-empty">Нет совпадений</div>
    </template>
  </NSelect>
</template>

<style scoped>
.select-action {
  padding: 6px 12px;
  border-top: 1px solid var(--n-border-color);
}

.select-empty {
  padding: 8px 12px;
  color: var(--n-text-color-3);
}
</style>
