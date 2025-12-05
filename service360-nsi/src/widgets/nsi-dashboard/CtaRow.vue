<template>
  <header class="nsi-dashboard-cta">
    <div class="nsi-dashboard-cta__top">
      <div class="nsi-dashboard-cta__titles">
        <h1 class="nsi-dashboard-cta__title">{{ title }}</h1>
        <p class="nsi-dashboard-cta__subtitle">{{ subtitle }}</p>
      </div>
      <!-- Ассистент временно отключен
      <NTooltip trigger="hover" :disabled="assistantTooltip === ''">
        <template #trigger>
          <label class="nsi-dashboard-cta__assistant" :aria-pressed="assistantEnabled">
            <span class="assistant-label">{{ assistantLabel }}</span>
            <NSwitch
              :value="assistantEnabled"
              size="small"
              :aria-label="assistantLabel"
              @update:value="emitToggle"
            />
          </label>
        </template>
        <span>{{ assistantTooltip }}</span>
      </NTooltip>
      -->
    </div>

    <!-- Ассистент временно отключен
    <div v-if="assistantEnabled" class="nsi-dashboard-cta__assistant-banner" role="status">
      <strong>{{ assistantBannerTitle }}</strong>
      <span>{{ assistantBannerText }}</span>
    </div>
    -->

    <div class="nsi-dashboard-cta__controls">
      <div ref="searchRef" class="nsi-dashboard-cta__search">
        <NInput
          v-model:value="searchQuery"
          class="search-input"
          size="large"
          :placeholder="searchPlaceholder"
          clearable
          @focus="handleFocus"
          @blur="handleBlur"
          @keydown.enter.prevent="handleSubmit"
        >
          <template #prefix>
            <NIcon :component="SearchOutline" />
          </template>
        </NInput>

        <transition name="fade">
          <div v-if="showDropdown" class="search-dropdown" role="listbox">
            <div v-if="searchLoading" class="search-state search-state--loading">
              <NSpin size="small" />
              <span>{{ searchLoadingText }}</span>
            </div>
            <div v-else-if="shouldSuggest">{{ searchTypingHint }}</div>
            <template v-else>
              <button
                v-for="(item, i) in searchResults"
                :key="`${item.type ?? 'unknown'}:${String(item.id ?? item.title ?? i)}`"
                type="button"
                class="search-result"
                role="option"
                @mousedown.prevent="handleResultSelect(item)"
              >
                <span class="search-result__title">{{ item.title }}</span>
                <span class="search-result__meta">
                  <span class="search-result__type">{{ searchTypes[item.type] || item.type }}</span>
                  <span v-if="item.extra" class="search-result__extra">{{ item.extra }}</span>
                </span>
                <span class="search-result__action">{{ searchOpenLabel }}</span>
              </button>
              <div v-if="!searchResults.length" class="search-state">{{ searchEmpty }}</div>
            </template>
          </div>
        </transition>
      </div>

      <div class="nsi-dashboard-cta__actions" role="group" :aria-label="actionsAriaLabel">
        <template v-for="action in actions" :key="action.id">
          <NTooltip placement="bottom">
            <template #trigger>
              <NButton quaternary size="large" class="cta-action" @click="navigate(action.to)">
                {{ action.label }}
              </NButton>
            </template>
            <span>{{ action.tooltip }}</span>
          </NTooltip>
        </template>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter, type RouteLocationRaw } from 'vue-router'
import { NButton, NIcon, NInput, NSpin, NTooltip } from 'naive-ui'
import { SearchOutline } from '@vicons/ionicons5'

import { useNsiSearch } from '@features/nsi-dashboard'
import type { NsiSearchResult, NsiSearchResultType } from '@entities/nsi-dashboard'

defineOptions({
  name: 'NsiDashboardCtaRow',
})

interface ActionItem {
  id: string
  label: string
  tooltip: string
  to: RouteLocationRaw
}

interface CtaRowProps {
  title: string
  subtitle: string
  actions: ActionItem[]
  assistantEnabled?: boolean
  assistantLabel?: string
  assistantTooltip?: string
  assistantBannerTitle?: string
  assistantBannerText?: string
  searchPlaceholder: string
  searchTypingHint: string
  searchEmpty: string
  searchLoadingText: string
  searchOpenLabel: string
  searchTypes: Record<string, string>
  actionsAriaLabel: string
}

