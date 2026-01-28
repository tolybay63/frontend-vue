<template>
  <div class="modal-footer">
    <button v-if="showDelete" class="button button-delete" @click="deleteObject" :disabled="loading">Удалить</button>
    <div></div>
    <button v-if="showCancel" class="button button-secondary" @click="cancel" :disabled="loading">Отмена</button>
    <button v-if="showSave" class="button button-primary" @click="save" :disabled="disabled || loading">Сохранить</button>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue'

const emit = defineEmits(['cancel', 'save', 'delete'])

const props = defineProps({
  disabled: Boolean,
  loading: { type: Boolean, default: false },
  showDelete: Boolean,
  showSave: { type: Boolean, default: true },
  showCancel: { type: Boolean, default: true },
})

const cancel = () => emit('cancel')
const save = () => emit('save')
const deleteObject = () => emit('delete')
</script>

<style scoped>
.modal-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid #e2e8f0;
}

.modal-footer button.button-delete {
  order: -1;
}

.modal-footer > div {
  flex: 1;
}

.button {
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.button-secondary {
  background: white;
  color: #64748b;
  border: 1px solid #e2e8f0;
}

.button-secondary:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.button-primary {
  background: #3b82f6;
  color: white;
}

.button-primary:hover:not(:disabled) {
  background: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.button-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.button-delete {
  background: #dc2626;
  color: white;
}

.button-delete:hover {
  background: #b91c1c;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
}

.button-delete:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.button-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 640px) {
  .modal-footer {
    flex-direction: column-reverse;
    padding: 16px 20px;
  }

  .button {
    width: 100%;
  }
}
</style>