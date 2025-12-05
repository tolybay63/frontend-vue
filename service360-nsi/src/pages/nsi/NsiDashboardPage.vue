<template>
  <section class="nsi-dashboard-page">
    <div class="nsi-dashboard-page__container">
      <nav class="nsi-dashboard-page__breadcrumbs" :aria-label="breadcrumbsA11y">
        <span class="breadcrumbs__link">{{ breadcrumbSettings }}</span>
        <span class="breadcrumbs__sep" aria-hidden="true">/</span>
        <span class="breadcrumbs__current">{{ breadcrumbHome }}</span>
      </nav>

      <!-- Ассистент временно отключён -->
      <CtaRow
        :title="pageTitle"
        :subtitle="pageSubtitle"
        :actions="quickActions"
        :search-placeholder="searchPlaceholder"
        :search-typing-hint="searchTypingHint"
        :search-empty="searchEmpty"
        :search-loading-text="searchLoadingText"
        :search-open-label="searchOpenLabel"
        :search-types="searchTypes"
        :actions-aria-label="actionsAriaLabel"
        @select-search="handleSearchSelect"
      />

      <div class="nsi-dashboard-page__layout">
        <div class="nsi-dashboard-page__left">
          <RelationsMap
            :counts="relationsCounts"
            :partial="relationsPartial"
            :loading="relationsLoading"
            @select-node="handleNavigate"
          />

          <Checklist
            :title="checklistTitle"
            :steps="checklistSteps"
            :go-label="checklistGo"
            :info-label="checklistInfo"
            :partial="coveragePartial"
            @select="handleNavigate"
          />
        </div>

        <div class="nsi-dashboard-page__right">
          <!-- Make recent changes visible immediately on desktop: place on top -->
          <RecentActivity
            :title="activityTitle"
            :empty-text="activityEmpty"
            :items="activityItems"
            :partial="activityPartial"
            @select="handleActivitySelect"
          />

          <KpiTiles
            :coverage="coverage"
            :partial="coveragePartial"
            :loading="coverageLoading"
            @select="handleTileSelect"
          />

          <Diagnostics
            :title="diagnosticsTitle"
            :description="diagnosticsDescription"
            :empty-text="diagnosticsEmpty"
            :items="diagnosticsItems"
            :partial="diagnosticsPartial"
            :loading="diagnosticsLoading"
            :severity-labels="severityLabels"
            @select="handleDiagnosticSelect"
          />

          <NCard size="small" class="nsi-dashboard-page__templates">
            <h3 class="templates__title">{{ templatesTitle }}</h3>
            <div class="templates__actions">
              <NButton quaternary @click="handleImport('import')">{{ templatesImport }}</NButton>
              <NButton tertiary @click="handleImport('download')">{{ templatesDownload }}</NButton>
            </div>
            <p class="templates__hint">{{ templatesHint }}</p>
          </NCard>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NCard } from 'naive-ui'

import { useI18n } from '@shared/lib'
import CtaRow from '@/widgets/nsi-dashboard/CtaRow.vue'
import RelationsMap from '@/widgets/nsi-dashboard/RelationsMap.vue'
import KpiTiles from '@/widgets/nsi-dashboard/KpiTiles.vue'
import Checklist from '@/widgets/nsi-dashboard/Checklist.vue'
import Diagnostics from '@/widgets/nsi-dashboard/Diagnostics.vue'
import RecentActivity from '@/widgets/nsi-dashboard/RecentActivity.vue'
import {
  useNsiActivityQuery,
  useNsiCoverageQuery,
  useNsiDiagnosticsQuery,
  useNsiCountsQuery,
} from '@features/nsi-dashboard'
import type {
  ActivityItem,
  ActivityResponse,
  DiagnosticItem,
  DiagnosticsResponse,
  NsiCoverage,
  NsiCoverageResponse,
  NsiSearchResult,
  RelationsCounts,
} from '@entities/nsi-dashboard'
import type { NsiCounts } from '@features/nsi-dashboard'

type TargetKey = 'sources' | 'types' | 'components' | 'params' | 'defects' | 'works'

type TileId = keyof NsiCoverage

const router = useRouter()
const { t } = useI18n()

const coverageQuery = useNsiCoverageQuery()
const diagnosticsQuery = useNsiDiagnosticsQuery()
// Fetch recent activity (increased limit for better overview)
const activityQuery = useNsiActivityQuery(12)
const countsQuery = useNsiCountsQuery()

watchEffect(() => {
  // статус запроса и готовые данные
  console.debug('[counts] status:', countsQuery.status.value)
  console.debug('[counts] data:', countsQuery.data.value)
  console.debug('[counts] error:', countsQuery.error.value)
})

