<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="close">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Завершение задачи</h2>
        <button class="close-button" @click="close">&times;</button>
      </div>
      <div class="modal-body">
        <h3 class="summary-title">Свод по фактическим ресурсам</h3>
        <p class="modal-description">Проверьте заполненные данные перед завершением задачи</p>

        <!-- Свод по ресурсам -->
        <div class="resources-summary">
          <!-- Материалы -->
          <div v-if="resources.materials && resources.materials.length > 0" class="resource-section">
            <div class="section-header">Материалы</div>
            <div class="resource-table">
              <div v-for="item in resources.materials" :key="item.id" class="table-row">
                <span class="table-cell">{{ item.name_text }}</span>
                <span class="table-cell value">{{ item.fact }} {{ item.unit_text }}</span>
              </div>
            </div>
          </div>

          <!-- Инструменты -->
          <div v-if="flattenedTools.length > 0" class="resource-section">
            <div class="section-header">Инструменты</div>
            <div class="resource-table">
              <div v-for="tool in flattenedTools" :key="tool.complexId" class="table-row">
                <span class="table-cell" :title="tool.fullName">{{ tool.displayName }}</span>
                <span class="table-cell value">{{ tool.quantity }} шт</span>
              </div>
            </div>
          </div>

          <!-- Техника -->
          <div v-if="flattenedEquipment.length > 0" class="resource-section">
            <div class="section-header">Техника</div>
            <div class="resource-table">
              <div v-for="equipment in flattenedEquipment" :key="equipment.complexId" class="table-row">
                <span class="table-cell" :title="equipment.fullName">{{ equipment.displayName }}</span>
                <span class="table-cell value">{{ equipment.time }} час</span>
              </div>
            </div>
          </div>

          <!-- Услуги сторонних организаций -->
          <div v-if="resources.services && resources.services.length > 0" class="resource-section">
            <div class="section-header">Услуги сторонних организаций</div>
            <div class="resource-table">
              <div v-for="item in resources.services" :key="item.id" class="table-row">
                <span class="table-cell">{{ item.name }}</span>
                <span class="table-cell value">{{ item.fact }} {{ item.unit }}</span>
              </div>
            </div>
          </div>

          <!-- Исполнители -->
          <div v-if="resources.performers && resources.performers.length > 0" class="resource-section">
            <div class="section-header">Исполнители</div>
            <div class="resource-table">
              <div v-for="item in resources.performers" :key="item.id">
                <div v-for="performer in item.performerDetails" :key="performer.complexId" class="table-row">
                  <span class="table-cell">{{ performer.fullName }} ({{ item.name }})</span>
                  <span class="table-cell value">{{ performer.time }} час</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <AppNumberInput
          label="Фактический объем"
          id="actualVolume"
          v-model="actualVolume"
          :min="0"
          :step="1"
          :required="true"
          class="volume-input"
        />
        <AppInput
          label="Комментарий"
          id="reasonDeviation"
          v-model="reasonDeviation"
          placeholder="Укажите причину отклонения от плана"
          type="textarea"
          class="reason-input"
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
import AppNumberInput from '@/shared/ui/FormControls/AppNumberInput.vue';
import AppInput from '@/shared/ui/FormControls/AppInput.vue';

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  maxVolume: {
    type: Number,
    default: Infinity,
  },
  resources: {
    type: Object,
    default: () => ({
      materials: [],
      tools: [],
      equipment: [],
      services: [],
      performers: []
    })
  }
});

const emit = defineEmits(['close', 'confirm']);

const actualVolume = ref(null);
const reasonDeviation = ref('');

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    actualVolume.value = props.maxVolume === Infinity ? null : props.maxVolume; // Предзаполнить плановым объемом
    reasonDeviation.value = ''; // Очистить комментарий при открытии
  }
});

const isVolumeValid = computed(() => {
  const val = actualVolume.value;
  return val !== null && val >= 0;
});

// Функция для обрезки длинных названий
const truncateName = (name, maxLength = 50) => {
  if (!name) return '';
  return name.length > maxLength ? name.substring(0, maxLength) + '...' : name;
};

