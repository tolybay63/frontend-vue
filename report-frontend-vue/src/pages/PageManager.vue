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
      <button
        class="btn-outline btn-sm"
        type="button"
        @click="store.fetchPages({ force: true, skipCooldown: true })"
      >
        Повторить
      </button>
    </div>
    <div v-else-if="!pages.length" class="empty-state">
      <p>Страниц пока нет. Нажмите «Создать страницу», чтобы начать.</p>
    </div>

    <template v-else>
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
            <dt>Порядок в меню</dt>
            <dd>
              <input
                class="order-input"
                type="number"
                min="1"
                step="1"
                inputmode="numeric"
                :value="menuOrderValue(page.id)"
                placeholder="-"
                @change="updateMenuOrder(page.id, $event)"
              />
            </dd>
            <dt>Глобальные фильтры</dt>
            <dd>
              {{
                pageFilterLabels(page).length
                  ? pageFilterLabels(page).join(', ')
                  : 'Нет'
              }}
            </dd>
            <dt>Контейнеры</dt>
            <dd>{{ page.containerCount ?? page.layout?.containers?.length ?? 0 }}</dd>
          </dl>
          <div class="actions">
            <button
              class="icon-btn"
              type="button"
              aria-label="Открыть страницу"
              title="Открыть"
              :disabled="!canInteractWithPage(page)"
              @click="previewPage(page.id)"
            >
              <span class="icon icon-eye" />
            </button>
            <button
              class="icon-btn"
              type="button"
              aria-label="Редактировать страницу"
              title="Редактировать"
              :disabled="!canInteractWithPage(page)"
              @click="editPage(page.id)"
            >
              <span class="icon icon-edit" />
            </button>
            <button
              class="icon-btn icon-btn--danger"
              type="button"
              aria-label="Удалить страницу"
              title="Удалить"
              :disabled="!canInteractWithPage(page)"
              @click="removePage(page.id)"
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
              <th>Страница</th>
              <th>Макет</th>
              <th>Пункт меню</th>
              <th>Порядок</th>
              <th>Глобальные фильтры</th>
              <th>Контейнеры</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="page in pages" :key="page.id">
              <td>
                <div class="cell-title">{{ page.pageTitle }}</div>
                <div class="cell-muted">
                  {{ page.description || 'Без описания' }}
                </div>
              </td>
              <td>{{ layoutLabel(page.layout?.preset) }}</td>
              <td>{{ page.menuTitle }}</td>
              <td>
                <input
                  class="order-input"
                  type="number"
                  min="1"
                  step="1"
                  inputmode="numeric"
                  :value="menuOrderValue(page.id)"
                  placeholder="-"
                  @change="updateMenuOrder(page.id, $event)"
                />
              </td>
              <td>
                {{
                  pageFilterLabels(page).length
                    ? pageFilterLabels(page).join(', ')
                    : 'Нет'
                }}
              </td>
              <td>{{ page.containerCount ?? page.layout?.containers?.length ?? 0 }}</td>
              <td class="cell-actions">
                <button
                  class="icon-btn"
                  type="button"
                  aria-label="Открыть страницу"
                  title="Открыть"
                  :disabled="!canInteractWithPage(page)"
                  @click="previewPage(page.id)"
                >
                  <span class="icon icon-eye" />
                </button>
                <button
                  class="icon-btn"
                  type="button"
                  aria-label="Редактировать страницу"
                  title="Редактировать"
                  :disabled="!canInteractWithPage(page)"
                  @click="editPage(page.id)"
                >
                  <span class="icon icon-edit" />
                </button>
                <button
                  class="icon-btn icon-btn--danger"
                  type="button"
                  aria-label="Удалить страницу"
                  title="Удалить"
                  :disabled="!canInteractWithPage(page)"
                  @click="removePage(page.id)"
                >
                  <span class="icon icon-trash" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="list">
        <div v-for="page in pages" :key="page.id" class="list-item">
          <button
            class="list-toggle"
            type="button"
            :aria-expanded="isExpanded(page.id)"
            @click="toggleExpanded(page.id)"
          >
            <span>{{ page.pageTitle }}</span>
            <span
              class="list-chevron"
              :class="{ 'is-open': isExpanded(page.id) }"
            />
          </button>
          <div v-if="isExpanded(page.id)" class="list-card">
            <article class="card">
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
                <dt>Порядок в меню</dt>
                <dd>
                  <input
                    class="order-input"
                    type="number"
                    min="1"
                    step="1"
                    inputmode="numeric"
                    :value="menuOrderValue(page.id)"
                    placeholder="-"
                    @change="updateMenuOrder(page.id, $event)"
                  />
                </dd>
                <dt>Глобальные фильтры</dt>
                <dd>
                  {{
                    pageFilterLabels(page).length
                      ? pageFilterLabels(page).join(', ')
                      : 'Нет'
                  }}
                </dd>
                <dt>Контейнеры</dt>
                <dd>
                  {{ page.containerCount ?? page.layout?.containers?.length ?? 0 }}
                </dd>
              </dl>
              <div class="actions">
                <button
                  class="icon-btn"
                  type="button"
                  aria-label="Открыть страницу"
                  title="Открыть"
                  :disabled="!canInteractWithPage(page)"
                  @click="previewPage(page.id)"
                >
                  <span class="icon icon-eye" />
                </button>
                <button
                  class="icon-btn"
                  type="button"
                  aria-label="Редактировать страницу"
                  title="Редактировать"
                  :disabled="!canInteractWithPage(page)"
                  @click="editPage(page.id)"
                >
                  <span class="icon icon-edit" />
                </button>
                <button
                  class="icon-btn icon-btn--danger"
                  type="button"
                  aria-label="Удалить страницу"
                  title="Удалить"
                  :disabled="!canInteractWithPage(page)"
                  @click="removePage(page.id)"
                >
                  <span class="icon icon-trash" />
                </button>
              </div>
            </article>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { usePageBuilderStore, resolveCommonContainerFieldKeys } from '@/shared/stores/pageBuilder'