const coverageResponse = computed<NsiCoverageResponse | null>(
  () => coverageQuery.data.value ?? null,
)
const countsData = computed<NsiCounts>(
  () =>
    countsQuery.data.value ?? {
      objectTypes: 0,
      components: 0,
      defects: 0,
      parameters: 0,
      works: 0,
      sources: 0,
    },
)
const coverage = computed<NsiCoverage | null>(() => {
  const base = coverageResponse.value ?? null
  const counts = countsData.value
  if (!counts) return base
  return mergeCoverageWithCounts(base, counts)
})
const coveragePartial = computed(() => Boolean(coverageResponse.value?.partial))
// Спиннер только пока нет первого ответа
const coverageLoading = computed(
  () => coverageQuery.status.value === 'pending' || countsQuery.status.value === 'pending',
)

const diagnosticsResponse = computed<DiagnosticsResponse | null>(
  () => diagnosticsQuery.data.value ?? null,
)
const diagnosticsItems = computed(() => diagnosticsResponse.value?.items ?? [])
const diagnosticsPartial = computed(() => Boolean(diagnosticsResponse.value?.partial))
const diagnosticsLoading = computed(() => diagnosticsQuery.isLoading.value)

const activityResponse = computed<ActivityResponse | null>(() => activityQuery.data.value ?? null)
const activityItems = computed(() => activityResponse.value?.items ?? [])
const activityPartial = computed(() => Boolean(activityResponse.value?.partial))
const activityEmpty = computed(() => t('nsi.dashboard.activity.empty'))
const activityTitle = computed(() => t('nsi.dashboard.activity.title'))

const relationsCounts = computed<RelationsCounts | null>(() => {
  const counts = countsData.value
  if (!counts) return null
  return {
    sources: counts.sources,
    types: counts.objectTypes,
    components: counts.components,
    params: counts.parameters,
    defects: counts.defects,
    works: counts.works,
  }
})
const relationsPartial = computed(() => false)
const relationsLoading = computed(() => countsQuery.status.value === 'pending')

const pageTitle = computed(() => t('nsi.dashboard.title'))
const pageSubtitle = computed(() => t('nsi.dashboard.subtitle'))
/* Ассистент временно отключён
const assistantLabel = computed(() => t('nsi.dashboard.actions.assistant.label'))
const assistantTooltip = computed(() => t('nsi.dashboard.actions.assistant.tooltip'))
const assistantBannerTitle = computed(() => t('nsi.dashboard.actions.assistant.bannerTitle'))
const assistantBannerText = computed(() => t('nsi.dashboard.actions.assistant.bannerText'))
*/

const searchPlaceholder = computed(() => t('nsi.dashboard.search.placeholder'))
const searchTypingHint = computed(() => t('nsi.dashboard.search.typingHint'))
const searchEmpty = computed(() => t('nsi.dashboard.search.empty'))
const searchLoadingText = computed(() => t('nsi.dashboard.search.loading'))
const searchOpenLabel = computed(() => t('nsi.dashboard.searchResults.open'))
const searchTypes = computed<Record<string, string>>(() => ({
  sources: t('nsi.dashboard.search.types.sources'),
  types: t('nsi.dashboard.search.types.types'),
  components: t('nsi.dashboard.search.types.components'),
  params: t('nsi.dashboard.search.types.params'),
  defects: t('nsi.dashboard.search.types.defects'),
  works: t('nsi.dashboard.search.types.works'),
}))

const actionsAriaLabel = computed(() => t('nsi.dashboard.actions.groupLabel'))

const quickActions = computed(() => [
  {
    id: 'add-document',
    label: t('nsi.dashboard.actions.addDocument.label'),
    tooltip: t('nsi.dashboard.actions.addDocument.tooltip'),
    to: { name: 'sources', query: { action: 'create' } },
  },
  {
    id: 'add-type',
    label: t('nsi.dashboard.actions.addObjectType.label'),
    tooltip: t('nsi.dashboard.actions.addObjectType.tooltip'),
    to: { name: 'object-types', query: { action: 'create' } },
  },
  {
    id: 'add-component',
    label: t('nsi.dashboard.actions.addComponent.label'),
    tooltip: t('nsi.dashboard.actions.addComponent.tooltip'),
    to: { name: 'components', query: { action: 'create' } },
  },
  {
    id: 'add-parameter',
    label: t('nsi.dashboard.actions.addParameter.label'),
    tooltip: t('nsi.dashboard.actions.addParameter.tooltip'),
    to: { name: 'object-parameters', query: { action: 'create' } },
  },
  {
    id: 'add-defect',
    label: t('nsi.dashboard.actions.addDefect.label'),
    tooltip: t('nsi.dashboard.actions.addDefect.tooltip'),
    to: { name: 'object-defects', query: { action: 'create' } },
  },
  {
    id: 'add-work',
    label: t('nsi.dashboard.actions.addWork.label'),
    tooltip: t('nsi.dashboard.actions.addWork.tooltip'),
    to: { name: 'works', query: { action: 'create' } },
  },
])

