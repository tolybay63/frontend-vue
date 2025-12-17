<template>
  <section class="page">
    <header class="page__header">
      <div>
        <h1>Управление представлениями данных</h1>
        <p class="muted">
          Создавайте и редактируйте сохраненные конфигурации данных. Их можно
          повторно использовать при настройке произвольных страниц.
        </p>
      </div>
      <button class="btn-primary" type="button" @click="goToData">
        Создать представление
      </button>
    </header>

    <div v-if="loading" class="empty-state">
      <p>Загружаем представления...</p>
    </div>
    <div v-else-if="loadError" class="empty-state empty-state--error">
      <p>{{ loadError }}</p>
      <button class="btn-outline btn-sm" type="button" @click="fetchViews">
        Попробовать снова
      </button>
    </div>
    <div v-else-if="!views.length" class="empty-state">
      <p>Пока ни одного представления не сохранено.</p>
      <p class="muted">
        Создайте первое представление в разделе «Данные» и возвращайтесь сюда,
        чтобы подключать его к страницам.
      </p>
    </div>

    <div v-else class="grid">
      <article v-for="view in views" :key="view.id" class="card">
        <header class="card__header">
          <div>
            <h2>{{ view.name }}</h2>
          </div>
          <span class="tag">{{
            view.source?.name || 'Источник не найден'
          }}</span>
        </header>

        <p class="card__description">
          {{ view.description || 'Без описания' }}
        </p>

        <div class="card__actions">
          <button
            class="icon-btn"
            type="button"
            aria-label="Открыть представление"
            title="Открыть представление"
            @click="previewView(view)"
          >
            <span class="icon icon-eye" />
          </button>
          <button
            class="icon-btn"
            type="button"
            :class="{ 'is-active': detailsId === view.id }"
            :aria-label="
              detailsId === view.id ? 'Скрыть детали' : 'Показать детали'
            "
            :title="detailsId === view.id ? 'Скрыть детали' : 'Показать детали'"
            @click="toggleDetails(view.id)"
          >
            <span class="icon icon-info" />
          </button>
          <button
            class="icon-btn"
            type="button"
            aria-label="Редактировать представление"
            @click="startEdit(view)"
          >
            <span class="icon icon-edit" />
          </button>
          <button
            class="icon-btn icon-btn--danger"
            type="button"
            aria-label="Удалить представление"
            @click="removeView(view)"
          >
            <span class="icon icon-trash" />
          </button>
        </div>

        <form
          v-if="editingId === view.id"
          class="edit-form"
          @submit.prevent="submitEdit(view.id)"
        >
          <label class="field">
            <span>Название</span>
            <input v-model="editDraft.name" required />
          </label>
          <label class="field">
            <span>Описание</span>
            <textarea v-model="editDraft.description" rows="3" />
          </label>
          <label class="field">
            <span>Визуализация</span>
            <select
              v-model="editDraft.visualization"
              :disabled="!visualizationOptions.length"
            >
              <option value="" disabled>Выберите тип</option>
              <option
                v-for="option in visualizationOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </label>
          <div class="edit-form__actions">
            <button
              class="btn-outline btn-sm"
              type="button"
              @click="cancelEdit"
            >
              Отмена
            </button>
            <button
              class="btn-primary btn-sm"
              type="submit"
              :disabled="editSaving"
            >
              {{ editSaving ? 'Сохраняем...' : 'Сохранить' }}
            </button>
          </div>
        </form>

        <transition name="fade">
          <dl v-if="detailsId === view.id" class="card__details">
            <dt>Источник</dt>
            <dd>{{ view.source?.name || 'Не найден' }}</dd>
            <dt>Конфигурация</dt>
            <dd>{{ view.config?.name || '—' }}</dd>
            <dt>Визуализация</dt>
            <dd>{{ view.visualizationLabel || 'Тип не указан' }}</dd>
            <dt>Строки</dt>
            <dd>{{ formatFields(view.rows, view.headerOverrides) }}</dd>
            <dt>Столбцы</dt>
            <dd>{{ formatFields(view.columns, view.headerOverrides) }}</dd>
            <dt>Фильтры</dt>
            <dd>{{ formatFields(view.filters, view.headerOverrides) }}</dd>
            <dt>Метрики</dt>
            <dd>{{ formatMetrics(view.metrics) }}</dd>
            <dt>Сохранено</dt>
            <dd>{{ formatDate(view.createdAt) }}</dd>
          </dl>
        </transition>
      </article>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { fetchFactorValues } from '@/shared/api/objects'
