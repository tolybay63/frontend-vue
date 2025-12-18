<template>
  <div class="plan-form-page">
    <div class="header">
      <BackButton @click="goBack" />
      <h1>Журнал планирования ресурсов</h1>
    </div>
    <div class="filters-section">
      <div class="filter-row">
        <AppDropdown
          v-model:value="selectedSection"
          label="Участок"
          placeholder="Выберите участок"
          :required="true"
          class="filter-item"
          :options="sections"
          @update:value="onSectionChange"
        />
        <AppDropdown
          :key="monthDropdownKey"
          v-model:value="selectedMonth"
          label="Месяц"
          placeholder="Выберите месяц"
          :required="true"
          class="filter-item"
          :options="months"
          :disabled="!selectedSection"
          @update:value="onMonthChange"
        />
        <AppDropdown
          :key="dayDropdownKey"
          v-model:value="selectedDay"
          label="День"
          placeholder="Выберите день"
          :required="true"
          class="filter-item"
          :options="filteredDays"
          :disabled="!selectedMonth"
          @update:value="onDayChange"
        />
      </div>
    </div>
    <div class="table-section">
      <div class="table-header">
        <h2>План работ{{ formattedDate ? ' на ' + formattedDate : '' }}</h2>
        <div class="table-subheader">
          <p class="subtitle">
            Отображаются только незавершенные работы. Для детального просмотра дважды кликните по строке.
          </p>
          <span class="total-count">Всего работ: {{ tableData.length }}</span>
        </div>
      </div>
      <BaseTable
        :columns="columns"
        :rows="tableData"
        :loading="isLoading"
        :expanded-rows="[]"
        :toggle-row-expand="() => {}"
        :children-map="{}"
        :active-filters="{}"
        @row-dblclick="onRowDoubleClick"
        :showFilters="false"
      />
    </div>

    <ResourcePlanningModal
      v-if="isWorkCardModalOpen"
      :record="selectedRecord"
      :section="selectedSectionName"
      :date="selectedDate"
      :sectionId="selectedSection"
      :sectionPv="selectedSectionPv"
      @close="isWorkCardModalOpen = false"
    />

    <ConfirmationModal
      v-if="isConfirmModalOpen"
      title="Завершение работы"
      message="Вы уверены, что хотите завершить эту работу?"
      @confirm="handleConfirmComplete"
      @cancel="isConfirmModalOpen = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, h } from 'vue';
import { useRouter } from 'vue-router';
import { useNotificationStore } from '@/app/stores/notificationStore';
import { usePermissions } from '@/shared/api/permissions/usePermissions';
import { loadWorkPlanCorrectionalUnfinished } from '@/shared/api/repairs/repairApi';
import { completeThePlanWork } from '@/shared/api/plans/planWorkApi';
import AppDropdown from '@/shared/ui/FormControls/AppDropdown.vue';
import BaseTable from '@/app/layouts/Table/BaseTable.vue';
import BackButton from '@/shared/ui/BackButton.vue';
import UiButton from '@/shared/ui/UiButton.vue';
import ResourcePlanningModal from '@/features/resource-planning/components/ResourcePlanningModal.vue';
import ConfirmationModal from '@/shared/ui/ConfirmationModal.vue';

const selectedSection = ref(null);
const selectedMonth = ref(null);
const selectedDay = ref(null);
const isLoading = ref(false);
const tableData = ref([]);
const allRecords = ref([]); // Храним все загруженные записи
const sections = ref([]);
const months = ref([]);
const monthDropdownKey = ref(0);
const dayDropdownKey = ref(0);
const isWorkCardModalOpen = ref(false);
const selectedRecord = ref(null);
const isConfirmModalOpen = ref(false);
const recordToComplete = ref(null);
const router = useRouter();
const notificationStore = useNotificationStore();

const { hasPermission } = usePermissions();
const canFinish = computed(() => hasPermission('plan:finish'));

const selectedDate = computed(() => {
  if (!selectedMonth.value || !selectedDay.value) return null;
  const [year, month] = selectedMonth.value.split('-');
  const day = selectedDay.value.toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
});

