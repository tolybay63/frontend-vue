<template>
  <div class="modal-footer">
    <button v-if="showDelete" class="delete-btn" @click="deleteObject">Удалить</button>
    <div></div>
    <button v-if="showCancel" class="cancel-btn" @click="cancel">Отмена</button>
    <button v-if="showSave" class="save-btn" @click="save" :disabled="disabled">Сохранить</button>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue'

const emit = defineEmits(['cancel', 'save', 'delete'])

const props = defineProps({
  disabled: Boolean,
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
  padding: 20px 62px;
  background-color: #ffffff;
  border-top: 1px solid #e5e7eb;
}

.modal-footer button.delete-btn {
  order: -1;
}

.modal-footer > div {
  flex: 1; 
}

button {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
}

.cancel-btn {
  background-color: #edf2f7;
  color: #4a5568;
}

.save-btn {
  background-color: #2b6cb0;
  color: white;
}

.save-btn:hover {
  background-color: #2c5282;
}

.delete-btn {
  background-color: #e53e3e;
  color: white;
}

.delete-btn:hover {
  background-color: #c53030;
}
</style>