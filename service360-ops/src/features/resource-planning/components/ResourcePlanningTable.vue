<template>
  <div class="resource-edit-section">
    <div class="section-header">
      <h3 class="section-title">{{ title }}</h3>
      <button class="add-row-button" @click="addNewRow" :disabled="!canInsert || !canUpdate">
        <Plus :size="18" />
        Добавить строку
      </button>
    </div>

    <div class="table-wrapper">
      <table class="resource-table">
        <thead>
          <tr>
            <th class="name-column">{{ getColumnLabel() }}</th>
            <th v-if="showUnit" class="unit-column">Ед. измерения</th>
            <th v-if="showQuantity" class="count-column">Количество</th>
            <th v-if="showHours" class="time-column">Время, минуты</th>
            <th v-if="showVolume" class="plan-column">План</th>
            <th v-if="newRow" class="actions-column"></th>
          </tr>
        </thead>
        <tbody>
          <!-- Существующие строки -->
          <tr v-for="(row, index) in existingRows" :key="row.id || index" class="existing-row">
            <td>{{ getNameLabel(row) }}</td>
            <td v-if="showUnit">{{ getUnitLabel(row) }}</td>
            <td v-if="showQuantity">{{ row.plan || row.planCount || 0 }}</td>
            <td v-if="showHours">{{ row.hours || row.planHours || 0 }}</td>
            <td v-if="showVolume">{{ row.plan || 0 }}</td>
          </tr>

          <!-- Новая строка для добавления -->
          <tr v-if="newRow" class="new-row">
            <td>
              <AppDropdown
                :id="`new-name`"
                v-model="newRow.name"
                :options="nameOptions"
                placeholder="Выберите наименование"
              />
            </td>
            <td v-if="showUnit">
              <AppDropdown
                :id="`new-unit`"
                v-model="newRow.unit"
                :options="unitOptions"
                placeholder="Выберите ед. изм."
              />
            </td>
            <td v-if="showQuantity">
              <AppNumberInput
                v-model.number="newRow.quantity"
                :min="0"
                placeholder="0"
              />
            </td>
            <td v-if="showHours">
              <AppNumberInput
                v-model.number="newRow.hours"
                :min="0"
                placeholder="0"
              />
            </td>
            <td v-if="showVolume">
              <AppNumberInput
                v-model.number="newRow.volume"
                :min="0"
                placeholder="0"
              />
            </td>
            <td class="actions-column">
              <div class="action-buttons-wrapper">
                <button
                  :class="['icon-button', 'save']"
                  @click.stop="saveNewRow"
                  title="Сохранить"
                  :disabled="!isNewRowValid"
                >
                  <Check :size="18" />
                </button>
                <button
                  :class="['icon-button', 'delete']"
                  @click.stop="cancelNewRow"
                  title="Удалить"
                >
                  <Trash2 :size="18" />
                </button>
              </div>
            </td>
          </tr>

          <tr v-if="existingRows.length === 0 && !newRow">
            <td :colspan="getColspan()" class="empty-state">
              Нет данных для отображения.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { Plus, Check, Trash2 } from 'lucide-vue-next';
import AppDropdown from '@/shared/ui/FormControls/AppDropdown.vue';
import AppNumberInput from '@/shared/ui/FormControls/AppNumberInput.vue';

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  rows: {
    type: Array,
    default: () => []
  },
  nameOptions: {
    type: Array,
    default: () => []
  },
  unitOptions: {
    type: Array,
    default: () => []
  },
  resourceType: {
    type: String,
    default: 'materials' // materials, services, tools, equipment, personnel
  },
  canInsert: {
    type: Boolean,
    default: false
  },
  canUpdate: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['add-row']);

const newRow = ref(null);

// Вычисляемые свойства для отображения колонок
const showUnit = computed(() => props.resourceType === 'materials');
const showQuantity = computed(() => ['tools', 'equipment', 'personnel'].includes(props.resourceType));
const showHours = computed(() => ['equipment', 'personnel'].includes(props.resourceType));
const showVolume = computed(() => ['materials', 'services'].includes(props.resourceType));

const existingRows = computed(() => props.rows || []);

// Показывать ли колонку единиц измерения
const showUnitColumn = computed(() => {
  return showUnit.value && props.unitOptions && props.unitOptions.length > 0;
});

const getColumnLabel = () => {
  const labels = {
    materials: 'Наименование',
    services: 'Наименование',
    tools: 'Тип Инструмента',
    equipment: 'Тип Техники',
    personnel: 'Должность'
  };
  return labels[props.resourceType] || 'Наименование';
};

