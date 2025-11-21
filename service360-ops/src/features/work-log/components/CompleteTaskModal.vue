<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="close">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Завершение задачи</h2>
        <button class="close-button" @click="close">&times;</button>
      </div>
      <div class="modal-body">
        <p>Введите фактический объем выполненной работы:</p>
        <AppNumberInput
          label="Фактический объем"
          id="actualVolume"
          v-model="actualVolume"
          :min="0"
          :step="1"
          :required="true"
        />
        <div class="modal-footer">
          <button class="cancel-button" @click="close">Отмена</button>
          <button class="confirm-button" @click="confirm" :disabled="!isVolumeValid">
            Подтвердить завершение
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import AppNumberInput from '@/shared/ui/FormControls/AppNumberInput.vue'; // Предполагаемый путь

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  maxVolume: {
    type: Number,
    default: Infinity,
  }
});

const emit = defineEmits(['close', 'confirm']);

const actualVolume = ref(null);

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    actualVolume.value = props.maxVolume === Infinity ? null : props.maxVolume; // Предзаполнить плановым объемом
  }
});

const isVolumeValid = computed(() => {
  const val = actualVolume.value;
  return val !== null && val >= 0;
});

const close = () => {
  emit('close');
};

const confirm = () => {
  if (isVolumeValid.value) {
    emit('confirm', actualVolume.value);
  }
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
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 450px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid #e2e8f0;
}

.modal-header h2 {
  margin: 0;
  font-size: 18px;
  color: #2d3748;
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #718096;
}

.modal-body {
  padding: 24px;
}

.modal-body p {
    margin-bottom: 16px;
    color: #4a5568;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

.cancel-button, .confirm-button {
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.cancel-button {
  background-color: #f7fafc;
  color: #4a5568;
  border: 1px solid #e2e8f0;
}

.cancel-button:hover {
  background-color: #edf2f7;
}

.confirm-button {
  background-color: #3b82f6;
  color: white;
  border: 1px solid #3b82f6;
}

.confirm-button:hover:not(:disabled) {
  background-color: #2563eb;
}

.confirm-button:disabled {
  background-color: #93c5fd;
  border-color: #93c5fd;
  cursor: not-allowed;
}
</style>