<template>
  <section class="relations-map">
    <header class="relations-map__header">
      <div class="relations-map__heading">
        <h2 class="relations-map__title">{{ title }}</h2>
        <NTooltip v-if="partial" placement="top">
          <template #trigger>
            <span class="relations-map__status">{{ partialLabel }}</span>
          </template>
          <span>{{ partialTooltip }}</span>
        </NTooltip>
      </div>
      <NPopover trigger="hover" placement="left">
        <template #trigger>
          <NButton quaternary size="small" class="relations-map__help">
            {{ helpLabel }}
          </NButton>
        </template>
        <div class="relations-map__help-content">
          <p class="relations-map__help-title">{{ helpTooltip }}</p>
          <ul>
            <li v-for="(point, index) in helpPoints" :key="index">{{ point }}</li>
          </ul>
        </div>
      </NPopover>
    </header>

    <div class="relations-map__canvas" role="presentation" ref="canvasRef">
      <svg
        class="relations-map__edges"
        :viewBox="`0 0 ${canvasSize.w} ${canvasSize.h}`"
        preserveAspectRatio="none"
      >
        <defs>
          <!-- стрелочный маркер; цвет наследуется от stroke -->

          <marker
            id="rm-arrow"
            markerWidth="8"
            markerHeight="5"
            refX="7"
            refY="2.5"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <path d="M0,0 L8,2.5 L0,5 z" fill="currentColor" />
          </marker>
        </defs>

        <g v-for="edge in edges" :key="edge.id">
          <line
            :x1="edge.x1"
            :y1="edge.y1"
            :x2="edge.x2"
            :y2="edge.y2"
            class="relations-map__edge"
            marker-end="url(#rm-arrow)"
          >
            <title>{{ edge.tooltip }}</title>
          </line>
        </g>
      </svg>

      <div v-for="node in nodes" :key="node.id" class="relations-map__node" :style="node.style">
        <NTooltip placement="top">
          <template #trigger>
            <button
              type="button"
              class="relations-map__node-btn"
              :aria-label="`${node.label}: ${node.tooltip}`"
              @click="handleNodeClick(node.id)"
              :data-node-id="node.id"
              ref="nodeBtnRefs"
            >
              <span class="relations-map__node-label">{{ node.label }}</span>
              <span class="relations-map__node-count">{{ node.count }}</span>
            </button>
          </template>
          <span>{{ node.tooltip }}</span>
        </NTooltip>
      </div>

      <div v-if="loading" class="relations-map__overlay">
        <NSpin size="large" />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, reactive, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { NButton, NPopover, NSpin, NTooltip } from 'naive-ui'

import { useI18n } from '@shared/lib'
import type { RelationsCounts } from '@entities/nsi-dashboard'

defineOptions({ name: 'NsiDashboardRelationsMap' })

// ----- ПАРАМЕТРЫ / ПРОПСЫ -----
const props = defineProps<{
  counts: RelationsCounts | null
  loading?: boolean
  partial?: boolean
}>()
const emit = defineEmits<{ (e: 'select-node', id: keyof RelationsCounts): void }>()

const { t, tm } = useI18n()
const partial = computed(() => Boolean(props.partial))
const partialLabel = computed(() => t('nsi.dashboard.partial.label'))
const partialTooltip = computed(() => t('nsi.dashboard.partial.tooltip'))

const title = computed(() => t('nsi.dashboard.relations.title'))
const helpLabel = computed(() => t('nsi.dashboard.relations.helpLabel'))
const helpTooltip = computed(() => t('nsi.dashboard.relations.helpTooltip'))
const helpPoints = computed(() => tm<string>('nsi.dashboard.relations.helpPoints'))

// ----- РАСКЛАДКА УЗЛОВ (% от контейнера) -----
const rawNodes = [
  {
    id: 'sources',
    x: 80,
    y: 90,
    labelKey: 'nsi.dashboard.relations.nodes.sources.label',
    tooltipKey: 'nsi.dashboard.relations.nodes.sources.tooltip',
  },
  {
    id: 'types',
    x: 10,
    y: 44,
    labelKey: 'nsi.dashboard.relations.nodes.types.label',
    tooltipKey: 'nsi.dashboard.relations.nodes.types.tooltip',
  },
  {
    id: 'components',
    x: 40,
    y: 28,
    labelKey: 'nsi.dashboard.relations.nodes.components.label',
    tooltipKey: 'nsi.dashboard.relations.nodes.components.tooltip',
  },
  {
    id: 'params',
    x: 80,
    y: 50,
    labelKey: 'nsi.dashboard.relations.nodes.params.label',
    tooltipKey: 'nsi.dashboard.relations.nodes.params.tooltip',
  },
  {
    id: 'defects',
    x: 80,
    y: 10,
    labelKey: 'nsi.dashboard.relations.nodes.defects.label',
    tooltipKey: 'nsi.dashboard.relations.nodes.defects.tooltip',
  },
  {
    id: 'works',
    x: 40,
    y: 70,
    labelKey: 'nsi.dashboard.relations.nodes.works.label',
    tooltipKey: 'nsi.dashboard.relations.nodes.works.tooltip',
  },
] as const

