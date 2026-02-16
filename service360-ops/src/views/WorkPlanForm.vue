<template>
  <div class="plan-form-page">
    <div class="header">
      <BackButton @click="goToInspections" />
      <h1>Запись в Журнал осмотров и проверок</h1>
    </div>
    <div class="filters-section">
      <div class="filter-row">
        <AppDropdown
          :modelValue="selectedSection"
          label="Участок"
          placeholder="Выберите участок"
          :required="true"
          class="filter-item"
          :options="sections"
          @update:modelValue="onSectionChange"
        />
        <AppDropdown
          :key="monthDropdownKey"
          :modelValue="selectedMonth"
          label="Месяц"
          placeholder="Выберите месяц"
          :required="true"
          class="filter-item"
          :options="months"
          :disabled="!selectedSection"
          @update:modelValue="onMonthChange"
        />
        <AppDropdown
          :key="dayDropdownKey"
          :modelValue="selectedDay"
          label="День"
          placeholder="Выберите день"
          :required="true"
          class="filter-item"
          :options="filteredDays"
          :disabled="!selectedMonth"
          @update:modelValue="onDayChange"
        />
      </div>
    </div>
    <div class="table-section">
      <div class="table-header">
        <div class="table-header-top">
          <h2>План работ{{ formattedDate ? ' на ' + formattedDate : '' }}</h2>
          <UiButton
            v-if="canInsert"
            text="Добавить осмотр"
            icon="Plus"
            @click="goToInspectionRecord"
          />
        </div>
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
        :showCheckbox="true"
        :selectedRows="selectedRows"
        @update:selectedRows="selectedRows = $event"
      />
    </div>

    <WorkCardModal
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
      :loading="isCompletingWork"
      @confirm="handleConfirmComplete"
      @cancel="isConfirmModalOpen = false"
    />

    <ConfirmationModal
      v-if="isInspectionConfirmModalOpen"
      title="Добавление осмотров"
      :message="`Вы уверены, что хотите добавить осмотры для ${selectedRows.length} выбранных записей?`"
      :loading="isSavingInspections"
      @confirm="handleConfirmInspections"
      @cancel="isInspectionConfirmModalOpen = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, h } from 'vue';
import { useRouter } from 'vue-router';
import { useNotificationStore } from '@/app/stores/notificationStore';
import { usePermissions } from '@/shared/api/permissions/usePermissions';
import { loadWorkPlanInspectionUnfinished, saveSeveralInspections } from '@/shared/api/inspections/inspectionsApi';
import { completeThePlanWork } from '@/shared/api/plans/planWorkApi';
import AppDropdown from '@/shared/ui/FormControls/AppDropdown.vue';
import BaseTable from '@/app/layouts/Table/BaseTable.vue';
import BackButton from '@/shared/ui/BackButton.vue';
import UiButton from '@/shared/ui/UiButton.vue';
import WorkCardModal from '@/features/work-log/components/WorkCardModal.vue';
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
const selectedRows = ref([]);
const isInspectionConfirmModalOpen = ref(false);
const isSavingInspections = ref(false);
const isCompletingWork = ref(false);
const router = useRouter();
const notificationStore = useNotificationStore();

