<template>
  <div class="resource-edit-section">
    <div class="section-header">
      <h3 class="section-title">{{ title }}</h3>
      <button class="add-row-button" @click="addNewRow">
        <Plus :size="18" />
        Добавить строку
      </button>
    </div>

    <div class="table-wrapper">
      <table class="resource-table">
        <thead>
          <tr>
            <th class="name-column">Наименование</th>
            <th class="unit-column">Ед. измерения</th>
            <th class="plan-column">План</th>
            <th class="fact-column">Факт</th>
            <th class="actions-column"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, index) in rows" :key="row.id || index" class="existing-row">
            <td>{{ getNameLabel(row.name) }}</td>
            <td>{{ getUnitLabel(row.unit) }}</td>
            <td>{{ row.plan }}</td>
            <td class="fact-input-cell">
              <AppNumberInput
                :modelValue="row.fact"
                :min="0"
                placeholder="0"
                @update:modelValue="updateExistingRow(index, $event)"
                @click.stop
                @mousedown.stop
              />
            </td>
            <td class="actions-column">
              <div class="action-buttons-wrapper">
                <button
                  :class="['icon-button', 'save']"
                  @click.stop="saveFact(index)"
                  title="Сохранить факт"
                >
                  <Check :size="18" />
                </button>
                <button
                  :class="['icon-button', 'delete']"
                  title="Удаление плановых записей не предусмотрено"
                  disabled
                >
                  <Trash2 :size="18" />
                </button>
              </div>
            </td>
          </tr>

          <tr v-if="newRow" class="new-row">
            <td>
              <AppDropdown
                :id="`new-name`"
                v-model="newRow.name"
                :options="nameOptions"
                placeholder="Выберите наименование"
              />
            </td>
            <td>
              <AppDropdown
                :id="`new-unit`"
                v-model="newRow.unit"
                :options="unitOptions"
                placeholder="Выберите ед. изм."
              />
            </td>
            <td class="plan-empty">—</td>
            <td>
              <AppNumberInput
                :modelValue="newRow.fact"
                :min="0"
                placeholder="0"
                @update:modelValue="newRow.fact = $event"
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

          <tr v-if="rows.length === 0 && !newRow">
            <td colspan="5" class="empty-state">
              Нет данных для отображения.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import { Check, Plus, Trash2 } from 'lucide-vue-next';
import AppNumberInput from '@/shared/ui/FormControls/AppNumberInput.vue';
import AppDropdown from '@/shared/ui/FormControls/AppDropdown.vue';

const props = defineProps({
  title: { type: String, required: true },
  rows: { type: Array, default: () => [] },
  nameOptions: { type: Array, default: () => [] },
  unitOptions: { type: Array, default: () => [] },
});

const emit = defineEmits(['update:rows', 'save-row', 'add-row', 'delete-row']);

const newRow = ref(null);

// --- Вспомогательные функции для отображения ---

const getNameLabel = (value) => {
  const option = props.nameOptions.find((opt) => opt.value === value);
  // Используем name_text, если он есть, для существующих строк,
  // иначе пытаемся найти по value или просто возвращаем value
  return props.rows.find(r => r.name === value)?.name_text || option?.label || value;
};

const getUnitLabel = (value) => {
  const option = props.unitOptions.find((opt) => opt.value === value);
  return props.rows.find(r => r.unit === value)?.unit_text || option?.label || value;
};

// --- Логика редактирования существующей строки ---

const updateExistingRow = (index, value) => {
  // Копируем, чтобы избежать мутации пропсов напрямую
  const updatedRows = [...props.rows];
  updatedRows[index].fact = value;
  emit('update:rows', updatedRows);
};

const saveFact = (index) => {
  emit('save-row', {
    index,
    row: props.rows[index],
    isExisting: true,
  });
};

// --- Логика добавления новой строки ---

const addNewRow = () => {
  if (!newRow.value) {
    newRow.value = {
      name: null,
      unit: null,
      fact: 0,
    };
  }
};

const isNewRowValid = computed(() => {
  // Для добавления нужен выбранный материал/услуга и единица измерения
  return newRow.value && newRow.value.name && newRow.value.unit;
});

const saveNewRow = () => {
  if (!isNewRowValid.value) return;

  emit('add-row', {
    ...newRow.value,
    fact: newRow.value.fact || 0,
  });

  newRow.value = null;
};

const cancelNewRow = () => {
  newRow.value = null;
};
</script>

<style scoped>
/* Стили из ResourceEditTable.vue, адаптированные для ResourceFactTable.vue */
.resource-edit-section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
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
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #eff6ff;
  color: #3b82f6;
  border: 1px solid #3b82f6;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.add-row-button:hover:not(:disabled) {
  background: #dbeafe;
  border-color: #2563eb;
}

.add-row-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.table-wrapper {
  overflow-x: auto;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.resource-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  table-layout: fixed;
}

.resource-table thead {
  background: #f9fafb;
}

.resource-table th {
  padding: 12px 16px;
  text-align: left;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  border-bottom: 1px solid #e2e8f0;
}

.resource-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
}

.resource-table tbody tr:last-child td {
  border-bottom: none;
}

.existing-row {
  background: #ffffff;
}

.existing-row:hover {
  background: #f9fafb;
}

.plan-empty {
  text-align: center;
  color: #94a3b8;
}

/* Колонки */
.resource-table .name-column {
  width: 40%;
}

.resource-table .unit-column {
  width: 15%;
}

.resource-table .plan-column,
.resource-table .fact-column {
  width: 15%;
}

.resource-table .actions-column {
  width: 15%;
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

.icon-button.delete:hover {
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

  .add-row-button {
    width: 100%;
    justify-content: center;
  }
}
</style>