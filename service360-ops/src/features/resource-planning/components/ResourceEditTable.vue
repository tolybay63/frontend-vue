<template>
  <div class="resource-edit-section">
    <div class="section-header">
      <h3 class="section-title">{{ title }}</h3>
      <!-- Кнопка "Добавить строку" для не-исполнителей, кроме инструментов и техники -->
      <button v-if="!isPerformer && !isTool && !isEquipment" class="add-row-button" @click="addNewRow">
        <Plus :size="18" />
        Добавить строку
      </button>
    </div>

    <div class="table-wrapper">
      <table class="resource-table">
        <thead>
          <tr>
            <th v-if="isPerformer || isTool || isEquipment" class="expand-column"></th>
            <th class="name-column">Наименование</th>
            <th v-if="!isPerformer && !isTool && !isEquipment" class="unit-column">Ед. измерения</th>
            <th v-if="isPerformer" class="count-column">Количество человек</th>
            <th v-if="isTool || isEquipment" class="count-column">Количество</th>
            <th v-if="isPerformer || isEquipment" class="time-column">Время</th>
            <th v-if="!isPerformer && !isTool && !isEquipment" class="plan-column">План</th>
            <th v-if="!isPerformer && !isTool && !isEquipment" class="fact-column">Факт</th>
            <th v-if="!isPerformer && !isTool && !isEquipment" class="actions-column"></th>
          </tr>
        </thead>
        <tbody>
          <!-- Существующие строки -->
          <template v-for="(row, index) in existingRows" :key="row.id || index">
            <tr class="existing-row">
              <td v-if="isPerformer || isTool || isEquipment" class="expand-column">
                <button
                  class="expand-button"
                  @click="toggleRow(index)"
                  :title="row.expanded ? 'Свернуть' : 'Развернуть'"
                >
                  <ChevronRight :size="18" :class="{ rotated: row.expanded }" />
                </button>
              </td>
              <!-- Наименование -->
              <td>{{ getNameLabel(row.name) }}</td>

              <!-- Обычные ресурсы (материалы, услуги): Ед. изм., План, Факт, Действия -->
              <td v-if="!isPerformer && !isTool && !isEquipment">{{ row.unit_text || row.unit || 'ед.' }}</td>
              <td v-if="!isPerformer && !isTool && !isEquipment">{{ row.plan }}</td>
              <td v-if="!isPerformer && !isTool && !isEquipment" class="fact-input-cell">
                <AppNumberInput
                  :modelValue="row.fact"
                  :min="0"
                  placeholder="0"
                  @update:modelValue="updateExistingRow(index, $event)"
                  @click.stop
                  @mousedown.stop
                />
              </td>
              <td v-if="!isPerformer && !isTool && !isEquipment" class="actions-column">
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

              <!-- Исполнители, Инструменты, Техника: Количество (План/Факт) -->
              <td v-if="isPerformer || isTool || isEquipment" class="plan-fact-cell">
                <div class="plan-fact-data">
                  <span>План: {{ row.planCount }}</span>
                  <span>Факт: {{ row.factCount }}</span>
                </div>
              </td>

              <!-- Исполнители, Техника: Время (План/Факт) -->
              <td v-if="isPerformer || isEquipment" class="plan-fact-cell">
                <div class="plan-fact-data">
                  <span>План: {{ row.planHours }}</span>
                  <span>Факт: {{ row.factHours }}</span>
                </div>
              </td>
            </tr>

            <!-- Раскрывающаяся секция для исполнителей -->
            <tr v-if="isPerformer && row.expanded" class="expanded-row">
              <td colspan="4" class="expanded-content">
                <div class="performers-detail">
                  <div class="performers-header">
                    <span class="performers-title">Список исполнителей (Факт):</span>
                    <button
                      class="add-row-button small"
                      @click="openAddPerformerModal(index)"
                    >
                      <Plus :size="16" />
                      Добавить строку
                    </button>
                  </div>

                  <div class="performers-list">
                    <!-- Список существующих исполнителей -->
                    <div
                      v-for="(performer, pIndex) in row.performers"
                      :key="`existing-${row.id || index}-${pIndex}`"
                      class="performer-item"
                    >
                      <div class="performer-number">{{ pIndex + 1 }}</div>
                      <div class="performer-fields">
                        <div class="performer-field">
                          <AppInput
                            :id="`performer-name-${index}-${pIndex}`"
                            label="ФИО исполнителя"
                            :modelValue="performer.fullName"
                            disabled
                            placeholder="ФИО исполнителя"
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
                      Нет добавленных исполнителей. Нажмите "Добавить строку" для добавления.
                    </div>
                  </div>
                </div>
              </td>
            </tr>

            <!-- Раскрывающаяся секция для инструментов -->
            <tr v-if="isTool && row.expanded" class="expanded-row">
              <td colspan="3" class="expanded-content">
                <div class="performers-detail">
                  <div class="performers-header">
                    <span class="performers-title">Список инструментов (Факт):</span>
                    <button
                      class="add-row-button small"
                      @click="openAddResourceModal(index)"
                    >
                      <Plus :size="16" />
                      Добавить строку
                    </button>
                  </div>

                  <div class="performers-list">
                    <!-- Список существующих единиц инструментов -->
                    <div
                      v-for="(detail, dIndex) in row.details"
                      :key="`existing-${row.id || index}-${dIndex}`"
                      class="performer-item"
                    >
                      <div class="performer-number">{{ dIndex + 1 }}</div>
                      <div class="performer-fields">
                        <div class="performer-field">
                          <AppInput
                            :id="`resource-name-${index}-${dIndex}`"
                            label="Инвентарный номер"
                            :modelValue="detail.inventoryNumber || detail.name"
                            disabled
                            placeholder="Инвентарный номер"
                          />
                        </div>
                        <div class="performer-field">
                          <label>Количество</label>
                          <AppNumberInput
                            :modelValue="detail.quantity"
                            :min="0"
                            placeholder="0"
                            @update:modelValue="updateExistingDetail(index, dIndex, 'quantity', $event)"
                          />
                        </div>
                        <div class="performer-actions">
                          <button
                            :class="['icon-button', 'save']"
                            @click.stop="saveResourceDetails(index, dIndex)"
                            title="Сохранить"
                          >
                            <Check :size="18" />
                          </button>
                          <button
                            :class="['icon-button', 'delete']"
                            @click.stop="deleteResourceDetail(index, dIndex)"
                            title="Удалить инструмент"
                          >
                            <Trash2 :size="18" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div v-if="row.details.length === 0" class="empty-performers">
                      Нет добавленных инструментов. Нажмите "Добавить строку" для добавления.
                    </div>
                  </div>
                </div>
              </td>
            </tr>

            <!-- Раскрывающаяся секция для техники -->
            <tr v-if="isEquipment && row.expanded" class="expanded-row">
              <td colspan="4" class="expanded-content">
                <div class="performers-detail">
                  <div class="performers-header">
                    <span class="performers-title">Список техники (Факт):</span>
                    <button
                      class="add-row-button small"
                      @click="openAddResourceModal(index)"
                    >
                      <Plus :size="16" />
                      Добавить строку
                    </button>
                  </div>

                  <div class="performers-list">
                    <!-- Список существующих единиц техники -->
                    <div
                      v-for="(detail, dIndex) in row.details"
                      :key="`existing-${row.id || index}-${dIndex}`"
                      class="performer-item"
                    >
                      <div class="performer-number">{{ dIndex + 1 }}</div>
                      <div class="performer-fields">
                        <div class="performer-field">
                          <AppInput
                            :id="`resource-name-${index}-${dIndex}`"
                            label="Гос. номер / ID"
                            :modelValue="detail.inventoryNumber || detail.name"
                            disabled
                            placeholder="Гос. номер"
                          />
                        </div>
                        <div class="performer-field">
                          <label>Часы работы</label>
                          <AppNumberInput
                            :modelValue="detail.time"
                            :min="0"
                            placeholder="0"
                            @update:modelValue="updateExistingDetail(index, dIndex, 'time', $event)"
                          />
                        </div>
                        <div class="performer-actions">
                          <button
                            :class="['icon-button', 'save']"
                            @click.stop="saveResourceDetails(index, dIndex)"
                            title="Сохранить"
                          >
                            <Check :size="18" />
                          </button>
                          <button
                            :class="['icon-button', 'delete']"
                            @click.stop="deleteResourceDetail(index, dIndex)"
                            title="Удалить технику"
                          >
                            <Trash2 :size="18" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div v-if="row.details.length === 0" class="empty-performers">
                      Нет добавленной техники. Нажмите "Добавить строку" для добавления.
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </template>

          <!-- Новая строка для добавления (только для не-исполнителей) -->
          <tr v-if="newRow && !isPerformer" class="new-row">
            <td>
              <AppDropdown
                :id="`new-name`"
                v-model="newRow.name"
                :options="nameOptions"
                placeholder="Выберите наименование"
              />
            </td>
            <td v-if="showUnitColumn">
              <AppDropdown
                :id="`new-unit`"
                v-model="newRow.unit"
                :options="unitOptions"
                placeholder="Выберите ед. изм."
              />
            </td>
            <td v-else class="unit-empty">—</td>
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

          <tr v-if="existingRows.length === 0 && !newRow">
            <td :colspan="isPerformer ? 4 : 5" class="empty-state">
              Нет данных для отображения.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <AddPerformerModal
      v-if="isPerformer"
      :isOpen="isModalOpen"
      :positionPv="currentPositionPv"
      @close="closeAddPerformerModal"
      @save="handleAddPerformers"
    />
    <AddToolModal
      v-if="isTool"
      :isOpen="isModalOpen"
      :pvTypTool="currentPositionPv"
      @close="closeAddResourceModal"
      @save="handleAddTools"
    />
    <AddEquipmentModal
      v-if="isEquipment"
      :isOpen="isModalOpen"
      :pvTypEquipment="currentPositionPv"
      @close="closeAddResourceModal"
      @save="handleAddEquipments"
    />
    <ConfirmationModal
      v-if="showDeleteConfirmation"
      :title="isPerformer ? 'Удаление исполнителя' : (isTool ? 'Удаление инструмента' : 'Удаление техники')"
      :message="isPerformer ? 'Вы уверены, что хотите удалить этого исполнителя?' : (isTool ? 'Вы уверены, что хотите удалить этот инструмент?' : 'Вы уверены, что хотите удалить эту технику?')"
      @confirm="confirmDeletePerformer"
      @cancel="cancelDeletePerformer"
    />
  </div>