const formattedDate = computed(() => {
  // Если выбран месяц и день - показываем полную дату
  if (selectedDate.value) {
    const date = new Date(selectedDate.value);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  // Если выбран только месяц - показываем месяц и год
  if (selectedMonth.value) {
    const [year, month] = selectedMonth.value.split('-');
    const date = new Date(year, parseInt(month) - 1, 1);
    return date.toLocaleDateString('ru-RU', {
      month: 'long',
      year: 'numeric',
    });
  }

  return '';
});

const selectedSectionName = computed(() => {
  return selectedSection.value || null;
});

// Вычисляемое свойство для фильтрации дней по выбранному месяцу
const filteredDays = computed(() => {
  if (!selectedMonth.value || !selectedSection.value) return [];

  // Фильтруем записи по участку и месяцу
  const daysSet = new Set();
  allRecords.value.forEach(record => {
    if (record.nameLocationClsSection === selectedSection.value && record.PlanDateEnd) {
      const [year, month, day] = record.PlanDateEnd.split('-');
      if (`${year}-${month}` === selectedMonth.value) {
        daysSet.add(day);
      }
    }
  });

  // Сортируем и форматируем дни
  return Array.from(daysSet)
    .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
    .map((day) => ({
      value: day,
      label: day,
    }));
});

const selectedSectionPv = computed(() => {
  if (!selectedSection.value) return null;
  const record = allRecords.value.find(r => r.nameLocationClsSection === selectedSection.value);
  return record ? record.pv : null;
});

const onRowDoubleClick = (row) => {
  selectedRecord.value = row;
  isWorkCardModalOpen.value = true;
};

const openConfirmationModal = (row) => {
  recordToComplete.value = row;
  isConfirmModalOpen.value = true;
};

const formatDateToISO = (date) => {
  if (!date) return null;
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const handleConfirmComplete = async () => {
  if (!recordToComplete.value || !recordToComplete.value.id) {
    notificationStore.showNotification('Ошибка: Нет записи для завершения.', 'error');
    return;
  }

  try {
    const today = formatDateToISO(new Date());

    await completeThePlanWork(recordToComplete.value.id, recordToComplete.value.cls, today);

    notificationStore.showNotification('Работа успешно завершена!', 'success');

    await loadAllUnfinishedWork();

  } catch (error) {
    console.log('Error response:', error.response);
    console.log('Error response data:', error.response?.data);

    let errorMessage = 'Не удалось завершить работу';

    if (error.response?.data?.error?.message) {
      errorMessage = error.response.data.error.message;
    } else if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.message) {
      errorMessage = error.message;
    }

    notificationStore.showNotification(errorMessage, 'error');
  } finally {
    isConfirmModalOpen.value = false;
    recordToComplete.value = null;
  }
};

const columns = [
  { key: 'planDateEnd', label: 'ДАТА ОКОНЧАНИЯ' },
  { key: 'name', label: 'НАИМЕНОВАНИЕ РАБОТЫ' },
  { key: 'place', label: 'МЕСТО' },
  { key: 'objectType', label: 'ТИП ОБЪЕКТА' },
  { key: 'object', label: 'ОБЪЕКТ' },
  { key: 'coordinates', label: 'КООРДИНАТЫ' },
  {
    key: 'actions',
    label: 'ДЕЙСТВИЯ',
    component: {
      setup(props, context) {
        const rowData = context.attrs.row;

        const onClickHandler = (event) => {
          event.stopPropagation();
          openConfirmationModal(rowData);
        };

        return () => {
          if (!canFinish.value) return null;

          return h(UiButton, {
            text: 'Завершить работу',
            onClick: onClickHandler,
          });
        };
      },
    },
  },
];

const goBack = () => {
  router.push({ name: 'ResourcePlanning' });
};

const filterTableData = () => {
  if (!selectedSection.value && !selectedMonth.value && !selectedDay.value) {
    // Если ничего не выбрано, показываем все записи
    tableData.value = allRecords.value.map(mapRecordToTableRow);
    return;
  }

  let filtered = allRecords.value;

  // Фильтруем по участку
  if (selectedSection.value) {
    filtered = filtered.filter(record => record.nameLocationClsSection === selectedSection.value);
  }

  // Фильтруем по дате
  if (selectedMonth.value || selectedDay.value) {
    filtered = filtered.filter(record => {
      if (!record.PlanDateEnd) return false;

      const [year, month, day] = record.PlanDateEnd.split('-');

      if (selectedMonth.value && `${year}-${month}` !== selectedMonth.value) {
        return false;
      }

      if (selectedDay.value && day !== selectedDay.value) {
        return false;
      }

      return true;
    });
  }

  tableData.value = filtered.map(mapRecordToTableRow);
};

const mapRecordToTableRow = (record) => ({
  id: record.id,
  pv: record.pv,
  cls: record.cls,
  planDateEnd: record.PlanDateEnd || 'Не указано',
  name: record.fullNameWork || 'Без названия',
  place: record.nameSection || 'Не указано',
  objectType: record.nameClsObject || 'Неизвестно',
  object: record.fullNameObject || 'Объект не указан',
  objObject: record.objObject,
  nameLocationClsSection: record.nameLocationClsSection,
  objLocationClsSection: record.objLocationClsSection,
  pvLocationClsSection: record.pvLocationClsSection,
  coordinates: record.StartKm && record.FinishKm ? `${record.StartKm}км ${record.StartPicket || 0}пк ${record.StartLink || 0}зв – ${record.FinishKm}км ${record.FinishPicket || 0}пк ${record.FinishLink || 0}зв` : 'Координаты отсутствуют',
  StartKm: record.StartKm,
  StartPicket: record.StartPicket,
  StartLink: record.StartLink,
  FinishKm: record.FinishKm,
  FinishPicket: record.FinishPicket,
  FinishLink: record.FinishLink,
});

const loadAllUnfinishedWork = async () => {
  isLoading.value = true;
  try {
    const records = await loadWorkPlanCorrectionalUnfinished();
    allRecords.value = records;

    // Извлекаем уникальные участки из загруженных данных
    const sectionsSet = new Set();
    records.forEach(record => {
      if (record.nameLocationClsSection) {
        sectionsSet.add(record.nameLocationClsSection);
      }
    });

    sections.value = Array.from(sectionsSet).sort().map(section => ({
      value: section,
      label: section,
    }));

    // Отображаем все записи по умолчанию
    filterTableData();
  } catch (error) {
    notificationStore.showNotification('Не удалось загрузить незавершенные работы', 'error');
    allRecords.value = [];
    tableData.value = [];
  } finally {
    isLoading.value = false;
  }
};


const updateMonthsForSection = () => {
  if (!selectedSection.value) {
    months.value = [];
    selectedMonth.value = null;
    selectedDay.value = null;
    monthDropdownKey.value++;
    dayDropdownKey.value++;
    return;
  }

  // Извлекаем уникальные месяцы для выбранного участка
  const monthsSet = new Set();
  allRecords.value.forEach(record => {
    if (record.nameLocationClsSection === selectedSection.value && record.PlanDateEnd) {
      const [year, month] = record.PlanDateEnd.split('-');
      monthsSet.add(`${year}-${month}`);
    }
  });

  months.value = Array.from(monthsSet)
    .sort()
    .map((month) => ({
      value: month,
      label: new Date(`${month}-01`).toLocaleString('ru-RU', { month: 'long', year: 'numeric' }),
    }));

  selectedMonth.value = null;
  selectedDay.value = null;
  monthDropdownKey.value++;
  dayDropdownKey.value++;
};

const onSectionChange = () => {
  updateMonthsForSection();
  filterTableData();
};

const onMonthChange = () => {
  selectedDay.value = null;
  dayDropdownKey.value++;
  filterTableData();
};

const onDayChange = () => {
  filterTableData();
};

onMounted(async () => {
  await loadAllUnfinishedWork();
});

</script>

<style scoped>
.plan-form-page {
  padding: 24px;
  background: #f7fafc;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
  font-family: system-ui;
}

.header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  flex-shrink: 0; /* Prevents header from shrinking */
}