import {
  loadReportConfigurations,
  loadReportPresentations,
  loadReportSources,
  saveReportPresentation,
  deleteObjectWithProperties,
} from '@/shared/api/report'
import { useNavigationStore } from '@/shared/stores/navigation'
import { useFieldDictionaryStore } from '@/shared/stores/fieldDictionary'
import { humanizeKey } from '@/shared/lib/pivotUtils'

const router = useRouter()
const navigationStore = useNavigationStore()
const views = ref([])
const loading = ref(false)
const loadError = ref('')
const detailsId = ref('')
const editingId = ref('')
const editSaving = ref(false)
const visualizationTypes = ref([])
const fieldDictionaryStore = useFieldDictionaryStore()
const dictionaryLabels = computed(() => fieldDictionaryStore.labelMap || {})
const dictionaryLabelsLower = computed(() => fieldDictionaryStore.labelMapLower || {})
const editDraft = reactive({
  name: '',
  description: '',
  visualization: '',
})

onMounted(() => {
  fieldDictionaryStore.fetchDictionary()
  fetchVisualizations()
  fetchViews()
})

const visualizationLookup = computed(() => {
  const byValue = new Map()
  const byPair = new Map()
  visualizationTypes.value.forEach((record, index) => {
    const meta = normalizeVisualizationOption(record, index)
    if (!meta.value) return
    if (!byValue.has(meta.value)) {
      byValue.set(meta.value, meta)
    }
    const pairKey = buildVisualizationKey(meta.fv, meta.pv)
    if (pairKey && !byPair.has(pairKey)) {
      byPair.set(pairKey, meta)
    }
  })
  return { byValue, byPair }
})

const visualizationOptions = computed(() =>
  Array.from(visualizationLookup.value.byValue.values()).map((meta) => ({
    value: meta.value,
    label: meta.label,
  })),
)

function goToData() {
  navigationStore.allowDataAccess()
  router.push('/data')
}

function previewView(view) {
  if (!view) return
  const sourceId = toRouteId(view?.source?.remoteId ?? view?.source?.id)
  const configId = toRouteId(view?.config?.remoteId ?? view?.config?.id)
  const presentationId = toRouteId(view?.remoteId ?? view?.remoteMeta?.id)
  if (!sourceId || !configId || !presentationId) {
    alert(
      'Не удалось открыть представление: проверьте источник и конфигурацию.',
    )
    return
  }
  navigationStore.allowDataAccess()
  router.push({
    path: '/data',
    query: { sourceId, configId, presentationId },
  })
}

async function fetchVisualizations() {
  try {
    const records = await fetchFactorValues('Prop_VisualTyp')
    visualizationTypes.value = Array.isArray(records) ? records : []
  } catch (err) {
    console.warn('Failed to load visualization types', err)
    visualizationTypes.value = []
  }
}

