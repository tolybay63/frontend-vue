<template>
  <button
    @click="$emit('click')"
    class="back-button"
    :disabled="disabled"
  >
    <UiIcon name="ChevronLeft" :color="iconColor" />
    Назад
  </button>
</template>

<script setup>
import { defineProps, computed } from 'vue';
import UiIcon from './UiIcon.vue';

const props = defineProps({
  disabled: {
    type: Boolean,
    default: false
  }
});

const iconColor = computed(() => {
  if (props.disabled) return '#a0aec0'; 
  return 'currentColor';
});
</script>

<style scoped>
.back-button {
  display: flex;
  align-items: center;
  border: none;
  background: transparent;
  color: #3182ce;
  font-size: 14px;
  padding: 0;
  cursor: pointer;
  margin: 0;
  min-height: auto;
  height: auto;
  transition: color 0.2s ease;
}

.back-button:hover {
  color: #2c5aa0;
}

.back-button:active {
  color: #264d7a;
}

.back-button:disabled {
  color: #a0aec0;
  cursor: not-allowed;
}
</style>