const { hasPermission } = usePermissions();
const canFinish = computed(() => hasPermission('plan:finish'));
const canInsert = computed(() => hasPermission('ins:ins')); 

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
    isConfirmModalOpen.value = false;
    return;
  }

  isCompletingWork.value = true;
  try {
    const today = formatDateToISO(new Date());

    await completeThePlanWork(recordToComplete.value.id, recordToComplete.value.cls, today);

    notificationStore.showNotification('Работа успешно завершена!', 'success');

    // Обновляем таблицу без сброса фильтров
    await reloadTableDataOnly();

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
    isCompletingWork.value = false;
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

const goToInspections = () => {
  router.push({ name: 'Inspections' });
};

const goToInspectionRecord = () => {
  if (selectedRows.value.length > 0) {
    // Если выбраны записи - показываем модалку подтверждения
    isInspectionConfirmModalOpen.value = true;
  } else {
    // Если записи не выбраны - переходим на страницу записи осмотра
    localStorage.setItem('inspectionsNavigation', 'fromRelatedPage');
    router.push({ name: 'InspectionRecord' });
  }
};

const handleConfirmInspections = async () => {
  if (selectedRows.value.length === 0) {
    notificationStore.showNotification('Не выбраны записи для осмотра', 'error');
    isInspectionConfirmModalOpen.value = false;
    return;
  }

  isSavingInspections.value = true;
  try {
    // selectedRows содержит только ID, нужно получить полные данные строк
    const selectedRowsData = tableData.value.filter(row => selectedRows.value.includes(row.id));

    await saveSeveralInspections(selectedRowsData);

    notificationStore.showNotification('Осмотры успешно сохранены!', 'success');

    // Сбрасываем выбранные строки
    selectedRows.value = [];

    // Обновляем таблицу без сброса фильтров
    await reloadTableDataOnly();
  } catch (error) {
    console.error('Ошибка при сохранении осмотров:', error);
    const errorMessage = error.response?.data?.error?.message || error.message || 'Ошибка при сохранении осмотров';
    notificationStore.showNotification(errorMessage, 'error');
  } finally {
    isSavingInspections.value = false;
    isInspectionConfirmModalOpen.value = false;
  }
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

// Перезагрузка данных без сброса фильтров
const reloadTableDataOnly = async () => {
  isLoading.value = true;
  try {
    const records = await loadWorkPlanInspectionUnfinished();
    allRecords.value = records;

    // Просто обновляем таблицу с текущими фильтрами
    filterTableData();
  } catch (error) {
    notificationStore.showNotification('Не удалось загрузить данные', 'error');
  } finally {
    isLoading.value = false;
  }
};

const loadAllUnfinishedWork = async () => {
  isLoading.value = true;
  try {
    const records = await loadWorkPlanInspectionUnfinished();
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

    // Автоматически выбираем первый участок, если есть
    if (sections.value.length > 0) {
      selectedSection.value = sections.value[0].value;
      updateMonthsForSection();
      autoSelectDate();
    } else {
      // Если участков нет, отображаем все записи
      filterTableData();
    }
  } catch (error) {
    notificationStore.showNotification('Не удалось загрузить незавершенные работы', 'error');
    allRecords.value = [];
    tableData.value = [];
  } finally {
    isLoading.value = false;
  }
};


const autoSelectDate = () => {
  if (!selectedSection.value || months.value.length === 0) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Сбрасываем время для корректного сравнения

  // Собираем все даты для выбранного участка
  const availableDates = [];
  allRecords.value.forEach(record => {
    if (record.nameLocationClsSection === selectedSection.value && record.PlanDateEnd) {
      const recordDate = new Date(record.PlanDateEnd);
      recordDate.setHours(0, 0, 0, 0);

      // Добавляем только даты <= сегодняшней
      if (recordDate <= today) {
        availableDates.push({
          fullDate: record.PlanDateEnd,
          dateObj: recordDate
        });
      }
    }
  });

  if (availableDates.length === 0) {
    // Если нет дат <= сегодняшней, показываем все записи без фильтра
    filterTableData();
    return;
  }

  // Сортируем по убыванию (от новых к старым) и берем самую свежую
  availableDates.sort((a, b) => b.dateObj - a.dateObj);
  const closestDate = availableDates[0].fullDate;

  // Разбираем выбранную дату на месяц и день
  const [year, month, day] = closestDate.split('-');
  selectedMonth.value = `${year}-${month}`;
  selectedDay.value = day;

  monthDropdownKey.value++;
  dayDropdownKey.value++;

  filterTableData();
};

const findClosestDay = (days, targetDay) => {
  if (days.length === 0) return null;

  const numericDays = days.map(d => parseInt(d, 10)).sort((a, b) => b - a); // Сортируем по убыванию

  // Ищем ближайший день, который <= targetDay
  for (const day of numericDays) {
    if (day <= targetDay) {
      return String(day).padStart(2, '0');
    }
  }

  // Если все дни больше targetDay, возвращаем самый ранний (минимальный)
  return String(Math.min(...numericDays)).padStart(2, '0');
};

const findClosestMonth = (monthsList, targetMonth) => {
  if (monthsList.length === 0) return null;

  const targetDate = new Date(`${targetMonth}-01`);

  // Сортируем месяцы по убыванию (от нового к старому)
  const sortedMonths = [...monthsList].sort((a, b) => {
    return new Date(`${b}-01`) - new Date(`${a}-01`);
  });

  // Ищем ближайший месяц, который <= targetMonth
  for (const month of sortedMonths) {
    const monthDate = new Date(`${month}-01`);
    if (monthDate <= targetDate) {
      return month;
    }
  }

  // Если все месяцы больше targetMonth, возвращаем самый ранний
  return monthsList.sort()[0];
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

const onSectionChange = (value) => {
  selectedSection.value = value?.value || value;
  updateMonthsForSection();
  autoSelectDate();
};

const onMonthChange = (value) => {
  selectedMonth.value = value?.value || value;
  selectedDay.value = null;
  dayDropdownKey.value++;
  filterTableData();
};

const onDayChange = (value) => {
  selectedDay.value = value?.value || value;
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

.table-header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
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

  .table-header-top {
    flex-wrap: wrap;
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

  .table-header-top {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
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