import { useFieldDictionaryStore } from '@/shared/stores/fieldDictionary'
import { useAuthStore } from '@/shared/stores/auth'
import {
  humanizeKey,
  parseDatePartKey,
  formatDatePartFieldLabel,
} from '@/shared/lib/pivotUtils'
import { canUserAccessPage, readStoredUserMeta, resolveUserMeta } from '@/shared/lib/pageAccess'

const router = useRouter()
const store = usePageBuilderStore()
const fieldDictionaryStore = useFieldDictionaryStore()
const authStore = useAuthStore()

const pages = computed(() => store.orderedPages)
const pagesLoading = computed(() => store.pagesLoading)
const pagesError = computed(() => store.pagesError)
const layoutLabels = computed(() => store.layoutLabelMap)
const dictionaryLabels = computed(() => fieldDictionaryStore.labelMap || {})
const dictionaryLabelsLower = computed(() => fieldDictionaryStore.labelMapLower || {})
const currentUserMeta = computed(() => {
  const personal = resolveUserMeta(authStore.personalInfo)
  if (personal) return personal
  return readStoredUserMeta()
})
const VIEW_MODE_KEY = 'constructor-view-mode:pages'
const viewModeOptions = [
  { value: 'cards', label: 'Карточки', icon: 'icon-cards' },
  { value: 'table', label: 'Таблица', icon: 'icon-table' },
  { value: 'list', label: 'Список', icon: 'icon-list' },
]
const viewMode = ref(loadViewMode())
const expandedItems = reactive({})

onMounted(() => {
  store.fetchPages()
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
  const dictionary = dictionaryLabels.value || {}
  const direct = dictionary[normalized]
  if (direct) return direct
  const lowerDict = dictionaryLabelsLower.value || {}
  const lower = normalized.toLowerCase()
  if (lowerDict[lower]) return lowerDict[lower]
  const dateMeta = parseDatePartKey(normalized)
  if (dateMeta) {
    const baseLower = dateMeta.fieldKey ? dateMeta.fieldKey.toLowerCase() : ''
    const baseLabel =
      dictionary[dateMeta.fieldKey] ||
      (baseLower ? lowerDict[baseLower] : '') ||
      humanizeKey(dateMeta.fieldKey || '')
    return formatDatePartFieldLabel(baseLabel, dateMeta.part)
  }
  return humanizeKey(normalized)
}

function createPage() {
  router.push('/pages/new')
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
function menuOrderValue(pageId) {
  const value = store.getDashboardOrderForPage(pageId)
  return value == null ? '' : value
}
function updateMenuOrder(pageId, event) {
  const nextValue = event?.target?.value ?? ''
  store.setDashboardOrder(pageId, nextValue)
}
function canInteractWithPage(page) {
  return canUserAccessPage(page, currentUserMeta.value)
}
function ensurePageAccess(pageId) {
  const page = store.getPageById(pageId)
  if (page && canInteractWithPage(page)) {
    return true
  }
  alert('Нет доступа к этой странице.')
  return false
}
function editPage(pageId) {
  if (!ensurePageAccess(pageId)) return
  router.push(`/pages/${pageId}/edit`)
}
function previewPage(pageId) {
  if (!ensurePageAccess(pageId)) return
  router.push(`/dash/${pageId}`)
}
async function removePage(pageId) {
  if (!ensurePageAccess(pageId)) return
  if (confirm('Удалить страницу?')) {
    try {
      await store.removePage(pageId)
      store.fetchPages({ force: true, skipCooldown: true })
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
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
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
  min-width: 140px;
}
.data-table th:nth-child(3),
.data-table td:nth-child(3) {
  min-width: 160px;
}
.data-table th:nth-child(4),
.data-table td:nth-child(4),
.data-table th:nth-child(6),
.data-table td:nth-child(6) {
  text-align: center;
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
.order-input {
  width: 100%;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  padding: 6px 10px;
  font-size: 13px;
  background: #fff;
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
