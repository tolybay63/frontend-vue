<template>
  <div class="resource-edit-section">
    <div class="section-header">
      <h3 class="section-title">{{ title }}</h3>
    </div>

    <div class="table-wrapper">
      <table class="resource-table">
        <thead>
          <tr>
            <th class="expand-column"></th>
            <th class="name-column">Наименование</th>
            <th class="count-column">Количество человек</th>
            <th class="time-column">Время</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="(row, index) in existingRowsInternal" :key="row.id || index">
            <tr class="existing-row">
              <td class="expand-column">
                <button
                  class="expand-button"
                  @click="toggleRow(index)"
                  :title="row.expanded ? 'Свернуть' : 'Развернуть'"
                >
                  <ChevronRight :size="18" :class="{ rotated: row.expanded }" />
                </button>
              </td>
              <td>{{ getNameLabel(row.name) }}</td>

              <td class="plan-fact-cell">
                <div class="plan-fact-data">
                  <span>План: {{ row.planCount }}</span>
                  <span>Факт: {{ row.factCount }}</span>
                </div>
              </td>

              <td class="plan-fact-cell">
                <div class="plan-fact-data">
                  <span>План: {{ row.planHours }}</span>
                  <span>Факт: {{ row.factHours }}</span>
                </div>
              </td>
            </tr>

            <tr v-if="row.expanded" class="expanded-row">
              <td colspan="4" class="expanded-content">
                <div class="performers-detail">
                  <div class="performers-header">
                    <span class="performers-title">Список исполнителей (Факт):</span>
                    <button 
                      class="add-row-button small" 
                      @click="openAddPerformerModal(index)"
                    >
                      <Plus :size="16" />
                      Добавить исполнителя
                    </button>
                  </div>
                  
                  <div class="performers-list">
                    <div
                      v-for="(performer, pIndex) in row.performers"
                      :key="`existing-${row.id || index}-${pIndex}`"
                      class="performer-item"
                    >
                      <div class="performer-number">{{ pIndex + 1 }}</div>
                      <div class="performer-fields">
                        <div class="performer-field">
                          <label>ФИО исполнителя</label>
                          <AppDropdown
                            :id="`performer-name-${index}-${pIndex}`"
                            v-model="performer.name"
                            :options="performerNameOptions"
                            placeholder="Выберите исполнителя"
                            @update:modelValue="updateExistingPerformer(index, pIndex, 'name', $event)"
                          />
                        </div>
                        <div class="performer-field">
                          <label>Часы работы</label>
                          <AppNumberInput
                            :modelValue="performer.time"
                            :min="0"
                            :max="row.planHours"
                            placeholder="0"
                            @update:modelValue="updateExistingPerformer(index, pIndex, 'time', $event)"
                          />
                        </div>
                        <div class="performer-actions">
                          <button
                            :class="['icon-button', 'save']"
                            @click.stop="savePerformerDetails(index, pIndex)"
                            title="Сохранить"
                          >
                            <Check :size="18" />
                          </button>
                          <button
                            :class="['icon-button', 'delete']"
                            @click.stop="deletePerformer(index, pIndex)"
                            title="Удалить исполнителя"
                          >
                            <Trash2 :size="18" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div v-if="row.performers.length === 0" class="empty-performers">
                      Нет добавленных исполнителей. Нажмите "Добавить исполнителя" для добавления.
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </template>

          <tr v-if="existingRowsInternal.length === 0">
            <td colspan="4" class="empty-state">
              Нет данных для отображения.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <AddPerformerModal
      :isOpen="isModalOpen"
      :positionPv="currentPositionPv"
      :performerNameOptions="performerNameOptions"
      @close="closeAddPerformerModal"
      @save="handleAddPerformers"
    />
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import { Check, ChevronRight, Plus, Trash2 } from 'lucide-vue-next';
import AppNumberInput from '@/shared/ui/FormControls/AppNumberInput.vue'; 
import AppDropdown from '@/shared/ui/FormControls/AppDropdown.vue'; // Раскомментировано
import AddPerformerModal from '@/features/work-log/components/AddPerformerModal.vue';
import { useNotificationStore } from '@/app/stores/notificationStore';

const props = defineProps({
  title: { type: String, required: true },
  rows: { type: Array, default: () => [] },
  nameOptions: { type: Array, default: () => [] }, // nameOptions для позиций (Бригадир, Рабочий)
  // Переименовано для соответствия oldCode.txt и сниппету
  performerNameOptions: { type: Array, default: () => [] }, // ФИО конкретных людей
});

const emit = defineEmits(['update:rows', 'save-performer', 'delete-performer', 'add-performer']);

