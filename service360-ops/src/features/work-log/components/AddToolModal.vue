<template>
  <div v-if="isOpen" class="modal-overlay" @click="handleOverlayClick">
    <div class="modal-container" @click.stop>
      <div class="modal-header">
        <h3 class="modal-title">Добавить инструменты</h3>
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
            <label>Инструменты <span class="required">*</span></label>
            <AppDropdown
              id="tool-select"
              v-model="selectedTools"
              :options="toolOptions"
              placeholder="Выберите один или несколько инструментов"
              :disabled="!selectedLocation"
              multiple
            />
            <div v-if="selectedLocation && toolOptions.length === 0" class="empty-tools-text">
              Нет доступных инструментов для выбранного участка
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
          @click="saveTools"
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
import { loadResourceByTyp } from '@/shared/api/execution/executionApi';
import { useNotificationStore } from '@/app/stores/notificationStore';

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  pvTypTool: {
    type: [Number, null],
    default: null
  }
});

const emit = defineEmits(['close', 'save']);

const notificationStore = useNotificationStore();

const isLoading = ref(false);
const selectedLocation = ref(null);
const selectedTools = ref([]);
const allTools = ref([]);

// Уникальные участки из загруженных инструментов
const locationOptions = computed(() => {
  const uniqueLocations = new Map();

  allTools.value.forEach(tool => {
    if (tool.objLocationClsSection && tool.nameLocationClsSection) {
      uniqueLocations.set(tool.objLocationClsSection, {
        value: tool.objLocationClsSection,
        label: tool.nameLocationClsSection
      });
    }
  });

  return Array.from(uniqueLocations.values());
});

// Отфильтрованные инструменты по выбранному участку
const filteredTools = computed(() => {
  const locationValue = selectedLocation.value?.value;
  if (!locationValue) {
    return [];
  }

  return allTools.value.filter(
    tool => tool.objLocationClsSection === locationValue
  );
});

// Опции для выпадающего списка инструментов
const toolOptions = computed(() => {
  return filteredTools.value.map(tool => ({
    label: tool.name,
    value: tool.id
  }));
});

// Проверка валидности формы
const isFormValid = computed(() => {
  return selectedLocation.value?.value && selectedTools.value.length > 0;
});

// Загрузка инструментов при открытии модалки
watch(() => props.isOpen, async (newValue) => {
  if (newValue) {
    await loadTools();
    selectedLocation.value = null;
    selectedTools.value = [];
  } else {
    resetForm();
  }
});

const loadTools = async () => {
  isLoading.value = true;
  if (props.pvTypTool === null) return;
  try {
    const records = await loadResourceByTyp(props.pvTypTool, "tool", "Prop_Tool");
    allTools.value = records.map(record => ({
      id: record.id,
      cls: record.cls,
      pv: record.pv,
      name: record.name,
      objLocationClsSection: record.objLocationClsSection,
      nameLocationClsSection: record.nameLocationClsSection
    }));
  } catch (error) {
    notificationStore.showNotification('Ошибка при загрузке списка инструментов', 'error');
    console.error('Ошибка загрузки инструментов:', error);
    allTools.value = [];
  } finally {
    isLoading.value = false;
  }
};

const handleLocationChange = (value) => {
  selectedTools.value = [];
};

const closeModal = () => {
  emit('close');
};

const handleOverlayClick = () => {
  closeModal();
};

const saveTools = () => {
  if (!isFormValid.value) return;

  const selectedToolData = allTools.value.filter(tool =>
    selectedTools.value.includes(tool.id)
  );

  emit('save', {
    location: selectedLocation.value.value,
    tools: selectedToolData
  });
};

const resetForm = () => {
  selectedLocation.value = null;
  selectedTools.value = [];
  allTools.value = [];
};
</script>

<style scoped>
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

.empty-tools-text {
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