</template>

<script setup>
import { ref, watch, computed, onMounted } from 'vue';
import { Check, ChevronRight, Plus, Trash2 } from 'lucide-vue-next';
import AppNumberInput from '@/shared/ui/FormControls/AppNumberInput.vue';
import AppDropdown from '@/shared/ui/FormControls/AppDropdown.vue';
import AppInput from '@/shared/ui/FormControls/AppInput.vue';
import AddPerformerModal from '@/features/work-log/components/AddPerformerModal.vue';
import AddToolModal from '@/features/work-log/components/AddToolModal.vue';
import AddEquipmentModal from '@/features/work-log/components/AddEquipmentModal.vue';
import ConfirmationModal from '@/shared/ui/ConfirmationModal.vue';
import { loadMaterials, loadUnits } from '@/shared/api/repairs/repairApi';
import { useNotificationStore } from '@/app/stores/notificationStore';

const props = defineProps({
  title: { type: String, required: true },
  rows: { type: Array, default: () => [] },
  nameOptions: { type: Array, default: () => [] },
  unitOptions: { type: Array, default: () => [] },
  isPerformer: { type: Boolean, default: false },
  isTool: { type: Boolean, default: false },
  isEquipment: { type: Boolean, default: false },
  performerNameOptions: { type: Array, default: () => [] },
});

