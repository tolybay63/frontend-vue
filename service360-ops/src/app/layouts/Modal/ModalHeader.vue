<template>
  <div class="modal-header">
    <h3 class="modal-title">{{ title }}</h3>
    <button class="close-button" @click="close" title="Закрыть">
      <X :size="20" />
    </button>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue'
import { X } from 'lucide-vue-next'

const props = defineProps({
  title: String
})

const emit = defineEmits(['close'])

const close = () => {
  emit('close')
}
</script>

<style scoped>
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px;
  border-bottom: 1px solid #e2e8f0;
}

.modal-title {
  font-size: 20px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.close-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: #64748b;
  transition: all 0.2s;
}

.close-button:hover {
  background: #f1f5f9;
  color: #1e293b;
}
</style>