async function fetchViews() {
  loading.value = true
  loadError.value = ''
  try {
    const [presentationRecords, configRecords, sourceRecords] =
      await Promise.all([
        loadReportPresentations(),
        loadReportConfigurations(),
        loadReportSources(),
      ])
    const presentations = presentationRecords.map((entry, index) =>
      normalizePresentation(entry, index),
    )
    const configs = configRecords.map((entry, index) =>
      normalizeConfig(entry, index),
    )
    const sources = sourceRecords.map((entry, index) =>
      normalizeSource(entry, index),
    )
    const configMap = new Map(configs.map((cfg) => [cfg.remoteId, cfg]))
    const sourceMap = new Map(sources.map((src) => [src.remoteId, src]))
    views.value = presentations.map((presentation) => {
      const config = configMap.get(presentation.parentId) || null
      const source = config
        ? sourceMap.get(config?.parentId || null) || null
        : null
      return buildViewRecord(presentation, config, source)
    })
  } catch (err) {
    console.warn('Failed to load report views', err)
    loadError.value = 'Не удалось загрузить представления. Попробуйте позже.'
    views.value = []
  } finally {
    loading.value = false
  }
}

function toggleDetails(id) {
  detailsId.value = detailsId.value === id ? '' : id
}

function startEdit(view) {
  editingId.value = view.id
  editDraft.name = view.name || ''
  editDraft.description = view.description || ''
  const optionValue = findVisualizationValue(view.fvVisualTyp, view.pvVisualTyp)
  editDraft.visualization = optionValue || ''
}

function cancelEdit() {
  editingId.value = ''
  resetEditDraft()
}

function resetEditDraft() {
  editDraft.name = ''
  editDraft.description = ''
  editDraft.visualization = ''
  editSaving.value = false
}

async function submitEdit(viewId) {
  if (!editDraft.name.trim()) {
    alert('Укажите название')
    return
  }
  const option = resolveVisualizationMeta(editDraft.visualization)
  if (!option) {
    alert('Выберите тип визуализации')
    return
  }
  const view = views.value.find((item) => item.id === viewId)
  if (!view) return
  const remoteId = toNumericId(view.remoteId ?? view.remoteMeta?.id)
  if (!Number.isFinite(remoteId)) {
    alert('Не удалось определить идентификатор представления.')
    return
  }
  const userMeta = readUserMeta()
  if (!userMeta) return
  editSaving.value = true
  const payload = {
    ...view.remoteMeta,
    id: remoteId,
    parent:
      view.remoteMeta?.parent ??
      toNumericId(view.remoteMeta?.Parent) ??
      view.config?.remoteId,
    name: editDraft.name.trim(),
    Description: editDraft.description.trim(),
    fvVisualTyp: option.fv,
    pvVisualTyp: option.pv,
    idVisualTyp: option.id,
    nameVisualTyp: option.label,
    objUser: userMeta.objUser,
    pvUser: userMeta.pvUser,
    UpdatedAt: new Date().toISOString().slice(0, 10),
  }
  try {
    await saveReportPresentation('upd', payload)
    await fetchViews()
    cancelEdit()
  } catch (err) {
    console.warn('Failed to update presentation', err)
    alert('Не удалось сохранить представление. Попробуйте позже.')
  } finally {
    editSaving.value = false
  }
}

async function removeView(view) {
  if (!confirm(`Удалить представление «${view.name}»?`)) return
  const remoteId = toNumericId(view.remoteId ?? view.remoteMeta?.id)
  if (!Number.isFinite(remoteId)) {
    alert('Не удалось определить идентификатор представления.')
    return
  }
  try {
    await deleteObjectWithProperties(remoteId)
    if (detailsId.value === view.id) {
      detailsId.value = ''
    }
    if (editingId.value === view.id) {
      cancelEdit()
    }
    await fetchViews()
  } catch (err) {
    console.warn('Failed to delete presentation', err)
    alert('Не удалось удалить представление. Попробуйте позже.')
  }
}

function dictionaryLabelValue(key) {
  if (key === null || typeof key === 'undefined') return ''
  const normalizedKey = String(key).trim()
  if (!normalizedKey) return ''
  const direct = dictionaryLabels.value?.[normalizedKey]
  if (direct) return direct
  const lower = normalizedKey.toLowerCase()
  return dictionaryLabelsLower.value?.[lower] || ''
}

