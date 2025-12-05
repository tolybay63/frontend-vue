<!-- Файл: src/pages/HomePage.vue
     Назначение: главная страница справочных каталогов Service 360 с быстрыми действиями, лентой изменений и схемой связей.
     Использование: подключена в маршрутизаторе как маршрут '/'. -->
<template>
  <section class="home-page">
    <div class="home-page__grid">
      <NCard size="small" class="home-card hero" :segmented="{ content: true }">
        <div class="hero__content">
          <header class="hero__header">
            <h1 class="hero__title">Справочники системы Service360</h1>
            <p class="hero__subtitle">
              Управляйте типами объектов, их параметрами и дефектами. Здесь собраны быстрые действия и последние изменения,
              чтобы быстрее ориентироваться в структуре данных.
            </p>
          </header>
          <div class="hero__stats">
            <div class="stat">
              <span class="stat__value">{{ stats.types }}</span>
              <span class="stat__label">типов объектов</span>
            </div>
            <div class="stat">
              <span class="stat__value">{{ stats.parameters }}</span>
              <span class="stat__label">параметров</span>
            </div>
            <div class="stat">
              <span class="stat__value">{{ stats.defects }}</span>
              <span class="stat__label">дефектов</span>
            </div>
            <div class="stat">
              <span class="stat__value">{{ stats.works }}</span>
              <span class="stat__label">работ</span>
            </div>
          </div>
        </div>
      </NCard>

      <NCard size="small" class="home-card quick-actions" title="Быстрые действия" :segmented="{ content: true }">
        <div class="quick-actions__list">
          <button
            v-for="action in quickActions"
            :key="action.key"
            type="button"
            class="quick-actions__button"
            @click="handleAction(action)"
          >
            <NIcon :component="action.icon" class="quick-actions__icon" />
            <div class="quick-actions__text">
              <span class="quick-actions__title">{{ action.title }}</span>
              <span class="quick-actions__description">{{ action.description }}</span>
            </div>
            <NIcon :component="ArrowForward" class="quick-actions__arrow" />
          </button>
        </div>
      </NCard>

      <NCard size="small" class="home-card updates" :segmented="{ content: true, footer: true }">
        <template #header>
          <div class="updates__header">
            <span class="updates__title">Последние изменения</span>
            <span class="updates__hint">Отображаются записи, которые были загружены последними</span>
          </div>
        </template>

        <div v-if="updatesLoading" class="updates__loading">
          <NSkeleton v-for="index in 4" :key="index" height="52px" :sharp="false" round />
        </div>

        <template v-else>
          <ul v-if="recentItems.length" class="updates-list">
            <li v-for="item in recentItems" :key="item.id" class="updates-item">
              <span class="updates-item__badge" :class="`updates-item__badge--${item.kind}`">{{ item.kindLabel }}</span>
              <div class="updates-item__content">
                <span class="updates-item__title">{{ item.title }}</span>
                <span v-if="item.subtitle" class="updates-item__subtitle">{{ item.subtitle }}</span>
              </div>
              <time v-if="item.timestamp" class="updates-item__time">{{ item.timestamp }}</time>
            </li>
          </ul>

          <div v-else class="updates__empty">
            <NEmpty description="Пока нет изменений" size="small" />
          </div>
        </template>

        <template #footer>
          <div class="updates__footer">
            <router-link class="updates__link" to="/nsi/object-types">Все типы</router-link>
            <router-link class="updates__link" to="/nsi/object-parameters">Все параметры</router-link>
            <router-link class="updates__link" to="/nsi/object-defects">Все дефекты</router-link>
            <router-link class="updates__link" to="/nsi/works">Все работы</router-link>
          </div>
        </template>
      </NCard>

      <NCard size="small" class="home-card schema" title="Как связаны справочники" :segmented="{ content: true }">
        <div class="schema__diagram" role="list">
          <div v-for="node in schemaNodes" :key="node.key" class="schema-node" role="listitem">
            <div class="schema-node__header">
              <NIcon :component="node.icon" class="schema-node__icon" />
              <span class="schema-node__title">{{ node.title }}</span>
            </div>
            <p class="schema-node__description">{{ node.description }}</p>
            <ul v-if="node.points" class="schema-node__points">
              <li v-for="point in node.points" :key="point" class="schema-node__point">{{ point }}</li>
            </ul>
          </div>
        </div>
      </NCard>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, type Component } from 'vue'
import { useRouter, type RouteLocationRaw } from 'vue-router'
import { NCard, NIcon, NSkeleton, NEmpty } from 'naive-ui'
import { ConstructOutline, OptionsOutline, BugOutline, ArrowForward, AlbumsOutline, HammerOutline } from '@vicons/ionicons5'

import { useObjectTypesQuery } from '@features/object-type-crud'
import { useObjectParametersQuery } from '@features/object-parameter-crud'
import { useObjectDefectsQuery } from '@features/object-defect-crud'
import { rpc } from '@shared/api'
import { extractRecords, toOptionalString } from '@shared/lib'

