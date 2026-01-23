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

    <div v-else class="grid">
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
            class="btn-outline btn-sm"
            type="button"
            @click="toggleArchive(config)"
          >
            Архивировать
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

    <section v-if="showArchived && archivedConfigs.length" class="archive">
      <h3>Архив конфигураций</h3>
      <div class="grid">
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
              class="btn-outline btn-sm"
              type="button"
              @click="toggleArchive(config)"
            >
              Восстановить
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
    </section>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
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
.grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
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