// Развернутый список инструментов с их деталями
const flattenedTools = computed(() => {
  const tools = [];
  if (props.resources.tools) {
    props.resources.tools.forEach(toolGroup => {
      if (toolGroup.toolDetails && toolGroup.toolDetails.length > 0) {
        toolGroup.toolDetails.forEach(tool => {
          const typeName = toolGroup.name || '';
          const toolName = tool.name || '';
          const fullName = `${toolName} (${typeName})`;
          tools.push({
            complexId: tool.complexId,
            fullName: fullName,
            displayName: truncateName(fullName),
            quantity: tool.quantity || 1
          });
        });
      }
    });
  }
  return tools;
});

// Развернутый список техники с их деталями
const flattenedEquipment = computed(() => {
  const equipment = [];
  if (props.resources.equipment) {
    props.resources.equipment.forEach(equipmentGroup => {
      if (equipmentGroup.equipmentDetails && equipmentGroup.equipmentDetails.length > 0) {
        equipmentGroup.equipmentDetails.forEach(item => {
          const typeName = equipmentGroup.name || '';
          const equipmentName = item.name || '';
          const fullName = `${equipmentName} (${typeName})`;
          equipment.push({
            complexId: item.complexId,
            fullName: fullName,
            displayName: truncateName(fullName),
            time: item.time || 0
          });
        });
      }
    });
  }
  return equipment;
});

const close = () => {
  emit('close');
};

const confirm = () => {
  if (isVolumeValid.value) {
    emit('confirm', actualVolume.value, reasonDeviation.value);
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
  max-width: 700px;
  max-height: 90vh;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  display: flex;
  flex-direction: column;
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
  overflow-y: auto;
  flex: 1;
}

.summary-title {
  font-size: 16px;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 8px 0;
}

.modal-description {
  margin-bottom: 20px;
  color: #4a5568;
  font-size: 14px;
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

.resources-summary {
  margin-bottom: 24px;
}

.resource-section {
  margin-bottom: 16px;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
}

.resource-section:last-child {
  margin-bottom: 0;
}

.section-header {
  font-size: 14px;
  font-weight: 600;
  color: #2d3748;
  background: #f7fafc;
  padding: 12px 16px;
  border-bottom: 1px solid #e2e8f0;
}

.resource-table {
  display: flex;
  flex-direction: column;
}

.table-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e2e8f0;
  font-size: 14px;
}

.table-row:last-child {
  border-bottom: none;
}

.table-row:hover {
  background: #f7fafc;
}

.table-cell {
  color: #4a5568;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.table-cell.value {
  color: #2d3748;
  font-weight: 600;
  white-space: nowrap;
  text-align: right;
  flex: 0 0 auto;
  margin-left: 16px;
}

.volume-input {
  margin-top: 20px;
}

.reason-input {
  margin-top: 16px;
}

/* Tablet styles */
@media (max-width: 768px) {
  .modal-overlay {
    padding: 12px;
  }

  .modal-content {
    max-width: 100%;
    max-height: 92vh;
  }
}

/* Mobile styles */
@media (max-width: 640px) {
  .modal-overlay {
    padding: 0;
    align-items: flex-end;
  }

  .modal-content {
    width: 100%;
    max-width: 100%;
    max-height: 95vh;
    border-radius: 16px 16px 0 0;
  }

  .modal-header {
    padding: 16px 20px;
  }

  .modal-header h2 {
    font-size: 18px;
  }

  .modal-body {
    padding: 16px 20px;
  }

  .modal-footer {
    flex-direction: column-reverse;
    gap: 10px;
  }

  .cancel-button,
  .confirm-button {
    width: 100%;
    padding: 12px 16px;
  }

  .summary-title {
    font-size: 15px;
  }

  .section-header {
    font-size: 13px;
    padding: 10px 12px;
  }

  .table-row {
    flex-direction: column;
    align-items: flex-start;
    padding: 10px 12px;
    gap: 4px;
  }

  .table-cell.value {
    text-align: left;
    margin-left: 0;
  }
}
</style>