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

    <div v-if="!pages.length" class="empty-state">
      <p>Страниц пока нет. Нажмите «Создать страницу», чтобы начать.</p>
    </div>

    <div class="grid">
      <article v-for="page in pages" :key="page.id" class="card">
        <header>
          <div>
            <h2>{{ page.pageTitle }}</h2>
            <p class="muted">{{ page.description || 'Без описания' }}</p>
          </div>
          <span class="badge">{{ page.layout?.preset || 'single' }}</span>
        </header>
        <dl>
          <dt>Пункт меню</dt>
          <dd>{{ page.menuTitle }}</dd>
          <dt>Глобальные фильтры</dt>
          <dd>{{ page.filters?.length ? filterLabels(page.filters).join(', ') : 'Нет' }}</dd>
          <dt>Контейнеры</dt>
          <dd>{{ page.layout?.containers?.length || 0 }}</dd>
        </dl>
        <div class="actions">
          <button
            class="icon-btn"
            type="button"
            @click="previewPage(page.id)"
            aria-label="Открыть страницу"
            title="Открыть"
          >
            <span class="icon icon-eye" />
          </button>
          <button
            class="icon-btn"
            type="button"
            @click="editPage(page.id)"
            aria-label="Редактировать страницу"
            title="Редактировать"
          >
            <span class="icon icon-edit" />
          </button>
          <button
            class="icon-btn icon-btn--danger"
            type="button"
            @click="removePage(page.id)"
            aria-label="Удалить страницу"
            title="Удалить"
          >
            <span class="icon icon-trash" />
          </button>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { usePageBuilderStore } from '@/shared/stores/pageBuilder'

const router = useRouter()
const store = usePageBuilderStore()

const pages = computed(() => store.pages)
const filters = computed(() => store.filters)

function filterLabels(keys = []) {
  return keys
    .map((key) => filters.value.find((item) => item.key === key)?.label || key)
    .filter(Boolean)
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
function removePage(pageId) {
  if (confirm('Удалить страницу?')) {
    store.removePage(pageId)
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
</style>