type NodeMeta = { x: number; y: number; label: string; tooltip: string; count: number }
const nodeMap = computed(() => {
  const map = new Map<string, NodeMeta>()
  for (const n of rawNodes) {
    const label = t(n.labelKey)
    const tooltip = t(n.tooltipKey)
    const countKey = n.id as keyof RelationsCounts
    const count = props.counts?.[countKey] ?? 0
    map.set(n.id, { x: n.x, y: n.y, label, tooltip, count })
  }
  return map
})

const nodes = computed(() =>
  Array.from(nodeMap.value.entries()).map(([id, meta]) => ({
    id: id as keyof RelationsCounts,
    label: meta.label,
    tooltip: meta.tooltip,
    count: meta.count,
    style: { left: `${meta.x}%`, top: `${meta.y}%` },
  })),
)

// ----- РЁБРА (логические связи) -----
const rawEdges: Array<{ id: string; from: string; to: string; tooltipKey: string }> = [
  {
    id: 'sources-works',
    from: 'sources',
    to: 'works',
    tooltipKey: 'nsi.dashboard.relations.edges.sourcesWorks',
  },
  {
    id: 'sources-params',
    from: 'sources',
    to: 'params',
    tooltipKey: 'nsi.dashboard.relations.edges.sourcesParams',
  },
  {
    id: 'types-components',
    from: 'types',
    to: 'components',
    tooltipKey: 'nsi.dashboard.relations.edges.typesComponents',
  },
  {
    id: 'components-params',
    from: 'components',
    to: 'params',
    tooltipKey: 'nsi.dashboard.relations.edges.componentsParams',
  },
  {
    id: 'components-defects',
    from: 'components',
    to: 'defects',
    tooltipKey: 'nsi.dashboard.relations.edges.componentsDefects',
  },
  {
    id: 'works-types',
    from: 'works',
    to: 'types',
    tooltipKey: 'nsi.dashboard.relations.edges.worksType',
  },
]

// ----- РЕАЛЬНЫЕ РАЗМЕРЫ ХОЛСТА/УЗЛОВ -----
const canvasRef = ref<HTMLElement | null>(null)
const nodeBtnRefs = ref<HTMLButtonElement[] | null>(null)

const canvasSize = reactive({ w: 600, h: 360 })

// размеры каждой «пилюльки»
type Size = { w: number; h: number }
const nodeSizes = reactive(new Map<string, Size>())

// наблюдатель за холстом
let ro: ResizeObserver | null = null

function measureCanvas() {
  const el = canvasRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  // fallback на min размеры, чтобы не было нулей
  canvasSize.w = Math.max(1, Math.round(rect.width))
  canvasSize.h = Math.max(1, Math.round(rect.height))
}

function measureNodes() {
  // собираем размеры кнопок-узлов по data-node-id
  nodeSizes.clear()
  const buttons = canvasRef.value?.querySelectorAll<HTMLButtonElement>('.relations-map__node-btn')
  buttons?.forEach((btn) => {
    const id = btn.getAttribute('data-node-id')
    if (!id) return
    const r = btn.getBoundingClientRect()
    nodeSizes.set(id, { w: r.width, h: r.height })
  })
}

onMounted(async () => {
  measureCanvas()
  await nextTick()
  measureNodes()

  ro = new ResizeObserver(() => {
    measureCanvas()
    // после изменения размеров холста — переизмерим кнопки
    // (их размеры могут чуть измениться из-за reflow)
    requestAnimationFrame(measureNodes)
  })
  if (canvasRef.value) ro.observe(canvasRef.value)
})

onBeforeUnmount(() => {
  ro?.disconnect()
  ro = null
})

// когда меняется набор узлов/подписи/числа — после рендера переизмерить
watch(nodes, async () => {
  await nextTick()
  measureNodes()
})

// ----- МАТЕМАТИКА ДЛЯ «УПИРАЕМСЯ В ГРАНИЦУ ПИЛЮЛЬКИ» -----

/**
 * Возвращает точку пересечения луча (из центра start в сторону end)
 * с эллипсом, аппроксимирующим «пилюльку»:
 * rx = width/2, ry = height/2
 */
function pointOnEllipseBorder(
  startCx: number,
  startCy: number,
  endCx: number,
  endCy: number,
  rx: number,
  ry: number,
) {
  // направляющий вектор из центра start к центру end
  const dx = endCx - startCx
  const dy = endCy - startCy
  // защита от нулевого вектора
  if (dx === 0 && dy === 0) return { x: startCx, y: startCy }
  // масштаб s, при котором (dx*s, dy*s) лежит на эллипсе:
  // (dx*s)^2/rx^2 + (dy*s)^2/ry^2 = 1  =>  s = 1 / sqrt((dx^2/rx^2)+(dy^2/ry^2))
  const s = 1 / Math.sqrt((dx * dx) / (rx * rx || 1) + (dy * dy) / (ry * ry || 1))
  return { x: startCx + dx * s, y: startCy + dy * s }
}