const emit = defineEmits(['update:rows', 'save-row', 'add-row', 'save-performer', 'delete-performer', 'add-performer', 'save-resource', 'delete-resource']);

const existingRows = ref([]);
const newRow = ref(null);
const nameOptionsInternal = ref([]);
const unitOptionsInternal = ref([]);

const isModalOpen = ref(false);
const currentRowIndex = ref(null);
const currentPositionPv = ref(null);

// Для подтверждения удаления
const showDeleteConfirmation = ref(false);
const pendingDeleteData = ref(null);

// Показывать ли колонку единиц измерения (только если unitOptions передан и не пустой)
const showUnitColumn = computed(() => {
  return !props.isPerformer && props.unitOptions && props.unitOptions.length > 0;
});

/**
 * Рассчитывает фактические значения по количеству и часам
 * на основе детального списка исполнителей.
 */
const calculatePerformerFacts = (performers = []) => {
  const factCount = performers.length;
  const factHours = performers.reduce((sum, p) => sum + (p.time || 0), 0);
  return { factCount, factHours };
};

const initializeExistingRows = (rows) => {
  if (props.isPerformer) {
    return rows.map((row) => {
      const performers = row.performerDetails && row.performerDetails.length > 0
        ? row.performerDetails
        : [];

      const { factCount, factHours } = calculatePerformerFacts(performers);

      return {
        id: row.id,
        name: row.name,
        planCount: row.plan || 0,
        planHours: row.hours || 0,
        factCount: row.factCount || factCount,
        factHours: row.factHours || factHours,
        expanded: false,
        performers: performers,
        positionPv: row.positionPv || null, // PV позиции для загрузки исполнителей
      };
    });
  } else if (props.isTool) {
    return rows.map((row) => {
      const details = row.toolDetails || [];
      const factCount = details.length;

      return {
        id: row.id,
        name: row.name,
        planCount: row.planCount || 0,
        factCount: row.factCount || factCount,
        expanded: false,
        details: details,
        typPv: row.typToolPv,
      };
    });
  } else if (props.isEquipment) {
    return rows.map((row) => {
      const details = row.equipmentDetails || [];
      const { factCount, factHours } = calculatePerformerFacts(details);

      return {
        id: row.id,
        name: row.name,
        planCount: row.planCount || 0,
        planHours: row.planHours || 0,
        factCount: row.factCount || factCount,
        factHours: row.factHours || factHours,
        expanded: false,
        details: details,
        typPv: row.typEquipmentPv,
      };
    });
  } else {
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      unit: row.unit,
      unit_text: row.unit_text,
      plan: row.plan,
      fact: row.fact,
      idValue: row.idValue,
      idUser: row.idUser,
      idUpdatedAt: row.idUpdatedAt,
    }));
  }
};

