<template>
  <section class="page">
    <header class="page__header">
      <div>
        <h1>Конфигурации данных</h1>
        <p class="muted">
          Настраивайте логику, фильтры и агрегации отдельно от представлений.
        </p>
      </div>
      <div class="page__actions">
        <button class="btn-outline" type="button" @click="startConfigWizard">
          Создать конфигурацию
        </button>
      </div>
    </header>

    <ConstructorTabs />

    <div class="info-card">
      <div>
        <div class="info-card__title">Повторное использование конфигураций</div>
        <p class="muted">
          Используйте готовые конфигурации в новых представлениях и
          отслеживайте, где они применяются.
        </p>
      </div>
      <button
        class="btn-outline btn-sm"
        type="button"
        :disabled="!archivedConfigs.length"
        @click="toggleArchived"
      >
        {{
          showArchived
            ? 'Скрыть архив'
            : `Показать архив (${archivedConfigs.length})`
        }}
      </button>
    </div>

    <div v-if="loading" class="empty-state">
      <p>Загружаем конфигурации...</p>
    </div>
    <div v-else-if="loadError" class="empty-state empty-state--error">
      <p>{{ loadError }}</p>
      <button class="btn-outline btn-sm" type="button" @click="fetchConfigs">
        Попробовать снова
      </button>
    </div>
    <div v-else-if="!activeConfigs.length" class="empty-state">
      <p>Пока нет активных конфигураций.</p>
      <p class="muted">
        Сначала создайте конфигурацию в мастере данных, чтобы использовать ее в
        представлениях.
      </p>
      <button class="btn-primary" type="button" @click="startConfigWizard">
        Создать конфигурацию
      </button>
    </div>

    <div v-else class="view-section">
      <div class="page-toolbar">
        <div class="view-controls">
          <span class="muted">Вид:</span>
          <div class="view-toggle">
            <button
              v-for="option in viewModeOptions"
              :key="option.value"
              class="icon-btn"
              :class="{ 'is-active': viewMode === option.value }"
              type="button"
              :title="option.label"
              :aria-label="option.label"
              @click="setViewMode(option.value)"
            >
              <span class="icon" :class="option.icon" />
            </button>
          </div>
        </div>
      </div>

      <div v-if="viewMode === 'cards'" class="grid">
        <article v-for="config in activeConfigs" :key="config.id" class="card">
          <header class="card__header">
            <div>
              <h2>{{ config.name }}</h2>
              <p class="muted">{{ sourceLabel(config) }}</p>
            </div>
            <span class="tag">{{ sourceLabel(config) }}</span>
          </header>
          <div class="card__meta">
            Используется в {{ configUsageCount(config) }} представлениях
          </div>
          <div class="card__actions">
            <button
              class="icon-btn icon-btn--primary"
              type="button"
              aria-label="Открыть конфигурацию"
              title="Открыть конфигурацию"
              @click="openConfig(config)"
            >
              <span class="icon icon-edit" />
            </button>
            <button
              class="icon-btn"
              type="button"
              aria-label="Создать представление"
              title="Создать представление"
              @click="createViewFromConfig(config)"
            >
              <span class="icon icon-send" />
            </button>
            <button
              class="icon-btn"
              type="button"
              aria-label="Архивировать конфигурацию"
              title="Архивировать"
              @click="toggleArchive(config)"
            >
              <span class="icon icon-archive" />
            </button>
            <button
              class="icon-btn icon-btn--danger"
              type="button"
              aria-label="Удалить конфигурацию"
              title="Удалить конфигурацию"
              @click="removeConfig(config)"
            >
              <span class="icon icon-trash" />
            </button>
          </div>
        </article>
      </div>

      <div v-else-if="viewMode === 'table'" class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Конфигурация</th>
              <th>Источник</th>
              <th>Использование</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="config in activeConfigs" :key="config.id">
              <td>
                <div class="cell-title">{{ config.name }}</div>
                <div class="cell-muted">{{ sourceLabel(config) }}</div>
              </td>
              <td>
                <span class="tag">{{ sourceLabel(config) }}</span>
              </td>
              <td>
                Используется в {{ configUsageCount(config) }} представлениях
              </td>
              <td class="cell-actions">
                <button
                  class="icon-btn icon-btn--primary"
                  type="button"
                  aria-label="Открыть конфигурацию"
                  title="Открыть конфигурацию"
                  @click="openConfig(config)"
                >
                  <span class="icon icon-edit" />
                </button>
                <button
                  class="icon-btn"
                  type="button"
                  aria-label="Создать представление"
                  title="Создать представление"
                  @click="createViewFromConfig(config)"
                >
                  <span class="icon icon-send" />
                </button>
                <button
                  class="icon-btn"
                  type="button"
                  aria-label="Архивировать конфигурацию"
                  title="Архивировать"
                  @click="toggleArchive(config)"
                >
                  <span class="icon icon-archive" />
                </button>
                <button
                  class="icon-btn icon-btn--danger"
                  type="button"
                  aria-label="Удалить конфигурацию"
                  title="Удалить конфигурацию"
                  @click="removeConfig(config)"
                >
                  <span class="icon icon-trash" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="list">
        <div v-for="config in activeConfigs" :key="config.id" class="list-item">
          <button
            class="list-toggle"
            type="button"
            :aria-expanded="isExpanded(config.id)"
            @click="toggleExpanded(config.id)"
          >
            <span>{{ config.name }}</span>
            <span
              class="list-chevron"
              :class="{ 'is-open': isExpanded(config.id) }"
            />
          </button>
          <div v-if="isExpanded(config.id)" class="list-card">
            <article class="card">
              <header class="card__header">
                <div>
                  <h2>{{ config.name }}</h2>
                  <p class="muted">{{ sourceLabel(config) }}</p>
                </div>
                <span class="tag">{{ sourceLabel(config) }}</span>
              </header>
              <div class="card__meta">
                Используется в {{ configUsageCount(config) }} представлениях
              </div>
              <div class="card__actions">
                <button
                  class="icon-btn icon-btn--primary"
                  type="button"
                  aria-label="Открыть конфигурацию"
                  title="Открыть конфигурацию"
                  @click="openConfig(config)"
                >
                  <span class="icon icon-edit" />
                </button>
                <button
                  class="icon-btn"
                  type="button"
                  aria-label="Создать представление"
                  title="Создать представление"
                  @click="createViewFromConfig(config)"
                >
                  <span class="icon icon-send" />
                </button>
                <button
                  class="icon-btn"
                  type="button"
                  aria-label="Архивировать конфигурацию"
                  title="Архивировать"
                  @click="toggleArchive(config)"
                >
                  <span class="icon icon-archive" />
                </button>
                <button
                  class="icon-btn icon-btn--danger"
                  type="button"
                  aria-label="Удалить конфигурацию"
                  title="Удалить конфигурацию"
                  @click="removeConfig(config)"
                >
                  <span class="icon icon-trash" />
                </button>
              </div>
            </article>
          </div>
        </div>
      </div>
    </div>

    <section v-if="showArchived && archivedConfigs.length" class="archive">
      <h3>Архив конфигураций</h3>
      <div v-if="viewMode === 'cards'" class="grid">
        <article
          v-for="config in archivedConfigs"
          :key="config.id"
          class="card card--archived"
        >
          <header class="card__header">
            <div>
              <h2>{{ config.name }}</h2>
              <p class="muted">{{ sourceLabel(config) }}</p>
            </div>
            <span class="tag tag--archived">В архиве</span>
          </header>
          <div class="card__meta">
            Используется в {{ configUsageCount(config) }} представлениях
          </div>
          <div class="card__actions">
            <button
              class="icon-btn"
              type="button"
              aria-label="Восстановить конфигурацию"
              title="Восстановить"
              @click="toggleArchive(config)"
            >
              <span class="icon icon-restore" />
            </button>
            <button
              class="icon-btn icon-btn--danger"
              type="button"
              aria-label="Удалить конфигурацию"
              title="Удалить конфигурацию"
              @click="removeConfig(config)"
            >
              <span class="icon icon-trash" />
            </button>
          </div>
        </article>
      </div>
      <div v-else-if="viewMode === 'table'" class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Конфигурация</th>
              <th>Статус</th>
              <th>Использование</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="config in archivedConfigs" :key="config.id">
              <td>
                <div class="cell-title">{{ config.name }}</div>
                <div class="cell-muted">{{ sourceLabel(config) }}</div>
              </td>
              <td>
                <span class="tag tag--archived">В архиве</span>
              </td>
              <td>
                Используется в {{ configUsageCount(config) }} представлениях
              </td>
              <td class="cell-actions">
                <button
                  class="icon-btn"
                  type="button"
                  aria-label="Восстановить конфигурацию"
                  title="Восстановить"
                  @click="toggleArchive(config)"
                >
                  <span class="icon icon-restore" />
                </button>
                <button
                  class="icon-btn icon-btn--danger"
                  type="button"
                  aria-label="Удалить конфигурацию"
                  title="Удалить конфигурацию"
                  @click="removeConfig(config)"
                >
                  <span class="icon icon-trash" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="list">
        <div v-for="config in archivedConfigs" :key="config.id" class="list-item">
          <button
            class="list-toggle"
            type="button"
            :aria-expanded="isExpanded(config.id)"
            @click="toggleExpanded(config.id)"
          >
            <span>{{ config.name }}</span>
            <span
              class="list-chevron"
              :class="{ 'is-open': isExpanded(config.id) }"
            />
          </button>
          <div v-if="isExpanded(config.id)" class="list-card">
            <article class="card card--archived">
              <header class="card__header">
                <div>
                  <h2>{{ config.name }}</h2>
                  <p class="muted">{{ sourceLabel(config) }}</p>
                </div>
                <span class="tag tag--archived">В архиве</span>
              </header>
              <div class="card__meta">
                Используется в {{ configUsageCount(config) }} представлениях
              </div>
              <div class="card__actions">
                <button
                  class="icon-btn"
                  type="button"
                  aria-label="Восстановить конфигурацию"
                  title="Восстановить"
                  @click="toggleArchive(config)"
                >
                  <span class="icon icon-restore" />
                </button>
                <button
                  class="icon-btn icon-btn--danger"
                  type="button"
                  aria-label="Удалить конфигурацию"
                  title="Удалить конфигурацию"
                  @click="removeConfig(config)"
                >
                  <span class="icon icon-trash" />
                </button>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import ConstructorTabs from '@/components/ConstructorTabs.vue'