function formatFields(list = [], overrides = {}) {
  if (!list || !list.length) return '—'
  return list
    .map((key) => {
      const override = overrides?.[key]?.trim?.()
      if (override) return override
      const dictionaryLabel = dictionaryLabelValue(key)
      if (dictionaryLabel) return dictionaryLabel
      return humanizeKey(key)
    })
    .join(', ')
}

function formatMetrics(list = []) {
  if (!Array.isArray(list) || !list.length) return '—'
  const values = list
    .map((meta) => {
      if (!meta) return ''
      const dictionaryLabel = dictionaryLabelValue(meta.key)
      const fieldLabel =
        dictionaryLabel ||
        meta.label ||
        (meta.key ? humanizeKey(meta.key) : '')
      if (meta.aggregate && fieldLabel) {
        return `${meta.aggregate}: ${fieldLabel}`
      }
      return fieldLabel || meta.aggregate || ''
    })
    .filter(Boolean)
  return values.length ? values.join(', ') : '—'
}

function formatDate(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('ru-RU')
  } catch {
    return value
  }
}

function buildViewRecord(presentation, config, source) {
  return {
    id: presentation.id,
    remoteId: presentation.remoteId,
    name: presentation.name,
    description: presentation.description,
    visualizationLabel: presentation.visualizationLabel,
    fvVisualTyp: presentation.fvVisualTyp,
    pvVisualTyp: presentation.pvVisualTyp,
    createdAt: presentation.createdAt,
    remoteMeta: presentation.remoteMeta,
    config,
    source,
    rows: config?.rows || [],
    columns: config?.columns || [],
    metrics: config?.metrics || [],
    filters: config?.filters || [],
    headerOverrides: config?.headerOverrides || {},
  }
}

function normalizeVisualizationOption(record = {}, index = 0) {
  const fv = toNumericId(
    record?.fvVisualTyp ??
      record?.fv ??
      record?.value ??
      record?.id ??
      record?.idFieldVal ??
      record?.FieldVal,
  )
  const pv = toNumericId(
    record?.pvVisualTyp ?? record?.pv ?? record?.pvFieldVal ?? record?.pvValue,
  )
  const id = toNumericId(
    record?.idVisualTyp ?? record?.id ?? record?.idFieldVal ?? record?.FieldVal,
  )
  const label = formatVisualizationLabel(record, index)
  const value =
    fv !== null ? buildVisualizationKey(fv, pv) : `${label}-${index}`
  return { fv, pv, id, label, value, raw: record }
}

function formatVisualizationLabel(record = {}, index = 0) {
  const label = record?.name || record?.Name || record?.title
  if (label && String(label).trim()) return String(label).trim()
  return `Тип визуализации ${index + 1}`
}

function buildVisualizationKey(fv, pv) {
  if (!Number.isFinite(fv)) return ''
  return `${fv}:${Number.isFinite(pv) ? pv : 0}`
}

function findVisualizationValue(fv, pv) {
  const key = buildVisualizationKey(fv, pv)
  if (!key) return ''
  const match = visualizationLookup.value.byPair.get(key)
  return match?.value || ''
}

function resolveVisualizationMeta(value) {
  if (!value) return null
  return visualizationLookup.value.byValue.get(value) || null
}

function normalizePresentation(entry = {}, index = 0) {
  const remoteId = toNumericId(entry?.id ?? entry?.Id ?? entry?.ID)
  return {
    id: remoteId ? String(remoteId) : createLocalId(`presentation-${index}`),
    remoteId,
    parentId: toNumericId(entry?.parent ?? entry?.parentId ?? entry?.Parent),
    name: entry?.name || entry?.Name || `Представление ${index + 1}`,
    description: entry?.Discription || entry?.Description || '',
    visualizationLabel: entry?.nameVisualTyp || entry?.VisualTypName || '',
    fvVisualTyp: toNumericId(entry?.fvVisualTyp ?? entry?.fv),
    pvVisualTyp: toNumericId(entry?.pvVisualTyp ?? entry?.pv),
    createdAt:
      entry?.UpdatedAt || entry?.CreationDateTime || entry?.CreatedAt || null,
    remoteMeta: entry || {},
  }
}

