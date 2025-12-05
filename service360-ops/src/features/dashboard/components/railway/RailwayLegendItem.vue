<template>
  <div
    class="legend-item"
    :class="{
      'legend-item-active': isActive,
      'legend-item-inactive': isInactive
    }"
    @click="$emit('click')"
  >
    <div class="legend-color" :style="{ backgroundColor: color }"></div>
    <span class="legend-text">{{ text }}</span>
  </div>
</template>

<script setup>
defineProps({
  color: {
    type: String,
    required: true
  },
  text: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: false
  },
  isInactive: {
    type: Boolean,
    default: false
  }
});

defineEmits(['click']);
</script>

<style scoped>
.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 6px 10px;
  border-radius: 6px;
}

.legend-item:hover {
  background-color: #f7fafc;
}

.legend-item-active {
  background-color: #e6f7ff;
  border: 1px solid #91d5ff;
}

.legend-item-inactive {
  opacity: 0.4;
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-text {
  font-size: 14px;
  color: #1a202c;
  white-space: nowrap;
  font-weight: 400;
}
</style>
