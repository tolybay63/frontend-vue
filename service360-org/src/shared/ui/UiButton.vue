<template>
  <button class="ui-button">
    <UiIcon :name="icon" v-if="icon" />
    <span>{{ text }}</span>
  </button>
</template>

<script setup>
import UiIcon from './UiIcon.vue'

defineProps({
  text: String,
  icon: String
})
</script>

<style scoped>
.ui-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background-color: #ffffff;
  border: 1px solid #ccc;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.ui-button:hover {
  background-color: #f0f0f0;
}
</style>