const existingRowsInternal = ref([]);
const isModalOpen = ref(false);
const currentRowIndex = ref(null);
const currentPositionPv = ref(null);

const notificationStore = useNotificationStore();

/**
 * Данные для демонстрации одной раскрытой строки (по запросу пользователя)
 */
const DUMMY_ROWS = [
    {
      id: 'dummy-row-1',
      name: 'Рабочий',
      planCount: 8,
      planHours: 64,
      factCount: 1,
      factHours: 8,
      expanded: true, // Раскрыта по умолчанию для примера
      performers: [
        {
          id: 'performer-1',
          name: '1', // PV/Value для AppDropdown
          fullName: 'Иванов И.И.', // Отображаемое имя (не используется в редактируемом режиме, но для структуры)
          time: 8,
        },
      ],
      positionPv: 1, 
    }
];

/**
 * Рассчитывает фактические значения по количеству и часам
 * на основе детального списка исполнителей.
 */
const calculatePerformerFacts = (performers = []) => {
  const factCount = performers.length;
  // Суммируем только, если time не null/undefined
  const factHours = performers.reduce((sum, p) => sum + (p.time !== null && p.time !== undefined ? p.time : 0), 0);
  return { factCount, factHours };
};

const initializeExistingRows = (rows) => {
    return rows.map((row) => {
      const performers = row.performerDetails && row.performerDetails.length > 0 
        ? row.performerDetails
        : []; 

      // Пересчитываем факт, если нет данных factCount/factHours из API
      const { factCount, factHours } = calculatePerformerFacts(performers);

      return {
        id: row.id,
        name: row.name, // Имя позиции (Бригадир, Рабочий)
        planCount: row.plan || 0, 
        planHours: row.hours || 0, 
        // Используем fact из API, если есть, иначе пересчитываем
        factCount: row.factCount || factCount, 
        factHours: row.factHours || factHours,
        expanded: false,
        performers: performers.map(p => ({
          ...p,
          time: p.time !== null && p.time !== undefined ? p.time : 0, // Убедимся, что time - число
        })),
        positionPv: row.positionPv || null, // PV позиции
      }
    });
};

// Инициализация: если пропсы пустые, используем демонстрационные данные
existingRowsInternal.value = props.rows.length > 0 ? initializeExistingRows(props.rows) : DUMMY_ROWS;

watch(
  () => props.rows,
  (newRows) => {
    existingRowsInternal.value = initializeExistingRows(newRows);
  },
  { deep: true }
);

const getNameLabel = (value) => {
  const option = props.nameOptions.find((opt) => opt.value === value);
  return option ? option.label : value;
};

const toggleRow = (index) => {
  const row = existingRowsInternal.value[index];
  row.expanded = !row.expanded;
};

/**
 * Обновляет поля factCount и factHours в основной строке
 */
const updatePerformerFacts = (rowIndex) => {
  const row = existingRowsInternal.value[rowIndex];
  const { factCount, factHours } = calculatePerformerFacts(row.performers);
  row.factCount = factCount;
  row.factHours = factHours;
};

// --- Логика для существующих исполнителей ---

const updateExistingPerformer = (rowIndex, performerIndex, field, value) => {
  const row = existingRowsInternal.value[rowIndex];
  row.performers[performerIndex][field] = value;
  emit('update:rows', existingRowsInternal.value); 
};

const savePerformerDetails = (rowIndex, performerIndex) => {
  const row = existingRowsInternal.value[rowIndex];
  const performer = row.performers[performerIndex];
  
  updatePerformerFacts(rowIndex);
  
  emit('save-performer', {
    rowId: row.id,
    rowIndex,
    performerIndex,
    performer,
    row: existingRowsInternal.value[rowIndex],
  });
};

const deletePerformer = (rowIndex, performerIndex) => {
  const row = existingRowsInternal.value[rowIndex];
  const performer = row.performers[performerIndex];
  
  emit('delete-performer', {
    rowId: row.id,
    rowIndex,
    performerIndex,
    performerId: performer.id,
  });
  
  row.performers.splice(performerIndex, 1);
  updatePerformerFacts(rowIndex);
  emit('update:rows', existingRowsInternal.value);
};

// --- Логика модального окна ---

const openAddPerformerModal = (rowIndex) => {
  const row = existingRowsInternal.value[rowIndex];
  
  currentPositionPv.value = row.positionPv;
  currentRowIndex.value = rowIndex;
  isModalOpen.value = true;
};

const closeAddPerformerModal = () => {
  isModalOpen.value = false;
  currentRowIndex.value = null;
  currentPositionPv.value = null;
};

