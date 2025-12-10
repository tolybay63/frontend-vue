<template>
  <section class="page">
    <header class="page__header">
      <div>
        <h1>Управление страницами</h1>
        <p class="muted">
          Создавайте пользовательские страницы, выбирайте макет и добавляйте контейнеры с данными из
          раздела «Данные».
        </p>
      </div>
      <button class="btn-primary" type="button" @click="createPage">Создать страницу</button>
    </header>

    <div v-if="pagesLoading" class="empty-state">
      <p>Загружаем страницы...</p>
    </div>
    <div v-else-if="pagesError" class="empty-state empty-state--error">
      <p>{{ pagesError }}</p>
      <button class="btn-outline btn-sm" type="button" @click="store.fetchPages(true)">Повторить</button>
    </div>
    <div v-else-if="!pages.length" class="empty-state">
      <p>Страниц пока нет. Нажмите «Создать страницу», чтобы начать.</p>
    </div>

    <div class="grid">
      <article v-for="page in pages" :key="page.id" class="card">
        <header>
          <div>
            <h2>{{ page.pageTitle }}</h2>
            <p class="muted">{{ page.description || 'Без описания' }}</p>
          </div>
          <span class="badge">{{ layoutLabel(page.layout?.preset) }}</span>
        </header>
        <dl>
          <dt>Пункт меню</dt>
          <dd>{{ page.menuTitle }}</dd>
          <dt>Глобальные фильтры</dt>
          <dd>{{ pageFilterLabels(page).length ? pageFilterLabels(page).join(', ') : 'Нет' }}</dd>
          <dt>Контейнеры</dt>
          <dd>{{ page.containerCount ?? page.layout?.containers?.length ?? 0 }}</dd>
        </dl>
        <div class="actions">
          <button
            class="icon-btn"
            type="button"
            aria-label="Открыть страницу"
            title="Открыть"
            @click="previewPage(page.id)"
          >
            <span class="icon icon-eye" />
          </button>
          <button
            class="icon-btn"
            type="button"
            aria-label="Редактировать страницу"
            title="Редактировать"
            @click="editPage(page.id)"
          >
            <span class="icon icon-edit" />
          </button>
          <button
            class="icon-btn icon-btn--danger"
            type="button"
            aria-label="Удалить страницу"
            title="Удалить"
            @click="removePage(page.id)"
          >
            <span class="icon icon-trash" />
          </button>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePageBuilderStore, resolveCommonContainerFieldKeys } from '@/shared/stores/pageBuilder'
import { useFieldDictionaryStore } from '@/shared/stores/fieldDictionary'
import { humanizeKey } from '@/shared/lib/pivotUtils'

const router = useRouter()
const store = usePageBuilderStore()
const fieldDictionaryStore = useFieldDictionaryStore()

const pages = computed(() => store.pages)
const pagesLoading = computed(() => store.pagesLoading)
const pagesError = computed(() => store.pagesError)
const layoutLabels = computed(() => store.layoutLabelMap)
const dictionaryLabels = computed(() => fieldDictionaryStore.labelMap || {})
const dictionaryLabelsLower = computed(() => fieldDictionaryStore.labelMapLower || {})

onMounted(() => {
  store.fetchPages(true)
  fieldDictionaryStore.fetchDictionary()
})

function layoutLabel(value) {
  if (!value) return '—'
  return layoutLabels.value?.[value] || value
}

function pageFilterLabels(page) {
  if (!page || !page.filters?.length) return []
  const containers = store.pageContainers?.[page.id]?.items || []
  const commonKeys = resolveCommonContainerFieldKeys(containers, store.templates)
  const allowed = new Set(commonKeys)
  if (!allowed.size) return []
  return page.filters
    .filter((key) => allowed.has(key))
    .map((key) => resolveFieldLabel(key))
}

function resolveFieldLabel(key) {
  if (!key) return ''
  const normalized = String(key).trim()
  if (!normalized) return ''
  const direct = dictionaryLabels.value?.[normalized]
  if (direct) return direct
  const lower = normalized.toLowerCase()
  const lowerMatch = dictionaryLabelsLower.value?.[lower]
  if (lowerMatch) return lowerMatch
  return humanizeKey(normalized)
}

function createPage() {
  router.push('/pages/new')
}
function editPage(pageId) {
  router.push(`/pages/${pageId}/edit`)
}
function previewPage(pageId) {
  router.push(`/dash/${pageId}`)
}
async function removePage(pageId) {
  if (confirm('Удалить страницу?')) {
    try {
      await store.removePage(pageId)
      store.fetchPages(true)
    } catch (err) {
      alert('Не удалось удалить страницу. Попробуйте позже.')
    }
  }
}
</script>

<style scoped>
.page {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.page__header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}
.card {
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.card header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}
.muted {
  color: #6b7280;
  font-size: 13px;
}
.badge {
  background: #eef2ff;
  color: #312e81;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  text-transform: uppercase;
}
dl {
  margin: 0;
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 6px 12px;
  font-size: 14px;
}
dt {
  color: #6b7280;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.empty-state {
  border: 1px dashed #d1d5db;
  border-radius: 12px;
  padding: 16px;
  color: #6b7280;
}
.empty-state--error {
  border-color: #fecaca;
  color: #b91c1c;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