watch(() => props.rows, (newRows) => {
  // Сохраняем состояние expanded и несохраненных элементов перед обновлением
  const expandedStates = new Map();
  const unsavedPerformers = new Map();
  const unsavedDetails = new Map();

  existingRows.value.forEach((row) => {
    if (row.expanded) {
      expandedStates.set(row.id, true);
    }

    // Сохраняем несохраненных исполнителей (isNew === true)
    if (props.isPerformer && row.performers && Array.isArray(row.performers)) {
      const unsaved = row.performers.filter(p => p.isNew === true);
      if (unsaved.length > 0) {
        unsavedPerformers.set(row.id, unsaved);
      }
    }

    // Сохраняем несохраненные детали инструментов/техники (isNew === true)
    if ((props.isTool || props.isEquipment) && row.details && Array.isArray(row.details)) {
      const unsaved = row.details.filter(d => d.isNew === true);
      if (unsaved.length > 0) {
        unsavedDetails.set(row.id, unsaved);
      }
    }
  });

  // Обновляем данные
  existingRows.value = initializeExistingRows(newRows);

  // Восстанавливаем состояние expanded и несохраненных элементов
  existingRows.value.forEach((row) => {
    if (expandedStates.has(row.id)) {
      row.expanded = true;
    }

    // Восстанавливаем несохраненных исполнителей
    if (props.isPerformer && unsavedPerformers.has(row.id)) {
      const unsaved = unsavedPerformers.get(row.id);

      // Фильтруем дубликаты - добавляем только тех исполнителей, которых еще нет
      // Проверяем по id и pv исполнителя
      const existingPerformerKeys = new Set(
        row.performers.map(p => `${p.id}_${p.pv}`)
      );

      const uniqueUnsaved = unsaved.filter(p =>
        !existingPerformerKeys.has(`${p.id}_${p.pv}`)
      );

      if (uniqueUnsaved.length > 0) {
        row.performers = [...row.performers, ...uniqueUnsaved];

        // Пересчитываем факты
        const { factCount, factHours } = calculatePerformerFacts(row.performers);
        row.factCount = factCount;
        row.factHours = factHours;
      }
    }

    // Восстанавливаем несохраненные детали инструментов/техники
    if ((props.isTool || props.isEquipment) && unsavedDetails.has(row.id)) {
      const unsaved = unsavedDetails.get(row.id);

      // Фильтруем дубликаты - добавляем только те детали, которых еще нет
      // Проверяем по id и pv
      const existingDetailKeys = new Set(
        row.details.map(d => `${d.id}_${d.pv || ''}`)
      );

      const uniqueUnsaved = unsaved.filter(d =>
        !existingDetailKeys.has(`${d.id}_${d.pv || ''}`)
      );

      if (uniqueUnsaved.length > 0) {
        row.details = [...row.details, ...uniqueUnsaved];

        // Пересчитываем факты
        if (props.isTool) {
          // Для инструментов только количество
          row.factCount = row.details.length;
        } else {
          // Для техники - количество и часы
          const { factCount, factHours } = calculatePerformerFacts(row.details);
          row.factCount = factCount;
          row.factHours = factHours;
        }
      }
    }
  });
}, { immediate: true, deep: true });