const handleAddPerformers = (data) => {
  if (currentRowIndex.value === null) return;

  const row = existingRowsInternal.value[currentRowIndex.value];
  
  // Создаем новых исполнителей с нулевым временем
  const newPerformers = data.performers.map(performer => ({
    id: performer.id, // ID конкретного исполнителя (ФИО)
    cls: performer.cls,
    pv: performer.pv,
    name: performer.name,
    fullName: performer.fullName,
    time: 0,
    // Дополнительные поля, если нужны
    location: data.location,
    objLocation: performer.objLocation,
    nameLocation: performer.nameLocation
  })); 
  
  // Добавляем только тех, кого еще нет в списке
  const performersToAdd = newPerformers.filter(newP => !row.performers.some(existingP => existingP.id === newP.id) );

  if (performersToAdd.length === 0) {
    notificationStore.showNotification('Все выбранные исполнители уже добавлены.', 'warning');
    return;
  }
  
  row.performers.push(...performersToAdd);
  updatePerformerFacts(currentRowIndex.value);
  emit('update:rows', existingRowsInternal.value);

  // Эмитим событие для сохранения на сервере
  emit('add-performer', {
    rowId: row.id, // ID строки позиции (Бригадир, Рабочий)
    rowIndex: currentRowIndex.value,
    performers: performersToAdd,
  });
  
  closeAddPerformerModal();
};

</script>

<style scoped>
/* Стили ниже взяты из 'oldCode.txt' и 'PerformerEditTable.vue' для обеспечения дизайна */
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

.add-row-button.small {
  padding: 6px 12px;
  font-size: 13px;
}

/* Таблица */
.table-wrapper {
  overflow-x: auto;
}

.resource-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.resource-table th,
.resource-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #e2e8f0;
  text-align: left;
}

.resource-table th {
  background: #f1f5f9;
  color: #475569;
  font-weight: 600;
  text-transform: uppercase;
  font-size: 12px;
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

/* Колонки */
.resource-table .expand-column {
  width: 5%;
  text-align: center;
}

.resource-table .name-column {
  width: 35%;
}

.resource-table .count-column,
.resource-table .time-column {
  width: 20%;
}

/* Ячейки для исполнителей с план/факт */
.plan-fact-cell {
  vertical-align: top;
  padding-top: 8px !important;
  padding-bottom: 8px !important;
}

.plan-fact-data {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 14px;
}

.plan-fact-data span:first-child {
  color: #475569;
}

.plan-fact-data span:last-child {
  font-weight: 600;
  color: #1e293b;
}

/* Кнопка раскрытия */
.expand-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
  color: #64748b;
}

.expand-button svg {
  transition: transform 0.2s;
}

.expand-button svg.rotated {
  transform: rotate(90deg);
}

/* Раскрывающаяся секция */
.expanded-row {
  background: #f8fafc;
}

.expanded-row:hover {
  background: #f8fafc;
}

.expanded-row td[colspan="4"] {
  padding: 16px !important;
}

.expanded-content {
  padding: 0 !important;
}

.performers-detail {
  background: white;
  border-radius: 8px;
  padding: 20px;
  border: 1px solid #e2e8f0;
}

.performers-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 2px solid #e2e8f0;
}

.performers-title {
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
}

.performers-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.performer-item {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  padding: 16px 0;
  border-bottom: 1px dashed #e2e8f0;
}

.performer-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.performer-number {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: #64748b;
  font-size: 13px;
  margin-top: 5px;
}

.performer-fields {
  display: grid;
  grid-template-columns: 2fr 1fr 100px; /* ФИО, Часы, Действия */
  gap: 20px;
  flex-grow: 1;
}

.performer-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.performer-field label {
  font-size: 12px;
  color: #475569;
  font-weight: 500;
  letter-spacing: 0.5px;
}

.performer-actions {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding-bottom: 2px;
}

/* Кнопки действий */
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

.empty-state, .empty-performers {
  text-align: center;
  padding: 40px 16px !important;
  color: #94a3b8;
  font-size: 14px;
}

/* Адаптивные стили */
@media (max-width: 1024px) {
  .performer-fields {
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  .performer-actions {
    grid-column: 1 / -1;
    justify-content: flex-start;
    padding-bottom: 0;
    padding-top: 8px;
  }
  
  .performer-number {
    margin-top: 0;
  }
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
  .resource-table .count-column,
  .resource-table .time-column,
  .resource-table .expand-column {
    width: auto;
  }

  .performers-detail {
    padding: 16px;
  }
}
</style>