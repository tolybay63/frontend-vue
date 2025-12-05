<template>
  <div class="status-header">
    <div class="title-section">
      <div>
        <h2 class="railway-title">{{ title }}</h2>
        <div v-if="mode !== 'width' && mode !== 'skew'" class="average-score">
          <span class="score-label">Средний балл</span>
          <span class="score-value">{{ averageScore }}</span>
        </div>
      </div>
    </div>
    <div class="status-legend">
      <template v-if="mode === 'skew'">
        <RailwayLegendItem
          color="#f59e0b"
          :text="`${statusStats.level} ед.  Откл. от уровня ≥ 6`"
          :is-active="selectedLegends.includes('level')"
          :is-inactive="selectedLegends.length > 0 && !selectedLegends.includes('level')"
          @click="emit('toggleLegend', 'level')"
        />
        <RailwayLegendItem
          color="#ec4899"
          :text="`${statusStats.skew} ед.  Перекос ≥ 10`"
          :is-active="selectedLegends.includes('skew')"
          :is-inactive="selectedLegends.length > 0 && !selectedLegends.includes('skew')"
          @click="emit('toggleLegend', 'skew')"
        />
        <RailwayLegendItem
          color="#8b5cf6"
          :text="`${statusStats.subsidence} ед.  Просадка ≥ 12`"
          :is-active="selectedLegends.includes('subsidence')"
          :is-inactive="selectedLegends.length > 0 && !selectedLegends.includes('subsidence')"
          @click="emit('toggleLegend', 'subsidence')"
        />
        <RailwayLegendItem
          color="#06b6d4"
          :text="`${statusStats.planDeviation} ед.  Откл. в плане ≥ 10`"
          :is-active="selectedLegends.includes('planDeviation')"
          :is-inactive="selectedLegends.length > 0 && !selectedLegends.includes('planDeviation')"
          @click="emit('toggleLegend', 'planDeviation')"
        />
      </template>
      <template v-else-if="mode === 'width'">
        <RailwayLegendItem
          color="#3b82f6"
          :text="`${statusStats.narrowing} ед.  Сужение < 1516`"
          :is-active="selectedLegends.includes('narrowing')"
          :is-inactive="selectedLegends.length > 0 && !selectedLegends.includes('narrowing')"
          @click="emit('toggleLegend', 'narrowing')"
        />
        <RailwayLegendItem
          color="#a855f7"
          :text="`${statusStats.widening} ед.  Уширение > 1538`"
          :is-active="selectedLegends.includes('widening')"
          :is-inactive="selectedLegends.length > 0 && !selectedLegends.includes('widening')"
          @click="emit('toggleLegend', 'widening')"
        />
      </template>
      <template v-else>
        <RailwayLegendItem
          color="#10b981"
          :text="`${statusStats.excellent} км  Отлично ≤ 25`"
          :is-active="selectedLegends.includes('excellent')"
          :is-inactive="selectedLegends.length > 0 && !selectedLegends.includes('excellent')"
          @click="emit('toggleLegend', 'excellent')"
        />
        <RailwayLegendItem
          color="#84cc16"
          :text="`${statusStats.good} км  Хорошо ≤ 80`"
          :is-active="selectedLegends.includes('good')"
          :is-inactive="selectedLegends.length > 0 && !selectedLegends.includes('good')"
          @click="emit('toggleLegend', 'good')"
        />
        <RailwayLegendItem
          color="#f97316"
          :text="`${statusStats.satisfactory} км  Удовл. ≤ 180`"
          :is-active="selectedLegends.includes('satisfactory')"
          :is-inactive="selectedLegends.length > 0 && !selectedLegends.includes('satisfactory')"
          @click="emit('toggleLegend', 'satisfactory')"
        />
        <RailwayLegendItem
          color="#ef4444"
          :text="`${statusStats.poor} км  Неудовл. > 180`"
          :is-active="selectedLegends.includes('poor')"
          :is-inactive="selectedLegends.length > 0 && !selectedLegends.includes('poor')"
          @click="emit('toggleLegend', 'poor')"
        />
      </template>
    </div>
  </div>
</template>

<script setup>
import RailwayLegendItem from './RailwayLegendItem.vue';

const props = defineProps({
  title: String,
  averageScore: Number,
  statusStats: Object,
  selectedLegends: Array,
  mode: {
    type: String,
    default: 'status'
  }
});

const emit = defineEmits(['toggleLegend']);
</script>

<style scoped>
.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  gap: 24px;
}

.title-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.railway-title {
  font-size: 20px;
  font-weight: 600;
  color: #1a202c;
  margin: 0;
}

.average-score {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-top: 4px;
}

.score-label {
  font-size: 14px;
  color: #718096;
  font-weight: 400;
}

.score-value {
  font-size: 20px;
  font-weight: 600;
  color: #3b82f6;
  letter-spacing: -0.5px;
}

.status-legend {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}
</style>