const toggleRow = (index) => {
  existingRows.value[index].expanded = !existingRows.value[index].expanded;
};

// Открытие модалки добавления исполнителей
const openAddPerformerModal = (index) => {
  currentRowIndex.value = index;
  const row = existingRows.value[index];
  currentPositionPv.value = row.positionPv;
  isModalOpen.value = true;
};

// Закрытие модалки
const closeAddPerformerModal = () => {
  isModalOpen.value = false;
  currentRowIndex.value = null;
  currentPositionPv.value = null;
};

// Обработка добавления исполнителей из модалки
const handleAddPerformers = ({ location, performers }) => {
  if (currentRowIndex.value === null) return;

  const rowIndex = currentRowIndex.value;
  const row = existingRows.value[rowIndex];

  // Добавляем новых исполнителей в массив performers на фронте
  // Формируем объекты исполнителей с полями, необходимыми для отображения
  const newPerformers = performers.map(performer => ({
    id: performer.id,
    cls: performer.cls,
    pv: performer.pv,
    fullName: performer.fullName,
    name: performer.name,
    fvPosition: performer.fvPosition,
    pvPosition: performer.pvPosition,
    namePosition: performer.namePosition,
    objLocation: performer.objLocation,
    pvLocation: performer.pvLocation,
    nameLocation: performer.nameLocation,
    time: 0, // Изначально часы работы = 0
    isNew: true, // Флаг, что это новый исполнитель (еще не сохранен на бэке)
  }));

  // Добавляем новых исполнителей к существующим
  row.performers = [...row.performers, ...newPerformers];

  // Пересчитываем факты
  const { factCount, factHours } = calculatePerformerFacts(row.performers);
  row.factCount = factCount;
  row.factHours = factHours;

  // Закрываем модалку
  closeAddPerformerModal();

  // Уведомление (опционально)
  const notificationStore = useNotificationStore();
  notificationStore.showNotification(
    `Добавлено исполнителей: ${newPerformers.length}. Не забудьте сохранить их данные.`,
    'success'
  );
};

