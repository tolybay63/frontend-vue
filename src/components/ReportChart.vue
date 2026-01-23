<template>
  <div class="chart-wrapper">
    <component :is="chartComponent" :data="chartData" :options="chartOptions" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  ArcElement,
} from 'chart.js'
import { Bar, Line, Pie } from 'vue-chartjs'

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  ArcElement,
)

const props = defineProps({
  vizType: {
    type: String,
    default: 'bar',
  },
  chartData: {
    type: Object,
    required: true,
  },
  chartOptions: {
    type: Object,
    default: () => ({}),
  },
})

const chartComponent = computed(() => {
  if (props.vizType === 'line') return Line
  if (props.vizType === 'pie') return Pie
  return Bar
})
</script>

<style scoped>
.chart-wrapper {
  width: 100%;
  min-height: 360px;
}
</style>
