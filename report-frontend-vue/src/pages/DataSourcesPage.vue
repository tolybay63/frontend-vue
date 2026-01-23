<template>
  <section class="page">
    <header class="page__header">
      <div>
        <h1>Источники данных</h1>
        <p class="muted">
          Управляйте подключениями и параметрами запросов. Источники можно
          повторно использовать в разных представлениях.
        </p>
      </div>
      <div class="page__actions">
        <button class="btn-outline" type="button" @click="startSourceWizard">
          Создать источник
        </button>
      </div>
    </header>

    <ConstructorTabs />

    <div class="info-card">
      <div>
        <div class="info-card__title">Сценарии работы с источниками</div>
        <p class="muted">
          Выберите источник, откройте его в мастере или создайте новое
          представление на его основе.
        </p>
      </div>
      <button
        class="btn-outline btn-sm"
        type="button"
        :disabled="!archivedSources.length"
        @click="toggleArchived"
      >
        {{
          showArchived
            ? 'Скрыть архив'
            : `Показать архив (${archivedSources.length})`
        }}
      </button>
    </div>

    <div v-if="loading" class="empty-state">
      <p>Загружаем источники...</p>
    </div>
    <div v-else-if="loadError" class="empty-state empty-state--error">
      <p>{{ loadError }}</p>
      <button class="btn-outline btn-sm" type="button" @click="fetchSources">
        Попробовать снова
      </button>
    </div>
    <div v-else-if="!activeSources.length" class="empty-state">
      <p>Пока нет активных источников.</p>
      <p class="muted">
        Создайте новый источник, чтобы приступить к настройке представлений.
      </p>
      <button class="btn-primary" type="button" @click="startSourceWizard">
        Создать источник
      </button>
    </div>

    <div v-else class="grid">
      <article v-for="source in activeSources" :key="source.id" class="card">
        <header class="card__header">
          <div>
            <h2>{{ source.name }}</h2>
            <p class="muted">{{ source.description || 'Без описания' }}</p>
          </div>
          <span class="tag">{{ sourceTagLabel(source) }}</span>
        </header>
        <div class="card__meta">
          Используется в {{ sourceUsageCount(source) }} представлениях
        </div>
        <div class="card__actions">
          <button
            class="icon-btn icon-btn--primary"
            type="button"
            aria-label="Открыть источник"
            title="Открыть источник"
            @click="openSource(source)"
          >
            <span class="icon icon-edit" />
          </button>
          <button
            class="icon-btn"
            type="button"
            aria-label="Создать представление"
            title="Создать представление"
            @click="createViewFromSource(source)"
          >
            <span class="icon icon-send" />
          </button>
          <button
            class="btn-outline btn-sm"
            type="button"
            @click="toggleArchive(source)"
          >
            Архивировать
          </button>
          <button
            class="icon-btn icon-btn--danger"
            type="button"
            aria-label="Удалить источник"
            title="Удалить источник"
            @click="removeSource(source)"
          >
            <span class="icon icon-trash" />
          </button>
        </div>
      </article>
    </div>

    <section v-if="showArchived && archivedSources.length" class="archive">
      <h3>Архив источников</h3>
      <div class="grid">
        <article
          v-for="source in archivedSources"
          :key="source.id"
          class="card card--archived"
        >
          <header class="card__header">
            <div>
              <h2>{{ source.name }}</h2>
              <p class="muted">{{ source.description || 'Без описания' }}</p>
            </div>
            <span class="tag tag--archived">В архиве</span>
          </header>
          <div class="card__meta">
            Используется в {{ sourceUsageCount(source) }} представлениях
          </div>
          <div class="card__actions">
            <button
              class="btn-outline btn-sm"
              type="button"
              @click="toggleArchive(source)"
            >
              Восстановить
            </button>
            <button
              class="icon-btn icon-btn--danger"
              type="button"
              aria-label="Удалить источник"
              title="Удалить источник"
              @click="removeSource(source)"
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
  loadReportConfigurations,
  loadReportPresentations,
  loadReportSources,
  deleteObjectWithProperties,
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
} from '@/shared/lib/reportEntityUsage'

const router = useRouter()
const navigationStore = useNavigationStore()
const archiveStore = useEntityArchiveStore()

const sources = ref([])
const configs = ref([])
const presentations = ref([])
const loading = ref(false)
const loadError = ref('')
const showArchived = ref(false)

const usageMaps = computed(() =>
  buildUsageMaps(configs.value, presentations.value),
)
const usageBySource = computed(() => usageMaps.value.usageBySource)