const updateExistingRow = (index, value) => {
  existingRows.value[index].fact = value;
};

const updateExistingPerformer = (rowIndex, performerIndex, field, value) => {
  const performer = existingRows.value[rowIndex].performers[performerIndex];
  performer[field] = value;

  // Пересчитываем факты при изменении часов работы
  if (field === 'time') {
    const row = existingRows.value[rowIndex];
    const { factCount, factHours } = calculatePerformerFacts(row.performers);
    row.factCount = factCount;
    row.factHours = factHours;
  }
};

const getNameLabel = (value) => {
  if (props.isPerformer) return value;

  const option = nameOptionsInternal.value.find(opt => opt.value === value);
  return option ? option.label : value;
};

const saveFact = (index) => {
  const row = existingRows.value[index];
  emit('save-row', { row });
};

const savePerformerDetails = (rowIndex, performerIndex) => {
  const row = existingRows.value[rowIndex];
  const performer = row.performers[performerIndex];
  
  emit('save-performer', {
    rowId: row.id,
    performer: performer,
    performerIndex: performerIndex
  });
};

const deletePerformer = (rowIndex, performerIndex) => {
  const row = existingRows.value[rowIndex];
  const performer = row.performers[performerIndex];

  // Если это новый исполнитель (еще не сохранен на бэке), просто удаляем из массива
  if (performer.isNew) {
    row.performers.splice(performerIndex, 1);

    // Пересчитываем факты
    const { factCount, factHours } = calculatePerformerFacts(row.performers);
    row.factCount = factCount;
    row.factHours = factHours;

    const notificationStore = useNotificationStore();
    notificationStore.showNotification('Исполнитель удален.', 'success');
  } else {
    // Если исполнитель уже сохранен, показываем модальное окно подтверждения
    pendingDeleteData.value = { rowIndex, performerIndex, row, performer };
    showDeleteConfirmation.value = true;
  }
};

const confirmDeletePerformer = () => {
  if (!pendingDeleteData.value) return;

  // Проверяем, что удаляем: исполнителя или ресурс (инструмент/техника)
  if (pendingDeleteData.value.performer) {
    // Удаление исполнителя
    const { row, performer, performerIndex } = pendingDeleteData.value;

    emit('delete-performer', {
      rowId: row.id,
      performer: performer,
      performerIndex: performerIndex
    });
  } else if (pendingDeleteData.value.detail) {
    // Удаление инструмента или техники
    const { detail } = pendingDeleteData.value;

    emit('delete-resource', {
      detail: detail,
      resourceType: props.isTool ? 'tool' : 'equipment'
    });
  }

  // Закрываем модальное окно и очищаем данные
  showDeleteConfirmation.value = false;
  pendingDeleteData.value = null;
};

const cancelDeletePerformer = () => {
  showDeleteConfirmation.value = false;
  pendingDeleteData.value = null;
};

// --- Обработка инструментов и техники ---

// Открытие модалки добавления инструментов/техники
const openAddResourceModal = (index) => {
  currentRowIndex.value = index;
  const row = existingRows.value[index];
  currentPositionPv.value = row.typPv;
  isModalOpen.value = true;
};

// Закрытие модалки добавления инструментов/техники
const closeAddResourceModal = () => {
  isModalOpen.value = false;
  currentRowIndex.value = null;
  currentPositionPv.value = null;
};

