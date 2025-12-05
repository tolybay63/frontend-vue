<template>
  <button
    class="main-button"
    :class="{ loading }"
    :disabled="loading || disabled"
    @click="$emit('click')"
  >
    <span v-if="!loading">{{ label }}</span>
    <span v-else>Загрузка...</span>
  </button>
</template>

<script>
export default {
  name: "MainButton",
  props: {
    label: { type: String, required: true },
    loading: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false }
  }
};
</script>

<style scoped>
.main-button {
  width: 100%;
  padding: 10px;
  background-color: #2b6cb0;
  color: white;
  font-size: 16px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: background 0.3s;
}
.main-button:hover:not(:disabled) {
  background-color: #0069d9;
}
.main-button:disabled {
  background-color: #a0a0a0;
  cursor: not-allowed;
}
</style>