const router = useRouter()

const { data: typesSnapshot, isLoading: typesLoading } = useObjectTypesQuery()
const { data: parametersSnapshot, isLoading: parametersLoading } = useObjectParametersQuery()
const { data: defectsSnapshot, isLoading: defectsLoading } = useObjectDefectsQuery()

// Упрощенная загрузка работ (для статистики и ленты)
interface RawWorkRecord { obj?: number | string; name?: string }
const works = ref<{ id: string; name: string }[]>([])
const worksLoading = ref(false)

async function loadWorks() {
  worksLoading.value = true
  try {
    const payload = await rpc('data/loadProcessCharts', [0])
    const records = extractRecords<RawWorkRecord>(payload)
    const items: { id: string; name: string }[] = []
    for (const rec of records) {
      const id = toOptionalString(rec.obj)
      const name = toOptionalString(rec.name)
      if (!id || !name) continue
      items.push({ id, name })
    }
    works.value = items
  } finally {
    worksLoading.value = false
  }
}

onMounted(() => { void loadWorks() })

const stats = computed(() => ({
  types: typesSnapshot.value?.items.length ?? 0,
  parameters: parametersSnapshot.value?.items.length ?? 0,
  defects: defectsSnapshot.value?.items.length ?? 0,
  works: works.value.length,
}))

interface QuickAction {
  key: string
  title: string
  description: string
  icon: Component
  to: RouteLocationRaw
}

const quickActions: QuickAction[] = [
  {
    key: 'create-type',
    title: 'Добавить тип объекта',
    description: 'Задайте форму на карте и прикрепите компоненты',
    icon: AlbumsOutline,
    to: { name: 'object-types', query: { action: 'create' } },
  },
  {
    key: 'create-parameter',
    title: 'Добавить параметр',
    description: 'Опишите измеряемые величины и источники данных',
    icon: OptionsOutline,
    to: { name: 'object-parameters', query: { action: 'create' } },
  },
  {
    key: 'create-defect',
    title: 'Добавить дефект',
    description: 'Сформируйте контрольные признаки и индексы',
    icon: BugOutline,
    to: { name: 'object-defects', query: { action: 'create' } },
  },
  {
    key: 'create-work',
    title: 'Добавить работу',
    description: 'Укажите вид, источник и периодичность',
    icon: HammerOutline,
    to: { name: 'works', query: { action: 'create' } },
  },
]

const handleAction = (action: QuickAction) => {
  router.push(action.to)
}

interface RecentItem {
  id: string
  kind: 'type' | 'parameter' | 'defect' | 'work'
  kindLabel: string
  title: string
  subtitle: string | null
  timestamp: string | null
}

const updatesLoading = computed(
  () => typesLoading.value || parametersLoading.value || defectsLoading.value || worksLoading.value,
)

const recentItems = computed<RecentItem[]>(() => {
  const limit = 9
  const createSegment = <T,>(
    collection: T[] | undefined | null,
    map: (item: T) => RecentItem | null,
  ): RecentItem[] => {
    if (!collection?.length) return []
    return collection
      .slice(-4)
      .reverse()
      .map(map)
      .filter((entry): entry is RecentItem => entry !== null)
  }

  const segments: RecentItem[][] = [
    createSegment(typesSnapshot.value?.items, (item) => ({
      id: `type-${item.id}`,
      kind: 'type',
      kindLabel: 'Тип',
      title: item.name,
      subtitle: item.geometry ? `Геометрия: ${item.geometry}` : null,
      timestamp: null,
    })),
    createSegment(parametersSnapshot.value?.items, (item) => ({
      id: `parameter-${item.id}`,
      kind: 'parameter',
      kindLabel: 'Параметр',
      title: item.name,
      subtitle: item.sourceName ?? item.unitName ?? null,
      timestamp: null,
    })),
    createSegment(defectsSnapshot.value?.items, (item) => ({
      id: `defect-${item.id}`,
      kind: 'defect',
      kindLabel: 'Дефект',
      title: item.name,
      subtitle: item.componentName ?? item.categoryName ?? null,
      timestamp: null,
    })),
    createSegment(works.value, (item) => ({
      id: `work-${item.id}`,
      kind: 'work',
      kindLabel: 'Работа',
      title: item.name,
      subtitle: null,
      timestamp: null,
    })),
  ]

  const result: RecentItem[] = []
  let cursor = 0

  const hasItems = () => segments.some((segment) => segment.length > 0)

  while (result.length < limit && hasItems()) {
    const segment = segments[cursor % segments.length]
    if (segment.length) {
      const entry = segment.shift()
      if (entry) result.push(entry)
    }
    cursor += 1
  }

  return result
})