// Обработка добавления инструментов
const handleAddTools = ({ location, tools }) => {
  if (currentRowIndex.value === null) return;

  const row = existingRows.value[currentRowIndex.value];

  // Преобразуем выбранные инструменты в детали
  const newTools = tools.map(tool => ({
    id: tool.id,
    cls: tool.cls,
    pv: tool.pv,
    name: tool.name,
    inventoryNumber: tool.name,
    objLocationClsSection: tool.objLocationClsSection,
    nameLocationClsSection: tool.nameLocationClsSection,
    quantity: 0,
    isNew: true,
  }));

  // Добавляем новые инструменты к существующим
  row.details = [...row.details, ...newTools];

  // Пересчитываем количество
  row.factCount = row.details.length;

  // Закрываем модалку
  closeAddResourceModal();

  // Уведомление
  const notificationStore = useNotificationStore();
  notificationStore.showNotification(
    `Добавлено инструментов: ${newTools.length}. Не забудьте сохранить количество.`,
    'success'
  );
};

// Обработка добавления техники
const handleAddEquipments = ({ location, equipments }) => {
  if (currentRowIndex.value === null) return;

  const row = existingRows.value[currentRowIndex.value];

  // Преобразуем выбранную технику в детали
  const newEquipments = equipments.map(equipment => ({
    id: equipment.id,
    cls: equipment.cls,
    pv: equipment.pv,
    name: equipment.name,
    inventoryNumber: equipment.name,
    objLocationClsSection: equipment.objLocationClsSection,
    nameLocationClsSection: equipment.nameLocationClsSection,
    time: 0,
    isNew: true,
  }));

  // Добавляем новую технику к существующей
  row.details = [...row.details, ...newEquipments];

  // Пересчитываем факты
  const { factCount, factHours } = calculatePerformerFacts(row.details);
  row.factCount = factCount;
  row.factHours = factHours;

  // Закрываем модалку
  closeAddResourceModal();

  // Уведомление
  const notificationStore = useNotificationStore();
  notificationStore.showNotification(
    `Добавлено техники: ${newEquipments.length}. Не забудьте сохранить данные.`,
    'success'
  );
};

// Обновление деталей инструмента/техники
const updateExistingDetail = (rowIndex, detailIndex, field, value) => {
  const detail = existingRows.value[rowIndex].details[detailIndex];
  detail[field] = value;

  // Пересчитываем факты при изменении часов работы (только для техники)
  if (field === 'time' && props.isEquipment) {
    const row = existingRows.value[rowIndex];
    const { factCount, factHours } = calculatePerformerFacts(row.details);
    row.factCount = factCount;
    row.factHours = factHours;
  }
};

// Сохранение деталей инструмента/техники
const saveResourceDetails = (rowIndex, detailIndex) => {
  const row = existingRows.value[rowIndex];
  const detail = row.details[detailIndex];

  emit('save-resource', {
    rowId: row.id,
    detail: detail,
    detailIndex: detailIndex,
    resourceType: props.isTool ? 'tool' : 'equipment'
  });
};

// Удаление детали инструмента/техники
const deleteResourceDetail = (rowIndex, detailIndex) => {
  const row = existingRows.value[rowIndex];
  const detail = row.details[detailIndex];

  // Если это новый элемент (еще не сохранен на бэке), просто удаляем из массива
  if (detail.isNew) {
    row.details.splice(detailIndex, 1);

    // Пересчитываем факты
    if (props.isTool) {
      row.factCount = row.details.length;
    } else {
      const { factCount, factHours } = calculatePerformerFacts(row.details);
      row.factCount = factCount;
      row.factHours = factHours;
    }

    const notificationStore = useNotificationStore();
    notificationStore.showNotification(
      props.isTool ? 'Инструмент удален.' : 'Техника удалена.',
      'success'
    );
  } else {
    // Если элемент уже сохранен, показываем модальное окно подтверждения
    pendingDeleteData.value = { rowIndex, detailIndex, row, detail };
    showDeleteConfirmation.value = true;
  }
};