import {
  deleteObjectWithProperties,
  loadReportConfigurations,
  loadReportPresentations,
  loadReportSources,
} from '@/shared/api/report'
import { useNavigationStore } from '@/shared/stores/navigation'
import { useEntityArchiveStore } from '@/shared/stores/entityArchive'
import { trackEvent } from '@/shared/lib/analytics'
import {
  buildUsageMaps,
  normalizeConfig,
  normalizePresentation,
  normalizeSource,
  stableEntityId,
  stableParentId,
} from '@/shared/lib/reportEntityUsage'

const router = useRouter()
const navigationStore = useNavigationStore()
const archiveStore = useEntityArchiveStore()

const configs = ref([])
const sources = ref([])
const presentations = ref([])
const loading = ref(false)
const loadError = ref('')
const showArchived = ref(false)
const VIEW_MODE_KEY = 'constructor-view-mode:configs'
const viewModeOptions = [
  { value: 'cards', label: 'Карточки', icon: 'icon-cards' },
  { value: 'table', label: 'Таблица', icon: 'icon-table' },
  { value: 'list', label: 'Список', icon: 'icon-list' },
]
const viewMode = ref(loadViewMode())
const expandedItems = reactive({})

const usageMaps = computed(() =>
  buildUsageMaps(configs.value, presentations.value),
)
const usageByConfig = computed(() => usageMaps.value.usageByConfig)

