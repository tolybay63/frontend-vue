<template>
  <section class="page">
    <header class="page__header">
      <div>
        <h1>Представления</h1>
        <p class="muted">
          Здесь появляются конфигурации, сохранённые в разделе «Данные». Их можно повторно использовать
          при настройке произвольных страниц.
        </p>
      </div>
    </header>

    <div class="info-card">
      <div>
        <h2>Как создать представление?</h2>
        <p>
          Откройте раздел «Данные», настройте сводную таблицу и нажмите «Сохранить как шаблон».
          Конфигурация автоматически появится в этом списке и станет доступна в редакторе страниц.
        </p>
      </div>
      <button class="btn-primary" type="button" @click="goToData">
        Перейти к данным
      </button>
    </div>

    <div v-if="!templates.length" class="empty-state">
      <p>Пока ни одного представления не сохранено.</p>
      <p class="muted">
        Создайте первое представление в разделе «Данные» и возвращайтесь сюда, чтобы подключать его к
        страницам.
      </p>
    </div>

    <div v-else class="grid">
      <article v-for="template in templates" :key="template.id" class="card">
        <header class="card__header">
          <h2>{{ template.name }}</h2>
          <span class="tag">{{ template.dataSource }}</span>
        </header>
        <p class="muted">{{ template.description || 'Без описания' }}</p>
        <div class="card__actions">
          <button class="icon-btn" type="button" @click="startEdit(template)" aria-label="Редактировать представление">
            <span class="icon icon-edit" />
          </button>
          <button
            class="icon-btn icon-btn--danger"
            type="button"
            @click="removeTemplate(template)"
            aria-label="Удалить представление"
          >
            <span class="icon icon-trash" />
          </button>
        </div>
        <form
          v-if="editingId === template.id"
          class="edit-form"
          @submit.prevent="submitEdit(template.id)"
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
            <select v-model="editDraft.visualization">
              <option value="table">Таблица</option>
              <option value="bar">Столбчатая диаграмма</option>
              <option value="line">Линейная диаграмма</option>
              <option value="pie">Круговая диаграмма</option>
            </select>
          </label>
          <div class="edit-form__actions">
            <button class="btn-outline btn-sm" type="button" @click="cancelEdit">Отмена</button>
            <button class="btn-primary btn-sm" type="submit">Сохранить</button>
          </div>
        </form>
        <dl>
          <dt>Визуализация</dt>
          <dd>{{ visualizationLabel(template.visualization) }}</dd>
          <dt>Строки</dt>
          <dd>{{ template.snapshot?.pivot?.rows?.join(', ') || '—' }}</dd>
          <dt>Столбцы</dt>
          <dd>{{ template.snapshot?.pivot?.columns?.join(', ') || '—' }}</dd>
          <dt>Метрики</dt>
          <dd>
            {{
              template.snapshot?.metrics?.map((metric) => metricLabel(metric)).join(' • ') || '—'
            }}
          </dd>
          <dt>Сохранено</dt>
          <dd>{{ formatDate(template.createdAt) }}</dd>
        </dl>
      </article>
    </div>
  </section>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { usePageBuilderStore } from '@/shared/stores/pageBuilder'

const store = usePageBuilderStore()
const router = useRouter()
const templates = computed(() => store.templates)
const editingId = ref('')
const editDraft = reactive({
  name: '',
  description: '',
  visualization: 'table',
})

function goToData() {
  router.push('/')
}
function visualizationLabel(value) {
  switch (value) {
    case 'bar':
      return 'Столбчатая'
    case 'line':
      return 'Линейная'
    case 'pie':
      return 'Круговая'
    default:
      return 'Таблица'
  }
}
function metricLabel(metric) {
  if (!metric) return ''
  const agg = { count: 'Количество', sum: 'Сумма', avg: 'Среднее' }[metric.aggregator] || metric.aggregator
  return `${agg}: ${metric.fieldLabel || metric.fieldKey || 'поле'}`
}
function formatDate(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('ru-RU')
  } catch {
    return value
  }
}
function startEdit(template) {
  editingId.value = template.id
  editDraft.name = template.name || ''
  editDraft.description = template.description || ''
  editDraft.visualization = template.visualization || 'table'
}
function cancelEdit() {
  editingId.value = ''
}
function submitEdit(templateId) {
  if (!editDraft.name.trim()) {
    alert('Укажите название')
    return
  }
  store.updateTemplate(templateId, {
    name: editDraft.name.trim(),
    description: editDraft.description.trim(),
    visualization: editDraft.visualization,
  })
  editingId.value = ''
}
function removeTemplate(template) {
  if (
    !confirm(`Удалить представление «${template.name}»? Контейнеры с этим представлением будут очищены.`)
  ) {
    return
  }
  store.removeTemplate(template.id)
  if (editingId.value === template.id) {
    editingId.value = ''
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
  gap: 16px;
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
.grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}
.card {
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.tag {
  background: #eef2ff;
  color: #312e81;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  text-transform: uppercase;
}
.card__actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
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
  grid-template-columns: 120px 1fr;
  gap: 6px 12px;
  font-size: 13px;
}
dt {
  color: #6b7280;
}
</style>