const activeSources = computed(() =>
  sources.value.filter((source) => !isArchived(source)),
)
const archivedSources = computed(() =>
  sources.value.filter((source) => isArchived(source)),
)

onMounted(() => {
  trackEvent('constructor_nav_open', { section: 'sources' })
  fetchSources()
})

async function fetchSources() {
  loading.value = true
  loadError.value = ''
  try {
    const [sourceRecords, configRecords, presentationRecords] =
      await Promise.all([
        loadReportSources(),
        loadReportConfigurations(),
        loadReportPresentations(),
      ])
    sources.value = sourceRecords.map((entry, index) =>
      normalizeSource(entry, index),
    )
    configs.value = configRecords.map((entry, index) =>
      normalizeConfig(entry, index),
    )
    presentations.value = presentationRecords.map((entry, index) =>
      normalizePresentation(entry, index),
    )
  } catch (err) {
    console.warn('Failed to load sources', err)
    loadError.value = 'Не удалось загрузить источники. Попробуйте позже.'
    sources.value = []
    configs.value = []
    presentations.value = []
  } finally {
    loading.value = false
  }
}

function sourceUsageCount(source) {
  const key = stableEntityId(source)
  return usageBySource.value.get(key) || 0
}

function sourceTagLabel(source) {
  if (!source) return 'Источник'
  const meta = source.remoteMeta || {}
  const methodBody =
    meta.MethodBody ||
    meta.methodBody ||
    meta.body ||
    meta.requestBody ||
    meta.rawBody
  const method = extractApiMethod(methodBody)
  if (method) return method
  const url =
    meta.URL ||
    meta.url ||
    meta.requestUrl ||
    meta.RequestUrl ||
    meta.requestURL
  if (url) return url
  return 'Источник'
}

function extractApiMethod(raw) {
  if (!raw) return ''
  if (typeof raw === 'object' && typeof raw.method === 'string') {
    return raw.method
  }
  if (typeof raw !== 'string') return ''
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed.method === 'string') {
      return parsed.method
    }
  } catch {
    return ''
  }
  return ''
}

function isArchived(source) {
  return archiveStore.isArchived('source', stableEntityId(source))
}

function toggleArchive(source) {
  const key = stableEntityId(source)
  if (!key) return
  const nextArchived = !archiveStore.isArchived('source', key)
  archiveStore.toggleArchive('source', key)
  trackEvent('source_archive_toggle', { id: key, archived: nextArchived })
}

function toggleArchived() {
  showArchived.value = !showArchived.value
}

function startSourceWizard() {
  navigationStore.allowDataAccess()
  router.push({
    path: '/data',
    query: { createSource: '1' },
  })
}

function openSource(source) {
  const sourceId = stableEntityId(source)
  if (!sourceId) return
  navigationStore.allowDataAccess()
  router.push({ path: '/data', query: { sourceId } })
}

function createViewFromSource(source) {
  const sourceId = stableEntityId(source)
  if (!sourceId) return
  navigationStore.allowDataAccess()
  navigationStore.startViewCreation()
  trackEvent('view_creation_start', { source: 'sources', sourceId })
  router.push({ path: '/data', query: { sourceId } })
}

async function removeSource(source) {
  const usageCount = sourceUsageCount(source)
  if (usageCount > 0) {
    alert(
      `Нельзя удалить источник: используется в ${usageCount} представлениях. Используйте архивирование.`,
    )
    trackEvent('source_delete_blocked', {
      id: stableEntityId(source),
      usageCount,
    })
    return
  }
  const remoteId = Number(source.remoteId ?? source.remoteMeta?.id)
  if (!Number.isFinite(remoteId)) {
    alert('Удалить можно только источник, сохранённый на сервере.')
    return
  }
  if (!confirm(`Удалить источник «${source.name || 'Без названия'}»?`)) {
    return
  }
  try {
    await deleteObjectWithProperties(remoteId)
    archiveStore.restoreEntity('source', stableEntityId(source))
    trackEvent('source_deleted', { id: String(remoteId) })
    await fetchSources()
  } catch (err) {
    console.warn('Failed to delete source', err)
    trackEvent('source_delete_error', {
      id: String(remoteId),
      message: String(err?.message || err),
    })
    alert('Не удалось удалить источник. Попробуйте позже.')
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
  display: inline-block;
  max-width: 240px;
  font-size: 11px;
  line-height: 1.2;
  text-transform: uppercase;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
  text-align: center;
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