const sourceLookup = computed(() => {
  const map = new Map()
  sources.value.forEach((source) => {
    const key = stableEntityId(source)
    if (key) map.set(key, source)
  })
  return map
})

const activeConfigs = computed(() =>
  configs.value.filter((config) => !isArchived(config)),
)
const archivedConfigs = computed(() =>
  configs.value.filter((config) => isArchived(config)),
)

onMounted(() => {
  trackEvent('constructor_nav_open', { section: 'configs' })
  fetchConfigs()
})

async function fetchConfigs() {
  loading.value = true
  loadError.value = ''
  try {
    const [configRecords, presentationRecords, sourceRecords] =
      await Promise.all([
        loadReportConfigurations(),
        loadReportPresentations(),
        loadReportSources(),
      ])
    configs.value = configRecords.map((entry, index) =>
      normalizeConfig(entry, index),
    )
    presentations.value = presentationRecords.map((entry, index) =>
      normalizePresentation(entry, index),
    )
    sources.value = sourceRecords.map((entry, index) =>
      normalizeSource(entry, index),
    )
  } catch (err) {
    console.warn('Failed to load configs', err)
    loadError.value = 'Не удалось загрузить конфигурации. Попробуйте позже.'
    configs.value = []
    presentations.value = []
    sources.value = []
  } finally {
    loading.value = false
  }
}