function mergeCoverageWithCounts(base: NsiCoverage | null, counts: NsiCounts): NsiCoverage {
  const b = base ?? ({} as NsiCoverage)
  return {
    sources: {
      total: counts.sources,
      withIssuerDateExec: b.sources?.withIssuerDateExec ?? 0,
    },
    types: {
      total: counts.objectTypes,
      withShape: b.types?.withShape ?? 0,
      withComponents: b.types?.withComponents ?? 0,
    },
    components: {
      total: counts.components,
      withParams: b.components?.withParams ?? 0,
      withDefects: b.components?.withDefects ?? 0,
    },
    params: {
      total: counts.parameters,
      withUnitsAndBounds: b.params?.withUnitsAndBounds ?? 0,
    },
    defects: {
      total: counts.defects,
      withCategoryAndComponent: b.defects?.withCategoryAndComponent ?? 0,
    },
    works: {
      total: counts.works,
      withTypePeriodSource: b.works?.withTypePeriodSource ?? 0,
    },
  }
}

const checklistTitle = computed(() => t('nsi.dashboard.checklist.title'))
const checklistGo = computed(() => t('nsi.dashboard.checklistActions.go'))
const checklistInfo = computed(() => t('nsi.dashboard.checklistActions.info'))

const checklistSteps = computed(() => {
  const data = coverage.value
  const totalSources = data?.sources.total ?? 0
  const sourcesFilled = data?.sources.withIssuerDateExec ?? 0
  const totalTypes = data?.types.total ?? 0
  const typesWithShape = data?.types.withShape ?? 0
  const typesWithComponents = data?.types.withComponents ?? 0
  const totalComponents = data?.components.total ?? 0
  const componentsWithParams = data?.components.withParams ?? 0
  const componentsWithDefects = data?.components.withDefects ?? 0
  const totalParams = data?.params.total ?? 0
  const paramsFilled = data?.params.withUnitsAndBounds ?? 0
  const totalDefects = data?.defects.total ?? 0
  const defectsFilled = data?.defects.withCategoryAndComponent ?? 0
  const totalWorks = data?.works.total ?? 0
  const worksFilled = data?.works.withTypePeriodSource ?? 0

  return [
    {
      id: 'sources',
      title: t('nsi.dashboard.checklist.steps.sources.title'),
      description: t('nsi.dashboard.checklist.steps.sources.description'),
      info: t('nsi.dashboard.checklist.steps.sources.info'),
      done: totalSources > 0 && sourcesFilled >= totalSources,
    },
    {
      id: 'types',
      title: t('nsi.dashboard.checklist.steps.types.title'),
      description: t('nsi.dashboard.checklist.steps.types.description'),
      info: t('nsi.dashboard.checklist.steps.types.info'),
      done: totalTypes > 0 && typesWithShape >= totalTypes && typesWithComponents >= totalTypes,
    },
    {
      id: 'components',
      title: t('nsi.dashboard.checklist.steps.components.title'),
      description: t('nsi.dashboard.checklist.steps.components.description'),
      info: t('nsi.dashboard.checklist.steps.components.info'),
      done:
        totalComponents > 0 &&
        componentsWithParams >= totalComponents &&
        componentsWithDefects >= totalComponents,
    },
    {
      id: 'params',
      title: t('nsi.dashboard.checklist.steps.params.title'),
      description: t('nsi.dashboard.checklist.steps.params.description'),
      info: t('nsi.dashboard.checklist.steps.params.info'),
      done: totalParams > 0 && paramsFilled >= totalParams,
    },
    {
      id: 'defects',
      title: t('nsi.dashboard.checklist.steps.defects.title'),
      description: t('nsi.dashboard.checklist.steps.defects.description'),
      info: t('nsi.dashboard.checklist.steps.defects.info'),
      done: totalDefects > 0 && defectsFilled >= totalDefects,
    },
    {
      id: 'works',
      title: t('nsi.dashboard.checklist.steps.works.title'),
      description: t('nsi.dashboard.checklist.steps.works.description'),
      info: t('nsi.dashboard.checklist.steps.works.info'),
      done: totalWorks > 0 && worksFilled >= totalWorks,
    },
  ]
})

const diagnosticsTitle = computed(() => t('nsi.dashboard.diagnostics.title'))
const diagnosticsDescription = computed(() => t('nsi.dashboard.diagnostics.description'))
const diagnosticsEmpty = computed(() => t('nsi.dashboard.diagnostics.empty'))