.header h1 {
  font-size: 20px;
  font-weight: 600;
  color: #1a202c;
}

.filters-section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  margin-bottom: 24px;
  flex-shrink: 0; /* Prevents filters from shrinking */
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  align-items: flex-start;
}

.filter-item {
  flex: 1;
  min-width: 240px;
}

.filter-item :deep(.hint) {
  font-size: 12px;
  color: #718096;
  margin-top: 4px;
}

.action-buttons {
  display: flex;
  justify-content: flex-start;
  margin-top: 16px;
  flex-shrink: 0;
}

.generate-btn {
  max-width: 240px;
  height: 40px;
  font-size: 14px;
  padding: 0 16px;
  border-radius: 8px;
  background-color: #2b6cb0 ;
  color: white;
  border: none;
  cursor: pointer;
}

.table-section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  /* Added min-height to ensure flex layout respects the child's (BaseTable's) max-height */
  min-height: 0;
  flex-grow: 1; /* Allows the table section to take up remaining vertical space */
  display: flex;
  flex-direction: column;
}

.table-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 24px;
  flex-shrink: 0; /* Prevents header from shrinking */
}

.table-header h2 {
  font-size: 18px;
  font-weight: 600;
  color: #1a202c;
}

.table-subheader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.subtitle {
  font-size: 14px;
  color: #718096;
  line-height: 1.5;
  margin: 0;
  flex: 1;
}

.total-count {
  font-size: 14px;
  color: #4a5568;
  font-weight: 500;
  white-space: nowrap;
}

/* Tablet styles */
@media (max-width: 1024px) {
  .plan-form-page {
    padding: 16px;
  }

  .header h1 {
    font-size: 18px;
  }

  .filters-section {
    padding: 20px;
  }

  .filter-row {
    gap: 16px;
  }

  .filter-item {
    min-width: 200px;
  }

  .table-section {
    padding: 20px;
  }

  .table-header h2 {
    font-size: 16px;
  }

  .table-subheader {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .subtitle {
    font-size: 13px;
  }

  .total-count {
    font-size: 13px;
  }
}

/* Mobile styles */
@media (max-width: 640px) {
  .plan-form-page {
    padding: 12px;
  }

  .header {
    gap: 12px;
    margin-bottom: 16px;
  }

  .header h1 {
    font-size: 16px;
  }

  .filters-section {
    padding: 16px;
    margin-bottom: 16px;
  }

  .filter-row {
    flex-direction: column;
    gap: 16px;
  }

  .filter-item {
    min-width: 0;
    width: 100%;
  }

  .table-section {
    padding: 16px;
    overflow-x: auto;
  }

  .table-header {
    margin-bottom: 16px;
  }

  .table-header h2 {
    font-size: 15px;
  }

  .table-subheader {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .subtitle {
    font-size: 12px;
  }

  .total-count {
    font-size: 12px;
  }
}
</style>