function normalizeConfig(entry = {}, index = 0) {
  const remoteId = toNumericId(entry?.id ?? entry?.Id ?? entry?.ID)
  const filterPayload = parseMetaPayload(entry?.FilterVal)
  const rowPayload = parseMetaPayload(entry?.RowVal)
  const colPayload = parseMetaPayload(entry?.ColVal)
  const knownKeys = collectKnownFieldKeys(filterPayload, rowPayload, colPayload)
  const headerOverrides = {
    ...(filterPayload.headerOverrides || {}),
    ...(rowPayload.headerOverrides || {}),
    ...(colPayload.headerOverrides || {}),
  }
  return {
    id: remoteId ? String(remoteId) : createLocalId(`config-${index}`),
    remoteId,
    parentId: toNumericId(entry?.parent ?? entry?.parentId ?? entry?.Parent),
    name: entry?.name || entry?.Name || `Конфигурация ${index + 1}`,
    rows: parseFieldSequence(entry?.Row, knownKeys),
    columns: parseFieldSequence(entry?.Col, knownKeys),
    filters: parseFieldSequence(entry?.Filter, knownKeys),
    metrics: Array.isArray(entry?.complex)
      ? entry.complex
          .map((record, metricIndex) => normalizeMetricRecord(record, metricIndex))
          .filter(Boolean)
      : [],
    headerOverrides,
    remoteMeta: entry || {},
  }
}

function normalizeSource(entry = {}, index = 0) {
  const remoteId = toNumericId(entry?.id ?? entry?.Id ?? entry?.ID)
  return {
    id: remoteId ? String(remoteId) : createLocalId(`source-${index}`),
    remoteId,
    name: entry?.name || entry?.Name || entry?.title || `Источник ${index + 1}`,
    description: entry?.description || entry?.Description || '',
    remoteMeta: entry || {},
  }
}

function normalizeMetricRecord(entry = {}, index = 0) {
  const aggregate = entry?.name || entry?.Name || entry?.AggregateName || ''
  const key =
    entry?.FieldName ||
    entry?.fieldName ||
    entry?.Field ||
    entry?.field ||
    entry?.FieldKey ||
    entry?.fieldKey ||
    ''
  const label =
    entry?.FieldLabel ||
    entry?.fieldLabel ||
    entry?.FieldCaption ||
    entry?.Caption ||
    entry?.Label ||
    ''
  if (!aggregate && !key && !label) return null
  const remoteId = toNumericId(entry?.id ?? entry?.Id ?? entry?.ID)
  return {
    id: remoteId ? String(remoteId) : createLocalId(`metric-${index}`),
    aggregate: String(aggregate || '').trim(),
    key: String(key || '').trim(),
    label: String(label || '').trim(),
  }
}

function parseFieldSequence(value, knownKeys = null) {
  if (!value) return []
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
  }
  const trimmed = String(value).trim()
  if (!trimmed) return []
  try {
    const parsed = JSON.parse(trimmed)
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(Boolean)
    }
  } catch {
    // ignore
  }
  const tokens = trimmed
    .split(/[.,|;]/)
    .map((item) => item.trim())
    .filter(Boolean)
  if (!tokens.length) return []
  return rebuildSequenceTokens(tokens, knownKeys)
}

function parseMetaPayload(raw) {
  if (!raw) return {}
  if (typeof raw === 'object') return raw
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') return parsed
    } catch {
      return {}
    }
  }
  return {}
}

function collectKnownFieldKeys(...payloads) {
  const set = new Set()
  payloads.forEach((payload) => {
    if (!payload || typeof payload !== 'object') return
    collectKeysFromObject(set, payload.values)
    collectKeysFromObject(set, payload.headerOverrides)
    collectKeysFromObject(set, payload.sorts)
    collectKeysFromObject(set, payload.fieldMeta)
    if (Array.isArray(payload.filtersMeta)) {
      payload.filtersMeta.forEach((meta) => {
        if (meta?.key) set.add(String(meta.key).trim())
      })
    }
    if (Array.isArray(payload.metricSettings)) {
      payload.metricSettings.forEach((meta) => {
        if (meta?.fieldKey) set.add(String(meta.fieldKey).trim())
      })
    }
  })
  return set
}