const edges = computed(() => {
  // центр узла в ПИКСЕЛЯХ
  const center = (id: string) => {
    const m = nodeMap.value.get(id)
    if (!m) return { cx: 0, cy: 0 }
    return {
      cx: (m.x / 100) * canvasSize.w,
      cy: (m.y / 100) * canvasSize.h,
    }
  }
  // размеры узла в ПИКСЕЛЯХ (fallback к разумным)
  const sizeOf = (id: string): Size => {
    return nodeSizes.get(id) ?? { w: 140, h: 56 }
  }

  return rawEdges
    .map((e) => {
      const s = center(e.from)
      const t = center(e.to)
      // радиусы «пилюлек»
      const sSize = sizeOf(e.from)
      const tSize = sizeOf(e.to)
      const sRx = sSize.w / 2
      const sRy = sSize.h / 2
      const tRx = tSize.w / 2
      const tRy = tSize.h / 2

      // точки на границе эллипсов, чтобы линия не «втыкалась» в центр
      const startPoint = pointOnEllipseBorder(s.cx, s.cy, t.cx, t.cy, sRx, sRy)
      const endPoint = pointOnEllipseBorder(t.cx, t.cy, s.cx, s.cy, tRx, tRy)

      return {
        id: e.id,
        x1: startPoint.x,
        y1: startPoint.y,
        x2: endPoint.x,
        y2: endPoint.y,
        tooltip: t_(e.tooltipKey),
      }
    })
    .filter(Boolean)
})

// локальный помощник для i18n (чтобы читаемее в маппинге)
function t_(key: string) {
  return t(key)
}

const loading = computed(() => Boolean(props.loading))

function handleNodeClick(id: keyof RelationsCounts) {
  emit('select-node', id)
}
</script>

<style scoped>
.relations-map {
  display: flex;
  flex-direction: column;
  gap: var(--s360-space-md);
  padding: var(--s360-space-xl);
  background: var(--s360-color-elevated);
  border-radius: var(--s360-radius-lg);
  box-shadow: var(--s360-shadow-lg);
  position: relative;
  min-height: 280px;
}

.relations-map__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s360-space-md);
}

.relations-map__heading {
  display: flex;
  align-items: center;
  gap: var(--s360-space-sm);
}

.relations-map__title {
  margin: 0;
  font-size: var(--s360-font-title-md);
  font-weight: 600;
}

.relations-map__status {
  display: inline-flex;
  align-items: center;
  padding: 0 var(--s360-space-sm);
  border-radius: var(--s360-radius);
  background: var(--s360-color-warning-soft);
  color: var(--s360-text-warning);
  font-size: var(--s360-font-caption);
  font-weight: 600;
  line-height: 1.6;
}

.relations-map__help {
  font-size: var(--s360-font-caption);
  border-radius: 20px;
  padding: var(--s360-space-xs) var(--s360-space-sm);
}

.relations-map__help-content {
  max-width: 260px;
  display: flex;
  flex-direction: column;
  gap: var(--s360-space-sm);
  font-size: var(--s360-font-caption);
}

.relations-map__help-title {
  margin: 0;
  font-weight: 600;
}

.relations-map__canvas {
  position: relative;
  min-height: 240px;
}

.relations-map__edges {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.relations-map__edge {
  stroke: var(--s360-color-primary-soft);
  stroke-width: 3;
  stroke-linecap: round;
}

.relations-map__node {
  position: absolute;
  transform: translate(-50%, -50%);
}

.relations-map__node-btn {
  display: flex;
  flex-direction: column;
  gap: var(--s360-space-xs);
  align-items: center;
  justify-content: center;
  padding: var(--s360-space-md) var(--s360-space-lg);
  border-radius: var(--s360-radius-lg);
  border: 1px solid var(--s360-color-border-subtle);
  min-width: 140px;
  background: var(--s360-color-neutral-soft);
  color: inherit;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
  box-shadow: 0 4px 12px rgba(21, 46, 110, 0.12);
}

.relations-map__node-btn:hover,
.relations-map__node-btn:focus {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(21, 46, 110, 0.2);
  border-color: var(--s360-color-primary);
}

.relations-map__node-label {
  font-weight: 600;
}

.relations-map__node-count {
  font-size: var(--s360-font-caption);
  color: var(--s360-text-muted);
}

.relations-map__overlay {
  position: absolute;
  inset: 0;
  backdrop-filter: blur(2px);
  background: var(--s360-overlay-veil);
  border-radius: var(--s360-radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
}

@media (max-width: 768px) {
  .relations-map {
    padding: var(--s360-space-lg);
  }

  .relations-map__node-btn {
    min-width: 120px;
    padding: var(--s360-space-sm) var(--s360-space-md);
  }
}
</style>
