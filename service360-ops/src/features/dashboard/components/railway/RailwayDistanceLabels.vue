<template>
  <div class="distance-labels">
    <span
      v-for="label in labels"
      :key="label.km"
      class="distance-label"
      :style="{ left: label.position }"
    >
      {{ label.label }}
    </span>
  </div>
</template>

<script setup>
defineProps({
  labels: Array
});
</script>

<style scoped>
.distance-labels {
  position: relative;
  height: 20px;
  padding: 0 12px;
}

.distance-label {
  position: absolute;
  font-size: 12px;
  color: #94a3b8;
  font-weight: 500;
  transform: translateX(-50%);
  transition: all 0.3s ease;
  white-space: nowrap;
}

@media (max-width: 768px) {
  .distance-labels {
    font-size: 10px;
  }
}

@media (max-width: 480px) {
  .distance-labels {
    padding: 0 8px;
  }
}
</style>