function loadViewMode() {
  if (typeof window === 'undefined') return 'cards'
  const stored = window.localStorage.getItem(VIEW_MODE_KEY)
  if (viewModeOptions.some((option) => option.value === stored)) {
    return stored
  }
  return 'cards'
}

function setViewMode(mode) {
  viewMode.value = mode
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(VIEW_MODE_KEY, mode)
  }
}

function toggleExpanded(id) {
  if (!id) return
  expandedItems[id] = !expandedItems[id]
}

function isExpanded(id) {
  return Boolean(expandedItems[id])
}

function configUsageCount(config) {
  const key = stableEntityId(config)
  return usageByConfig.value.get(key) || 0
}

function sourceLabel(config) {
  const sourceId = stableParentId(config)
  if (!sourceId) return 'Источник не найден'
  return sourceLookup.value.get(sourceId)?.name || 'Источник не найден'
}

function isArchived(config) {
  return archiveStore.isArchived('config', stableEntityId(config))
}

function toggleArchive(config) {
  const key = stableEntityId(config)
  if (!key) return
  const nextArchived = !archiveStore.isArchived('config', key)
  archiveStore.toggleArchive('config', key)
  trackEvent('config_archive_toggle', { id: key, archived: nextArchived })
}

function toggleArchived() {
  showArchived.value = !showArchived.value
}

function startConfigWizard() {
  navigationStore.allowDataAccess()
  router.push({ path: '/data', query: { createConfig: '1' } })
}

function openConfig(config) {
  const sourceId = stableParentId(config)
  const configId = stableEntityId(config)
  if (!sourceId || !configId) {
    alert('Не удалось определить источник для конфигурации.')
    return
  }
  navigationStore.allowDataAccess()
  router.push({ path: '/data', query: { sourceId, configId } })
}

function createViewFromConfig(config) {
  const sourceId = stableParentId(config)
  const configId = stableEntityId(config)
  if (!sourceId || !configId) {
    alert('Не удалось определить источник для конфигурации.')
    return
  }
  navigationStore.allowDataAccess()
  navigationStore.startViewCreation()
  trackEvent('view_creation_start', {
    source: 'configs',
    sourceId,
    configId,
  })
  router.push({ path: '/data', query: { sourceId, configId } })
}

