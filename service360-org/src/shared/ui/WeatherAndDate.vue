<template>
  <div class="weather-and-date">
    <div class="weather-display" @mouseenter="showWeatherTooltip = true" @mouseleave="showWeatherTooltip = false">
      <UiIcon :name="weatherIconName" :color="weatherIconColor" style="margin-right: 4px;"/>
      <div class="weather-content">
        <span class="weather-temp">{{ weatherTemp }}</span>
        <Transition name="weather-expand">
          <span v-if="showWeatherTooltip" class="weather-location">в г. Оскемен</span>
        </Transition>
      </div>
    </div>
    <span class="date-text">{{ currentDate }}</span>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import UiIcon from '@/shared/ui/UiIcon.vue';

const props = defineProps({
  weatherTemp: String,
  weatherIconName: String,
  weatherIconColor: String,
  currentDate: String,
});

const showWeatherTooltip = ref(false);
</script>

<style scoped>
.weather-and-date {
  display: flex;
  align-items: center;
  font-size: 14px;
  color: #718096;
  gap: 12px;
}

.weather-display {
  display: flex;
  align-items: center;
  cursor: help;
}

.weather-content {
  display: flex;
  align-items: center;
  gap: 6px;
  overflow: hidden;
  border-right: 1px solid #e2e8f0;
  padding-right: 8px;
}

.weather-temp {
  color: #2d3748;
  white-space: nowrap;
}

.weather-location {
  font-weight: 400;
  color: #4a5568;
  white-space: nowrap;
  font-size: 14px;
}

/* Анимация раскрытия */
.weather-expand-enter-active,
.weather-expand-leave-active {
  transition: all 0.3s ease;
  max-width: 200px;
}

.weather-expand-enter-from,
.weather-expand-leave-to {
  opacity: 0;
  max-width: 0;
  transform: translateX(-10px);
}

.weather-expand-enter-to,
.weather-expand-leave-from {
  opacity: 1;
  max-width: 200px;
  transform: translateX(0);
}

.date-text {
  font-size: 14px;
  color: #4a5568;
  white-space: nowrap;
}
</style>
