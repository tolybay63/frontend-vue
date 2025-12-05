<template>
  <div v-if="isOpen" class="modal-overlay" @click="handleOverlayClick">
    <div class="modal-container" @click.stop>
      <div class="modal-header">
        <h3 class="modal-title">Добавить исполнителей</h3>
        <button class="close-button" @click="closeModal" title="Закрыть">
          <X :size="20" />
        </button>
      </div>

      <div class="modal-body">
        <div v-if="isLoading" class="loading-state">
          <div class="spinner"></div>
          <p>Загрузка данных...</p>
        </div>

        <div v-else>
          <div class="form-group">
            <label for="location-select">Участок <span class="required">*</span></label>
            <AppDropdown
              id="location-select"
              v-model="selectedLocation"
              :options="locationOptions"
              placeholder="Выберите участок"
              @update:modelValue="handleLocationChange"
            />
          </div>

          <div class="form-group">
            <label>Исполнители <span class="required">*</span></label>
            <AppDropdown
              id="performer-select"
              v-model="selectedPerformers"
              :options="performerOptions"
              placeholder="Выберите одного или нескольких исполнителей"
              :disabled="!selectedLocation"
              multiple
            />
            <div v-if="selectedLocation && performerOptions.length === 0" class="empty-performers-text">
              Нет доступных исполнителей для выбранного участка
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="button button-secondary" @click="closeModal" type="button">
          Отмена
        </button>
        <button 
          class="button button-primary" 
          @click="savePerformers"
          :disabled="!isFormValid || isLoading"
          type="button" >
          Добавить
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { X } from 'lucide-vue-next';
import AppDropdown from '@/shared/ui/FormControls/AppDropdown.vue';
import { loadPersonnalByPosition } from '@/shared/api/execution/executionApi';
import { useNotificationStore } from '@/app/stores/notificationStore';

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  positionPv: {
    type: [Number, null],
    default: null
  }
});

const emit = defineEmits(['close', 'save']);

const notificationStore = useNotificationStore();

const isLoading = ref(false);
const selectedLocation = ref(null); // Должен хранить объект { value, label }
const selectedPerformers = ref([]); // Должен хранить массив ID
const allPerformers = ref([]); // Полный список исполнителей с деталями

// Уникальные участки из загруженных исполнителей
const locationOptions = computed(() => {
  const uniqueLocations = new Map();

  allPerformers.value.forEach(performer => {
    // Используем objLocation как ключ для уникальности и как значение
    if (performer.objLocation && performer.nameLocation) {
      uniqueLocations.set(performer.objLocation, {
        value: performer.objLocation,
        label: performer.nameLocation
      });
    }
  });

  return Array.from(uniqueLocations.values());
});

// Отфильтрованные исполнители по выбранному участку
const filteredPerformers = computed(() => {
  const locationValue = selectedLocation.value?.value;
  if (!locationValue) {
    return [];
  }

  return allPerformers.value.filter(
    performer => performer.objLocation === locationValue
  );
});

// Опции для выпадающего списка исполнителей
const performerOptions = computed(() => {
  // Option value должен быть ID исполнителя, а label - его ФИО
  return filteredPerformers.value.map(performer => ({
    label: performer.fullName,
    value: performer.id
  }));
});

// Проверка валидности формы
const isFormValid = computed(() => {
  // Проверяем, что value участка существует и что в selectedPerformers есть хотя бы один ID
  return selectedLocation.value?.value && selectedPerformers.value.length > 0;
});

// Загрузка исполнителей при открытии модалки
watch(() => props.isOpen, async (newValue) => {
  if (newValue) {
    await loadPerformers();
    // Сброс при открытии
    selectedLocation.value = null; 
    selectedPerformers.value = [];
  } else {
    resetForm();
  }
});

const loadPerformers = async () => {
  isLoading.value = true;
  if (props.positionPv === null) return;
  try {
    const records = await loadPersonnalByPosition(props.positionPv);
    allPerformers.value = records.map(record => ({
      id: record.id,
      cls: record.cls,
      pv: record.pv,
      name: record.name,
      fullName: record.fullName,
      fvPosition: record.fvPosition,
      pvPosition: record.pvPosition,
      namePosition: record.namePosition,
      objLocation: record.objLocation,
      pvLocation: record.pvLocation,
      nameLocation: record.nameLocation
    }));
  } catch (error) {
    notificationStore.showNotification('Ошибка при загрузке списка исполнителей', 'error');
    console.error('Ошибка загрузки исполнителей:', error);
    allPerformers.value = [];
  } finally {
    isLoading.value = false;
  }
};

const handleLocationChange = (value) => {
  // При смене участка сбрасываем выбранных исполнителей
  selectedPerformers.value = [];
};

const closeModal = () => {
  emit('close');
};

const handleOverlayClick = () => {
  closeModal();
};

const savePerformers = () => {
  if (!isFormValid.value) return;

  // Получаем полные объекты исполнителей, которые были выбраны
  const selectedPerformerData = allPerformers.value.filter(performer => 
    selectedPerformers.value.includes(performer.id)
  );

  emit('save', {
    // Передаем только value участка
    location: selectedLocation.value.value, 
    performers: selectedPerformerData
  });

  // Закрытие модального окна происходит в ResourceEditTable.vue после успешной обработки
  // Если вы хотите закрыть модалку сразу после emit:
  // closeModal(); 
};

const resetForm = () => {
  selectedLocation.value = null;
  selectedPerformers.value = [];
  allPerformers.value = [];
};
</script>

<style scoped>
/* Стили не менялись, но для полноты ответа оставим их структуру */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  backdrop-filter: blur(4px);
}

.modal-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  max-width: 600px;
  width: 100%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

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

.modal-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 16px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-state p {
  color: #64748b;
  font-size: 14px;
  margin: 0;
}

.form-group {
  margin-bottom: 24px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #334155;
  margin-bottom: 8px;
}

.required {
  color: #dc2626;
}

.empty-performers-text {
  color: #94a3b8;
  font-size: 14px;
  margin-top: 8px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
  border-radius: 0 0 12px 12px;
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

@media (max-width: 640px) {
  .modal-container {
    max-width: 100%;
    max-height: 90vh;
  }

  .modal-header {
    padding: 20px;
  }

  .modal-body {
    padding: 20px;
  }

  .modal-footer {
    flex-direction: column-reverse;
    padding: 16px 20px;
  }

  .button {
    width: 100%;
  }
}
</style>