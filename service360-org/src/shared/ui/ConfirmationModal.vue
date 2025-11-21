<template>
  <div class="modal-overlay" @click.self="onCancel">
    <div class="modal-card">
      <div class="modal-body">
        <h3 class="title">{{ title }}</h3>
        <p class="message">{{ message }}</p>
      </div>
      <div class="modal-footer">
        <button class="cancel-btn" @click="onCancel">Отмена</button>
        <button class="confirm-btn" @click="onConfirm">Да</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';

defineProps({
  title: {
    type: String,
    default: 'Подтверждение',
  },
  message: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(['confirm', 'cancel']);

const onConfirm = () => {
  emit('confirm');
};

const onCancel = () => {
  emit('cancel');
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1100; /* Higher than other modals */
}

.modal-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  width: 400px;
  max-width: 90%;
}

.modal-body {
  padding: 24px;
}

.title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
}

.message {
  font-size: 14px;
  color: #4a5568;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
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

.confirm-btn {
  background-color: #2b6cb0;
  color: white;
}

.confirm-btn:hover {
  background-color: #2c5282;
}
</style>