const schemaNodes = [
  {
    key: 'types',
    title: 'Типы объектов',
    icon: ConstructOutline,
    description: 'Определяют, какие объекты вы обслуживаете, и задают базовую структуру.',
    points: ['указывают геометрию (точка, линия, полигон)', 'содержат состав компонентов'],
  },
  {
    key: 'parameters',
    title: 'Параметры',
    icon: OptionsOutline,
    description: 'Помогают описывать состояние объектов и источники данных.',
    points: ['привязаны к компонентам или объектам', 'имеют тип значения и единицы измерения'],
  },
  {
    key: 'defects',
    title: 'Дефекты',
    icon: BugOutline,
    description: 'Формируют набор контролируемых отклонений и индексируют их.',
    points: ['ссылаются на компоненты и категории дефектов', 'используются для контроля состояния инфраструктуры'],
  },
]
</script>

<style scoped>
.home-page {
  padding: 24px;
}

.home-page__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}

.home-card {
  height: 100%;
}

.hero {
  grid-column: 1 / -1;
}

.hero__content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.hero__header {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.hero__title {
  margin: 0;
  font-size: 26px;
  line-height: 1.25;
  color: #0f3e44;
}

.hero__subtitle {
  margin: 0;
  color: #4b686d;
  font-size: 15px;
}

.hero__stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 16px;
}

.stat {
  background: #f1f6f6;
  border-radius: 16px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-start;
}

.stat__value {
  font-size: 28px;
  font-weight: 700;
  color: var(--s360-color-primary);
}

.stat__label {
  font-size: 13px;
  color: #4f6b70;
}

.quick-actions__list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.quick-actions__button {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 14px;
  border: 1px solid #d8e3e3;
  background: #ffffff;
  cursor: pointer;
  text-align: left;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.quick-actions__button:hover {
  border-color: #b7cfcf;
  box-shadow: 0 6px 18px rgba(43, 108, 176, 0.12);
  transform: translateY(-1px);
}

.quick-actions__icon {
  font-size: 28px;
  color: var(--s360-color-primary);
}

.quick-actions__text {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.quick-actions__title {
  font-weight: 600;
  color: #0f3e44;
}

.quick-actions__description {
  font-size: 13px;
  color: #4b686d;
}

.quick-actions__arrow {
  font-size: 18px;
  color: #7b9ea2;
}

.updates__hint {
  font-size: 13px;
  color: #5a7579;
}

.updates__loading {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.updates__header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.updates__title {
  font-weight: 700;
  color: #0f3e44;
  font-size: 18px;
}

.updates-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.updates-item {
  display: grid;
  grid-template-columns: minmax(80px, auto) 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid #e1ebeb;
  background: #ffffff;
}

.updates-item__badge {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 4px 8px;
  border-radius: 999px;
  color: #0f3e44;
  background: #f0f6f6;
  text-align: center;
}

.updates-item__badge--type {
  background: rgba(43, 108, 176, 0.16);
}

.updates-item__badge--parameter {
  background: rgba(44, 108, 191, 0.14);
}

.updates-item__badge--defect {
  background: rgba(217, 90, 38, 0.16);
}

.updates-item__content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.updates-item__title {
  font-weight: 600;
  color: #0f3e44;
}

.updates-item__subtitle {
  font-size: 13px;
  color: #5a7579;
}

.updates-item__time {
  font-size: 12px;
  color: #7b9ea2;
}

.updates__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 0;
}

.updates__footer {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.updates__link {
  color: var(--s360-color-primary);
  font-weight: 600;
  text-decoration: none;
}

.updates__link:hover {
  text-decoration: underline;
}

.schema__diagram {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.schema-node {
  border: 1px solid #d8e3e3;
  border-radius: 16px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: #ffffff;
}

.schema-node__header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.schema-node__icon {
  font-size: 24px;
  color: var(--s360-color-primary);
}

.schema-node__title {
  font-weight: 600;
  color: #0f3e44;
}

.schema-node__description {
  margin: 0;
  color: #4b686d;
  font-size: 13px;
}

.schema-node__points {
  margin: 0;
  padding-left: 18px;
  color: #4b686d;
  font-size: 13px;
}

.schema-node__point + .schema-node__point {
  margin-top: 4px;
}

@media (max-width: 768px) {
  .home-page {
    padding: 16px;
    padding-bottom: 88px;
  }

  .hero__title {
    font-size: 22px;
  }

  .hero__stats {
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  }

  .quick-actions__button {
    padding: 12px 14px;
  }

  .updates-item {
    grid-template-columns: 1fr;
    text-align: left;
  }

  .updates-item__time {
    justify-self: flex-start;
  }
}
@media (max-width: 480px) {
  .home-page { padding: 12px; padding-bottom: 88px; }
  .home-page__grid { grid-template-columns: 1fr; gap: 12px; }
  .hero__title { font-size: 20px; }
  .hero__subtitle { font-size: 14px; }
  .hero__stats { grid-template-columns: repeat(2, minmax(100px, 1fr)); gap: 12px; }
  .quick-actions__button { gap: 12px; padding: 12px; }
  .quick-actions__icon { font-size: 24px; }
  .updates-item { grid-template-columns: 1fr; }
}
</style>