async function removeConfig(config) {
  const usageCount = configUsageCount(config)
  if (usageCount > 0) {
    alert(
      `Нельзя удалить конфигурацию: используется в ${usageCount} представлениях. Используйте архивирование.`,
    )
    trackEvent('config_delete_blocked', {
      id: stableEntityId(config),
      usageCount,
    })
    return
  }
  const remoteId = Number(config.remoteId ?? config.remoteMeta?.id)
  if (!Number.isFinite(remoteId)) {
    alert('Удалить можно только конфигурацию, сохранённую на сервере.')
    return
  }
  if (!confirm(`Удалить конфигурацию «${config.name || 'Без названия'}»?`)) {
    return
  }
  try {
    await deleteObjectWithProperties(remoteId)
    archiveStore.restoreEntity('config', stableEntityId(config))
    trackEvent('config_deleted', { id: String(remoteId) })
    await fetchConfigs()
  } catch (err) {
    console.warn('Failed to delete config', err)
    trackEvent('config_delete_error', {
      id: String(remoteId),
      message: String(err?.message || err),
    })
    alert('Не удалось удалить конфигурацию. Попробуйте позже.')
  }
}
</script>

<style scoped>
.page {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.page__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}
.page__header h1 {
  margin: 0;
}
.page__actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.muted {
  color: #6b7280;
  font-size: 13px;
  margin: 4px 0 0;
}
.info-card {
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 16px;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  background: #f8fafc;
}
.info-card__title {
  font-weight: 600;
  margin-bottom: 4px;
}
.empty-state {
  border: 1px dashed #d1d5db;
  border-radius: 12px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
}
.empty-state--error {
  border-color: #fecaca;
  color: #b91c1c;
}
.page-toolbar {
  display: flex;
  justify-content: flex-end;
}
.view-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}
.view-toggle {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.view-toggle .icon-btn.is-active {
  background: #e0e7ff;
  border-color: #c7d2fe;
  color: #1d4ed8;
}
.grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
}
.table-wrap {
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  overflow: hidden;
  background: #fff;
}
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.data-table th,
.data-table td {
  padding: 10px 12px;
  border-bottom: 1px solid #e5e7eb;
  text-align: left;
  vertical-align: top;
}
.data-table th {
  background: #f8fafc;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #64748b;
  font-weight: 600;
}
.data-table th:nth-child(2),
.data-table td:nth-child(2) {
  min-width: 160px;
}
.data-table th:nth-child(3),
.data-table td:nth-child(3) {
  min-width: 200px;
}
.data-table th:last-child,
.data-table td:last-child {
  width: 1%;
  white-space: nowrap;
}
.data-table tr:last-child td {
  border-bottom: none;
}
.cell-title {
  font-weight: 600;
}
.cell-muted {
  color: #6b7280;
  font-size: 13px;
  margin-top: 4px;
}
.cell-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: center;
}
.list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.list-toggle {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  cursor: pointer;
}
.list-card {
  margin-top: 6px;
}
.list-chevron {
  width: 14px;
  height: 14px;
  display: inline-block;
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='%2318283a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' viewBox='0 0 24 24'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  mask-size: contain;
  mask-repeat: no-repeat;
  background: currentColor;
  transform: rotate(-90deg);
  transition: transform 0.2s ease;
}
.list-chevron.is-open {
  transform: rotate(0deg);
}
.card {
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: #fff;
  min-height: 220px;
}
.card--archived {
  background: #f8fafc;
}
.card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}
.card__header h2 {
  margin: 0;
}
.card__meta {
  font-size: 13px;
  color: #4b5563;
}
.tag {
  background: #eef2ff;
  color: #312e81;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  text-transform: uppercase;
}
.tag--archived {
  background: #e2e8f0;
  color: #475569;
}
.card__actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: auto;
  align-items: center;
}
.archive {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.archive h3 {
  margin: 0;
}
.btn-sm {
  padding: 6px 14px;
  font-size: 13px;
}
</style>