defineProps<CtaRowProps>()

const emit = defineEmits<{
  (e: 'toggle-assistant', value: boolean): void
  (e: 'select-search', payload: NsiSearchResult): void
}>()

const router = useRouter()
const searchMutation = useNsiSearch()

const searchQuery = ref('')
const searchLoading = ref(false)
const searchResults = ref<NsiSearchResult[]>([])
const searchFocused = ref(false)
const searchRef = ref<HTMLElement | null>(null)

let debounceTimer: ReturnType<typeof setTimeout> | null = null
let requestToken = 0

const trimmedQuery = computed(() => searchQuery.value.trim())
const shouldSuggest = computed(() => trimmedQuery.value.length > 0 && trimmedQuery.value.length < 2)

const showDropdown = computed(() => {
  if (!searchFocused.value) return false
  if (searchLoading.value) return true
  if (shouldSuggest.value) return true
  if (trimmedQuery.value.length >= 2) return true
  return false
})

watch(trimmedQuery, (value) => {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }

  if (value.length < 2) {
    searchResults.value = []
    searchLoading.value = false
    return
  }

  debounceTimer = setTimeout(() => {
    void runSearch(value)
  }, 250)
})
function normalizeToArray<T = Record<string, unknown>>(input: unknown): T[] {
  if (!input) return []
  if (Array.isArray(input)) return input as T[]

  const obj = input as {
    items?: T[]
    records?: T[]
    data?: T[]
    result?: T[] | { items?: T[] }
    payload?: { items?: T[] }
  }

  // самые частые варианты обёрток
  if (Array.isArray(obj.items)) return obj.items
  if (Array.isArray(obj.records)) return obj.records
  if (Array.isArray(obj.data)) return obj.data
  if (Array.isArray(obj.result)) return obj.result as T[]
  if (obj.result && Array.isArray((obj.result as { items?: T[] }).items)) return (obj.result as { items?: T[] }).items as T[]
  if (obj.payload && Array.isArray(obj.payload.items)) return obj.payload.items

  // single item → массив из одного элемента
  return [input as T]
}

function mapResultRecord(r: Record<string, unknown>, i: number) {
  const type = r.type ?? r.kind ?? r.entity ?? r.category ?? 'unknown'

  const id = r.id ?? r.uuid ?? r.idro ?? r.iddoc ?? r.obj ?? `${type}-${i}`

  // подставь все встречающиеся поля названий из ваших RPC
  const title =
    r.title ??
    r.name ??
    r.cisname2 ??
    r.cisname1 ??
    r.namerom2 ??
    r.namerom1 ??
    r.caption ??
    String(id)

  const extra =
    (typeof r.code === 'string'
      ? r.code
      : typeof r.shortCode === 'string'
        ? r.shortCode
        : typeof r.path === 'string'
          ? r.path
          : typeof r.group === 'string'
            ? r.group
            : undefined) as string | undefined

  return {
    ...r,
    id: String(id),
    type: String(type) as NsiSearchResultType,
    title: String(title),
    extra,
  } as NsiSearchResult & Record<string, unknown>
}

async function runSearch(query: string) {
  requestToken += 1
  const currentToken = requestToken
  searchLoading.value = true
  try {
    const raw = await searchMutation.mutateAsync(query)
    const list = normalizeToArray(raw).map(mapResultRecord)

    if (currentToken === requestToken) {
      searchResults.value = list
    }
  } catch (error) {
    if (currentToken === requestToken) {
      searchResults.value = []
      console.error('Failed to search NSI', error)
    }
  } finally {
    if (currentToken === requestToken) {
      searchLoading.value = false
    }
  }
}

function handleFocus() {
  searchFocused.value = true
}

function handleBlur() {
  setTimeout(() => {
    searchFocused.value = false
  }, 150)
}

function handleSubmit() {
  if (searchResults.value.length > 0) {
    handleResultSelect(searchResults.value[0])
  }
}

function handleResultSelect(item: NsiSearchResult) {
  emit('select-search', item)
  searchQuery.value = ''
  searchResults.value = []
  searchFocused.value = false
}

// Ассистент временно отключён
// function emitToggle(value: boolean) {
//   emit('toggle-assistant', value)
// }

function navigate(target: RouteLocationRaw) {
  void router.push(target)
}