const severityLabels = computed(() => ({
  info: t('nsi.dashboard.diagnostics.severity.info'),
  warning: t('nsi.dashboard.diagnostics.severity.warning'),
  critical: t('nsi.dashboard.diagnostics.severity.critical'),
}))

const templatesTitle = computed(() => t('nsi.dashboard.templates.title'))
const templatesImport = computed(() => t('nsi.dashboard.templates.import'))
const templatesDownload = computed(() => t('nsi.dashboard.templates.download'))
const templatesHint = computed(() => t('nsi.dashboard.templates.hint'))

const breadcrumbSettings = computed(() => t('nsi.dashboard.breadcrumbs.settings'))
const breadcrumbHome = computed(() => t('nsi.dashboard.breadcrumbs.home'))
const breadcrumbsA11y = computed(() => t('nsi.dashboard.breadcrumbsA11y'))

const targetRoutes: Record<TargetKey, { name: string }> = {
  sources: { name: 'sources' },
  types: { name: 'object-types' },
  components: { name: 'components' },
  params: { name: 'object-parameters' },
  defects: { name: 'object-defects' },
  works: { name: 'works' },
}

const missingQueries: Partial<Record<TileId, Record<string, string>>> = {
  sources: { missing: 'issuer-date' },
  types: { missing: 'components' },
  components: { missing: 'params' },
  params: { missing: 'norms' },
  defects: { missing: 'category' },
  works: { missing: 'source' },
}

function handleNavigate(target: TargetKey) {
  const route = targetRoutes[target]
  if (!route) return
  void router.push({ name: route.name })
}

function handleTileSelect(id: TileId) {
  const routeKey = id as TargetKey
  const route = targetRoutes[routeKey]
  if (!route) return
  void router.push({ name: route.name, query: missingQueries[id] })
}

function handleDiagnosticSelect(item: DiagnosticItem) {
  const route = targetRoutes[item.target]
  if (!route) return
  void router.push({ name: route.name, query: item.linkQuery })
}

function handleActivitySelect(item: ActivityItem) {
  const route = targetRoutes[item.target]
  if (!route) return
  void router.push({ name: route.name, query: { highlight: item.targetId } })
}

function handleSearchSelect(result: NsiSearchResult) {
  const route = targetRoutes[result.type]
  if (!route) return
  const q = typeof result.title === 'string' ? result.title : ''
  const highlight = result.id
  const query = q ? { q, highlight } : { highlight }
  void router.push({ name: route.name, query })
}

function handleImport(action: 'import' | 'download') {
  if (action === 'import') {
    void router.push({ name: 'sources', query: { action: 'import' } })
    return
  }
  void router.push({ name: 'sources', query: { action: 'download-template' } })
}
</script>

<style scoped>
.nsi-dashboard-page {
  padding: var(--s360-space-xxl) var(--s360-space-xl);
}

.nsi-dashboard-page__container {
  display: flex;
  flex-direction: column;
  gap: var(--s360-space-xl);
  max-width: var(--s360-container-max-width);
  margin: 0 auto;
}

.nsi-dashboard-page__breadcrumbs {
  display: inline-flex;
  align-items: center;
  gap: var(--s360-space-sm);
  color: var(--s360-text-muted);
  font-size: var(--s360-font-caption);
}

.breadcrumbs__link {
  color: var(--s360-text-muted);
}

.breadcrumbs__current {
  color: var(--s360-text-primary);
  font-weight: 600;
}

.nsi-dashboard-page__layout {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  gap: var(--s360-space-xl);
  align-items: start;
}

.nsi-dashboard-page__left,
.nsi-dashboard-page__right {
  display: flex;
  flex-direction: column;
  gap: var(--s360-space-xl);
}

.nsi-dashboard-page__templates {
  display: flex;
  flex-direction: column;
  gap: var(--s360-space-sm);
}

.templates__title {
  margin: 0;
  font-size: var(--s360-font-title-md);
  font-weight: 600;
}

.templates__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s360-space-sm);
}

.templates__hint {
  margin: 0;
  color: var(--s360-text-muted);
  font-size: var(--s360-font-caption);
}

@media (max-width: 1024px) {
  .nsi-dashboard-page__layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .nsi-dashboard-page {
    padding: var(--s360-space-lg);
  }

  .templates__actions {
    flex-direction: column;
    align-items: stretch;
  }
}

@media (max-width: 480px) {
  .nsi-dashboard-page {
    padding: var(--s360-space-md);
  }
  .nsi-dashboard-page__container {
    gap: var(--s360-space-lg);
  }
}
</style>