const getColspan = () => {
  let count = 1; // Наименование
  if (showUnit.value) count++;
  if (showQuantity.value) count++;
  if (showHours.value) count++;
  if (showVolume.value) count++;
  return count;
};

const getNameLabel = (row) => {
  if (props.resourceType === 'materials' || props.resourceType === 'services') {
    return row.name_text || row.name || '—';
  }
  return row.name || '—';
};

const getUnitLabel = (row) => {
  return row.unit_text || row.unit || 'ед.';
};

const createNewRow = () => {
  const row = {
    name: null,
  };
  // Добавляем unit только если нужна колонка единиц измерения
  if (showUnitColumn.value) {
    row.unit = null;
  }
  if (showVolume.value) {
    row.volume = 0;
  }
  if (showQuantity.value) {
    row.quantity = 0;
  }
  if (showHours.value) {
    row.hours = 0;
  }
  return row;
};

const addNewRow = () => {
  if (!newRow.value) {
    newRow.value = createNewRow();
  }
};

const cancelNewRow = () => {
  newRow.value = null;
};

const isNewRowValid = computed(() => {
  if (!newRow.value || !newRow.value.name) {
    return false;
  }
  // Если нужна колонка единиц измерения, проверяем что unit заполнен
  if (showUnitColumn.value && !newRow.value.unit) {
    return false;
  }
  return true;
});

const saveNewRow = () => {
  if (!isNewRowValid.value) return;

  const row = newRow.value;

  // Формируем данные для сохранения в зависимости от типа ресурса
  const rowData = {
    name: row.name,
  };

  if (showUnitColumn.value) {
    rowData.unit = row.unit;
  }

  if (showVolume.value) {
    rowData.plan = row.volume || 0;
  }

  if (showQuantity.value) {
    rowData.planCount = row.quantity || 0;
  }

  if (showHours.value) {
    rowData.planHours = row.hours || 0;
  }

  emit('add-row', rowData);
  newRow.value = null;
};
</script>

<style scoped>
.resource-edit-section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.add-row-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.add-row-button:hover:not(:disabled) {
  background: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.add-row-button:disabled {
  background: #e2e8f0;
  color: #a0aec0;
  cursor: not-allowed;
  opacity: 0.6;
}

.table-wrapper {
  overflow-x: auto;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.resource-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  background: white;
}

.resource-table thead {
  background: #f8fafc;
  border-bottom: 2px solid #e2e8f0;
}

.resource-table th {
  text-align: left;
  padding: 12px 16px;
  font-weight: 600;
  color: #64748b;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

.resource-table tbody tr {
  border-bottom: 1px solid #f1f5f9;
  transition: background-color 0.15s;
}

.resource-table tbody tr:hover:not(.new-row) {
  background: #f8fafc;
}

.resource-table td {
  padding: 12px 16px;
  color: #1e293b;
  vertical-align: middle;
}

.name-column {
  min-width: 350px;
  width: auto;
}

.unit-column {
  width: 200px;
  text-align: left;
}

.plan-column {
  width: 180px;
  text-align: left;
}

.count-column,
.time-column {
  width: 220px;
  text-align: left;
}

.actions-column {
  width: 140px;
  text-align: right;
}

.action-buttons-wrapper {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

/* Кнопки действий */
td.actions-column {
  text-align: right;
  vertical-align: middle;
}

.icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  vertical-align: middle;
  flex-shrink: 0;
}

.icon-button.save {
  background: #f3f4f6;
  color: #6b7280;
}

.icon-button.save:hover:not(:disabled) {
  background: #3b82f6;
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
}

.icon-button.save:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.icon-button.delete {
  background: #fef2f2;
  color: #dc2626;
}

.icon-button.delete:hover:not(:disabled) {
  background: #dc2626;
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(220, 38, 38, 0.3);
}

.icon-button.delete:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.empty-state {
  text-align: center;
  padding: 40px 16px !important;
  color: #94a3b8;
  font-size: 14px;
}

/* Скрываем лейблы в основной таблице */
.resource-table :deep(label) {
  display: none;
}

.resource-table :deep(.form-group) {
  margin: 0;
}

@media (max-width: 768px) {
  .resource-edit-section {
    padding: 16px;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .resource-table {
    font-size: 13px;
    table-layout: auto;
  }

  .resource-table th,
  .resource-table td {
    padding: 8px 12px;
  }

  .resource-table .name-column,
  .resource-table .unit-column,
  .resource-table .plan-column,
  .resource-table .actions-column,
  .resource-table .count-column,
  .resource-table .time-column {
    width: auto;
  }
}

@media (max-width: 480px) {
  .add-row-button {
    width: 100%;
    justify-content: center;
  }
}
</style>
