<!-- Файл: features/creatable-select/ui/CreatableSelect.vue
     Назначение: универсальный селект с возможностью создания опций по вводу.
     Использование: пробросьте :create для создания на бэкенде; если не задано — кнопка создания скрыта. -->
<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { NButton, NSelect, useDialog, useMessage } from 'naive-ui'
import type { SelectOption } from 'naive-ui'
import { normalizeText } from '@shared/lib'

export interface CreateResult {
  label: string
  value: string
}

const props = defineProps<{
  value: string[] | string | null
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
  multiple?: boolean
  clearable?: boolean
  loading?: boolean
  create?: (name: string) => Promise<CreateResult>
}>()

const emit = defineEmits<{
  (event: 'update:value', value: string[] | string | null): void
  (event: 'blur', payload: FocusEvent): void
  (event: 'created', option: CreateResult): void
}>()

const dialog = useDialog()
const message = useMessage()

const selectRef = ref<InstanceType<typeof NSelect> | null>(null)
const selectVisible = ref(false)
const search = ref('')
const creating = ref(false)

const isMultiple = computed(() => props.multiple !== false)

const extraOptions = ref<SelectOption[]>([])

const normalized = (value: string) => normalizeText(value ?? '')

watch(
  () => props.options,
  () => {
    const base = props.options ?? []
    extraOptions.value = extraOptions.value.filter((option) => {
      const optionKey = String(option.value)
      return !base.some((baseOption) => String(baseOption.value) === optionKey)
    })
  },
  { deep: true },
)

const combinedOptions = computed<SelectOption[]>(() => {
  const map = new Map<string, SelectOption>()
  for (const option of props.options ?? []) {
    const key = String(option?.value ?? '')
    if (!key) continue
    map.set(key, option)
  }
  for (const option of extraOptions.value) {
    const key = String(option?.value ?? '')
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
    map.set(normalized(String(option.label ?? '')), option)
  }
  return map
})

const trimmedQuery = computed(() => search.value.trim())
const normalizedQuery = computed(() => normalized(trimmedQuery.value))

const canCreate = computed(() => {
  if (!props.create) return false
  if (normalizedQuery.value.length < 2) return false
  return !optionsByNormalizedLabel.value.has(normalizedQuery.value)
})

watch(selectVisible, (open) => {
  if (!open) search.value = ''
})

const emitValue = (next: string[] | string | null) => {
  if (Array.isArray(next)) emit('update:value', Array.from(new Set(next)))
  else emit('update:value', next)
}

const handleUpdateValue = (value: string[] | string | null) => emitValue(value)

const handleBlur = (payload: FocusEvent) => emit('blur', payload)

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
      title: 'Создать запись',
      content: `Создать «${name}»?`,
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
  if (!canCreate.value || creating.value || !props.create) return
  const name = trimmedQuery.value
  const ok = await confirmCreate(name)
  if (!ok) return

  creating.value = true
  try {
    const created = await props.create(name)
    const option: SelectOption = { label: created.label, value: created.value }
    const existsInExtras = extraOptions.value.some(
      (item) => String(item.value) === String(option.value),
    )
    const existsInProps = (props.options ?? []).some(
      (item) => String(item.value) === String(option.value),
    )
    if (!existsInExtras && !existsInProps) {
      extraOptions.value = [...extraOptions.value, option]
    }
    emit('created', created)

    if (isMultiple.value) {
      const current = Array.isArray(props.value) ? props.value : []
      const nextValue = String(option.value)
      if (!current.includes(nextValue)) emitValue([...current, nextValue])
    } else {
      emitValue(String(option.value))
    }
    message.success('Создано')
    search.value = ''
    await keepFocus()
  } catch (error) {
    console.error(error)
    message.error('Не удалось создать запись')
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
    :placeholder="placeholder ?? 'Выберите значение'"
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

