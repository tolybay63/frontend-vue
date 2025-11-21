<template>
  <div class="kpi-card" :class="variant">
    <div class="kpi-value-container">
      <span class="kpi-value">{{ value }}</span>
      <span v-if="monthlyValue !== null && monthlyValue !== undefined" class="kpi-monthly">
        / {{ formattedMonthlyValue }}
      </span>
    </div>
    <span class="kpi-label">{{ label }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  value: {
    type: [String, Number],
    required: true,
  },
  monthlyValue: {
    type: [String, Number],
    default: null,
  },
  label: {
    type: String,
    required: true,
  },
  variant: {
    type: String,
    default: '',
  },
});

const formattedMonthlyValue = computed(() => {
  if (props.monthlyValue === null || props.monthlyValue === undefined) {
    return '';
  }
  const num = Number(props.monthlyValue);
  if (isNaN(num)) {
    return props.monthlyValue;
  }
  // Округляем до 2 знаков и убираем лишние нули
  return parseFloat(num.toFixed(2));
});
</script>

<style scoped>
.kpi-card {
  background: white;
  border-radius: 8px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  border: 2px solid transparent;
}
.kpi-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 6px 12px rgba(0,0,0,0.08);
}
.kpi-value-container {
  display: flex;
  align-items: baseline;
  gap: 4px;
}
.kpi-value {
  font-size: 36px;
  font-weight: 500;
  color: #2b6cb0;
}
.kpi-monthly {
  font-size: 14px;
  font-weight: 400;
  color: #9ca3af;
}
.kpi-label {
  font-size: 14px;
  color: #718096;
  margin-top: 8px;
}
.kpi-card.overdue .kpi-value {
  color: #c53030;
}
.kpi-card.active-kpi {
  border-color: #3b82f6;
  background: #eff6ff;
}
</style>