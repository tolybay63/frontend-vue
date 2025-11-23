<template>
  <section class="page">
    <header class="page__header">
      <div>
        <h1>{{ isNew ? 'Новая страница' : 'Редактирование страницы' }}</h1>
        <p class="muted">
          Задайте название, выберите фильтры и макет, а затем добавьте контейнеры с нужными шаблонами.
        </p>
      </div>
      <div class="header-actions">
        <button class="btn-outline" type="button" @click="goBack">Отмена</button>
        <button class="btn-primary" type="button" @click="save">Сохранить</button>
      </div>
    </header>

    <form class="form" @submit.prevent="save">
      <label class="field">
        <span>Пункт меню</span>
        <input v-model="draft.menuTitle" placeholder="Например: Мониторинг пути" required />
      </label>
      <label class="field">
        <span>Заголовок страницы</span>
        <input v-model="draft.pageTitle" placeholder="Заголовок страницы" required />
      </label>
      <label class="field">
        <span>Описание</span>
        <textarea v-model="draft.description" rows="3" placeholder="Короткое описание страницы"></textarea>
      </label>

      <fieldset class="field">
        <legend>Глобальные фильтры</legend>
        <div class="filter-grid">
          <label v-for="filter in filters" :key="filter.key" class="checkbox">
            <input type="checkbox" :value="filter.key" v-model="draft.filters" />
            <span>{{ filter.label }}</span>
          </label>
        </div>
      </fieldset>

      <label class="field">
        <span>Макет</span>
        <select v-model="draft.layout.preset">
          <option v-for="preset in layoutPresets" :key="preset.value" :value="preset.value">
            {{ preset.label }}
          </option>
        </select>
      </label>

      <section class="containers">
        <header>
          <h2>Контейнеры</h2>
          <button class="btn-outline btn-sm" type="button" @click="addContainer">
            Добавить контейнер
          </button>
        </header>
        <div v-if="!draft.layout.containers.length" class="muted">
          Контейнеры не добавлены.
        </div>
        <article v-for="container in draft.layout.containers" :key="container.id" class="container-card">
          <div class="container-card__header">
            <input v-model="container.title" placeholder="Название контейнера" />
            <button class="btn-danger btn-sm" type="button" @click="removeContainer(container.id)">
              Удалить
            </button>
          </div>
          <div class="container-card__body">
            <label>
              <span>Шаблон</span>
              <select v-model="container.templateId">
                <option disabled value="">Выберите шаблон</option>
                <option v-for="template in templates" :key="template.id" :value="template.id">
                  {{ template.name }}
                </option>
              </select>
            </label>
            <label>
              <span>Ширина</span>
              <select v-model="container.width">
                <option value="1fr">1 часть</option>
                <option value="2fr">2 части</option>
                <option value="3fr">3 части</option>
              </select>
            </label>
            <label>
              <span>Высота</span>
              <select v-model="container.height">
                <option value="auto">Авто</option>
                <option value="320px">320 px</option>
                <option value="480px">480 px</option>
                <option value="640px">640 px</option>
                <option value="800px">800 px</option>
              </select>
            </label>
          </div>
          <p class="muted" v-if="container.templateId">
            {{
              templates.find((tpl) => tpl.id === container.templateId)?.description ||
              'Без описания'
            }}
          </p>
        </article>
      </section>
    </form>
  </section>
</template>

<script setup>
import { computed, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePageBuilderStore } from '@/shared/stores/pageBuilder'

const router = useRouter()
const route = useRoute()
const store = usePageBuilderStore()

const pageId = computed(() => route.params.pageId)
const isNew = computed(() => pageId.value === 'new' || !pageId.value)

function createDraft() {
  return reactive({
    id: null,
    menuTitle: '',
    pageTitle: '',
    description: '',
    filters: [],
    layout: {
      preset: store.layoutPresets[0]?.value || 'single',
      containers: [],
    },
  })
}

const draft = createDraft()

if (!isNew.value) {
  const existing = store.getPageById(pageId.value)
  if (existing) {
    Object.assign(draft, JSON.parse(JSON.stringify(existing)))
  }
}

const templates = computed(() => store.templates)
const filters = computed(() => store.filters)
const layoutPresets = computed(() => store.layoutPresets)

function addContainer() {
  draft.layout.containers.push({
    id: `slot-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: `Контейнер ${draft.layout.containers.length + 1}`,
    templateId: templates.value[0]?.id || '',
    width: '1fr',
    height: 'auto',
  })
}

function removeContainer(containerId) {
  const index = draft.layout.containers.findIndex((c) => c.id === containerId)
  if (index >= 0) {
    draft.layout.containers.splice(index, 1)
  }
}

function save() {
  const payload = JSON.parse(JSON.stringify(draft))
  payload.id = isNew.value ? null : payload.id || pageId.value
  const id = store.savePage(payload)
  router.push(`/pages/${id}/edit`)
}

function goBack() {
  router.push('/pages')
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
}
.muted {
  color: #6b7280;
  font-size: 13px;
}
.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
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
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 14px;
}
.filter-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.checkbox {
  display: flex;
  align-items: center;
  gap: 6px;
}
.containers {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.containers header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.container-card {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.container-card__header {
  display: flex;
  gap: 12px;
}
.container-card__header input {
  flex: 1;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 8px 10px;
}
.container-card__body {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.container-card__body label {
  flex: 1 1 180px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.header-actions {
  display: flex;
  gap: 8px;
}
</style>