function handleDocumentClick(event: MouseEvent) {
  const root = searchRef.value
  if (!root) return
  if (!root.contains(event.target as Node)) {
    searchFocused.value = false
  }
}

onMounted(() => {
  document.addEventListener('mousedown', handleDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleDocumentClick)
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
})
</script>

<style scoped>
.nsi-dashboard-cta {
  display: flex;
  flex-direction: column;
  gap: var(--s360-space-lg);
  padding: var(--s360-space-xl) calc(var(--s360-space-xl) + var(--s360-space-sm));
  background: var(--s360-color-elevated);
  border-radius: var(--s360-radius-lg);
  box-shadow: var(--s360-shadow-lg);
}

.nsi-dashboard-cta__top {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s360-space-lg);
  align-items: center;
  justify-content: space-between;
}

.nsi-dashboard-cta__titles {
  display: flex;
  flex-direction: column;
  gap: var(--s360-space-xs);
}

.nsi-dashboard-cta__title {
  margin: 0;
  font-size: var(--s360-font-title-lg);
  line-height: 1.3;
  font-weight: 600;
}

.nsi-dashboard-cta__subtitle {
  margin: 0;
  color: var(--s360-text-muted);
  font-size: var(--s360-font-body);
}

/* Ассистент временно отключён
.nsi-dashboard-cta__assistant {
  display: inline-flex;
  align-items: center;
  gap: var(--s360-space-sm);
  cursor: pointer;
  color: var(--s360-text-primary);
}

.nsi-dashboard-cta__assistant .assistant-label {
  font-size: var(--s360-font-body);
  font-weight: 600;
}

.nsi-dashboard-cta__assistant-banner {
  display: flex;
  gap: var(--s360-space-sm);
  align-items: center;
  padding: var(--s360-space-sm) var(--s360-space-md);
  border-radius: var(--s360-radius);
  background: var(--s360-color-success-soft);
  color: var(--s360-text-success);
  font-size: var(--s360-font-body);
}
*/

.nsi-dashboard-cta__controls {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s360-space-lg);
  align-items: stretch;
}

.nsi-dashboard-cta__search {
  position: relative;
  flex: 1 1 320px;
  min-width: 260px;
}

.search-input :deep(.n-input__border) {
  border-radius: var(--s360-radius);
}

.search-dropdown {
  position: absolute;
  inset: calc(100% + var(--s360-space-xs)) 0 auto;
  background: var(--s360-color-elevated);
  border-radius: var(--s360-radius-lg);
  box-shadow: var(--s360-shadow-lg);
  padding: var(--s360-space-md);
  display: flex;
  flex-direction: column;
  gap: var(--s360-space-sm);
  z-index: 10;
  max-height: 320px;
  overflow-y: auto;
}

.search-result {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--s360-space-xs);
  padding: var(--s360-space-sm);
  border-radius: var(--s360-radius);
  background: transparent;
  border: none;
  text-align: left;
  cursor: pointer;
  color: inherit;
  transition: background-color 0.15s ease;
}

.search-result:hover,
.search-result:focus {
  background: var(--s360-color-primary-soft);
}

.search-result__title {
  font-weight: 600;
}

.search-result__meta {
  display: flex;
  gap: var(--s360-space-sm);
  font-size: var(--s360-font-caption);
  color: var(--s360-text-muted);
}

.search-result__type {
  font-weight: 600;
}

.search-result__extra {
  color: var(--s360-text-muted);
}

.search-result__action {
  font-size: var(--s360-font-caption);
  color: var(--s360-text-accent);
  font-weight: 600;
}

.search-state {
  padding: var(--s360-space-sm) 0;
  font-size: var(--s360-font-caption);
  color: var(--s360-text-muted);
}

.search-state--loading {
  display: flex;
  gap: var(--s360-space-sm);
  align-items: center;
}

.nsi-dashboard-cta__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s360-space-sm);
}

.cta-action {
  min-width: 140px;
  justify-content: center;
  border-radius: var(--s360-radius);
  font-weight: 600;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .nsi-dashboard-cta {
    padding: var(--s360-space-lg);
  }

  .nsi-dashboard-cta__controls {
    flex-direction: column;
  }

  .nsi-dashboard-cta__actions {
    justify-content: stretch;
  }

  .cta-action {
    width: 100%;
  }
}
</style>
