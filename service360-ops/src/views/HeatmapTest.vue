<template>
  <div class="heatmap-test-page">
    <div class="page-header">
      <h1>Тестирование тепловой карты</h1>
      <p class="description">
        Визуализация состояния 151 км пути по дням выбранного месяца
      </p>
    </div>

    <RoadHeatmap />
  </div>
</template>

<script setup>
import RoadHeatmap from '@/components/RoadHeatmap.vue';
</script>

<style scoped>
.heatmap-test-page {
  padding: 24px;
  background: #f7fafc;
  min-height: 100vh;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h1 {
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 600;
  color: #1a202c;
}

.page-header .description {
  margin: 0;
  font-size: 16px;
  color: #718096;
}
</style>