function collectKeysFromObject(target, source) {
  if (!source || typeof source !== 'object') return
  Object.keys(source).forEach((key) => {
    const normalized = String(key).trim()
    if (normalized) target.add(normalized)
  })
}

function rebuildSequenceTokens(tokens = [], knownKeys = new Set()) {
  const result = []
  let index = 0
  while (index < tokens.length) {
    const match = findKnownSequence(tokens, index, knownKeys)
    if (match) {
      result.push(match.value)
      index = match.nextIndex
      continue
    }
    const heuristic = attemptJoinHeuristic(tokens, index)
    if (heuristic) {
      result.push(heuristic.value)
      index = heuristic.nextIndex
      continue
    }
    result.push(tokens[index])
    index += 1
  }
  return result
}

function findKnownSequence(tokens, start, knownKeys = new Set()) {
  if (!knownKeys || !knownKeys?.size) return null
  for (let end = tokens.length; end > start; end -= 1) {
    const candidate = tokens.slice(start, end).join('.')
    if (knownKeys.has(candidate)) {
      return { value: candidate, nextIndex: end }
    }
  }
  return null
}

const JOIN_PREFIX_PATTERN = /^[A-Z0-9_]+$/
const JOIN_FIELD_PATTERN = /^[a-zA-Z0-9_]+$/

function attemptJoinHeuristic(tokens, start) {
  const prefix = tokens[start]
  const next = tokens[start + 1]
  if (!prefix || !next) return null
  if (JOIN_PREFIX_PATTERN.test(prefix) && JOIN_FIELD_PATTERN.test(next)) {
    return { value: `${prefix}.${next}`, nextIndex: start + 2 }
  }
  return null
}

function toNumericId(value) {
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

function toRouteId(value) {
  if (value === null || typeof value === 'undefined') return ''
  const str = String(value).trim()
  return str
}

function createLocalId(prefix = 'view') {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function readStoredUserValue(key) {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    return toNumericId(JSON.parse(raw))
  } catch {
    return null
  }
}

function readUserMeta() {
  const objUser = readStoredUserValue('objUser')
  const pvUser = readStoredUserValue('pvUser')
  if (!Number.isFinite(objUser) || !Number.isFinite(pvUser)) {
    alert(
      'Не удалось определить пользователя. Перезайдите в систему и попробуйте снова.',
    )
    return null
  }
  return { objUser, pvUser }
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
  align-items: center;
  gap: 16px;
}
.page__header h1 {
  margin: 0;
}
.muted {
  color: #6b7280;
  font-size: 13px;
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
  min-height: 240px;
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
.tag {
  background: #eef2ff;
  color: #312e81;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  text-transform: uppercase;
}
.card__description {
  margin: 0;
  color: #111827;
  font-size: 14px;
  min-height: 38px;
}
.card__actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: auto;
}
.icon-btn.is-active {
  background: #eef2ff;
  color: #312e81;
}
.icon-info {
  width: 18px;
  height: 18px;
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='%231f2937' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='9'/%3E%3Cpath d='M12 16v-4'/%3E%3Ccircle cx='12' cy='8' r='0.8'/%3E%3C/svg%3E");
  mask-repeat: no-repeat;
  mask-size: contain;
  background: currentColor;
}
.edit-form {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: #f8fafc;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field input,
.field textarea,
.field select {
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 8px 10px;
}
.edit-form__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
dl {
  margin: 0;
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 6px 12px;
  font-size: 13px;
}
.card__details {
  margin-top: 4px;
  padding-top: 8px;
  border-top: 1px solid #e5e7eb;
}
dt {
  color: #6b7280;
}
</style>