// --- Обработка новых строк для не-исполнителей ---
const addNewRow = () => {
  const row = {
    name: null,
    fact: 0,
  };
  // Добавляем unit только если нужна колонка единиц измерения
  if (showUnitColumn.value) {
    row.unit = null;
  }
  newRow.value = row;
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
  
  emit('add-row', newRow.value);
  newRow.value = null;
};

// Загрузка справочников
onMounted(async () => {
  if (!props.isPerformer) {
    try {
      const [materials, units] = await Promise.all([
        loadMaterials(),
        loadUnits()
      ]);
      
      nameOptionsInternal.value = materials;
      unitOptionsInternal.value = units;
    } catch (error) {
      console.error('Ошибка загрузки справочников:', error);
    }
  }
});
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

.add-row-button:hover {
  background: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.add-row-button.small {
  padding: 8px 16px;
  font-size: 13px;
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

.resource-table tbody tr:hover:not(.expanded-row) {
  background: #f8fafc;
}

.resource-table td {
  padding: 12px 16px;
  color: #1e293b;
  vertical-align: middle;
}

.expand-column {
  width: 50px;
  text-align: center;
}

.expand-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: #64748b;
  transition: all 0.2s;
}

.expand-button:hover {
  background: #f1f5f9;
  color: #1e293b;
}

.expand-button svg {
  transition: transform 0.2s;
}

.expand-button svg.rotated {
  transform: rotate(90deg);
}

.name-column {
  min-width: 350px;
  width: auto;
}

.unit-column {
  width: 200px;
  text-align: left;
}

.plan-column,
.fact-column {
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

.plan-fact-cell {
  min-width: 220px;
}

.plan-fact-data {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
}

.plan-fact-data span {
  color: #64748b;
}

.fact-input-cell {
  padding: 8px 16px !important;
}

.plan-empty,
.unit-empty {
  color: #94a3b8;
  text-align: left;
}

.expanded-row {
  background: #fafbfc;
}

.expanded-content {
  padding: 0 !important;
}

.performers-detail {
  background: white;
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
  align-items: flex-start;
  gap: 16px;
  padding: 20px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  transition: all 0.2s;
}

.performer-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.performer-number {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  height: 36px;
  font-size: 15px;
  font-weight: 700;
  color: #64748b;
  background: #f1f5f9;
  border-radius: 8px;
  flex-shrink: 0;
}

.performer-fields {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 20px;
  align-items: center;
}

.performer-field {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.performer-field label {
  display: block;
  font-size: 12px;
  color: #64748b;
  margin-bottom: 6px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.performer-actions {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding-bottom: 2px;
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

.empty-state,
.empty-performers {
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

/* Показываем лейблы в формах исполнителей */
.performer-fields :deep(.form-group) {
  margin: 0;
}

.performer-fields :deep(input),
.performer-fields :deep(select) {
  width: 100%;
}

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
  .resource-table .unit-column,
  .resource-table .plan-column,
  .resource-table .fact-column,
  .resource-table .actions-column,
  .resource-table .expand-column,
  .resource-table .count-column,
  .resource-table .time-column {
    width: auto;
  }

  .performers-detail {
    padding: 16px;
  }

  .performers-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .performer-item {
    flex-direction: column;
    gap: 12px;
    padding: 16px;
  }

  .performer-number {
    align-self: flex-start;
    margin-top: 0;
  }

  .performer-fields {
    grid-template-columns: 1fr;
    gap: 12px;
    width: 100%;
  }
  
  .performer-actions {
    justify-content: flex-start;
    padding-top: 0;
  }
}

@media (max-width: 480px) {
  .add-row-button {
    width: 100%;
    justify-content: center;
  }

  .performers-header .add-row-button {
    width: 100%;
  }
}
</style>