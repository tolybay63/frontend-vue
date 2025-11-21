<template>
  <div class="plan-form-page">
    <div class="header">
      <BackButton @click="goBack" />
      <h1>Запись в Журнал выполнения работ</h1>
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
        />
        <div class="action-buttons">
          <MainButton
            label="Показать план работ"
            :loading="isGenerating"
            @click="generatePlan"
            class="generate-btn"
          />
        </div>
      </div>
    </div>
    <div class="table-section">
      <div class="table-header">
        <h2>План работ на {{ formattedDate }}</h2>
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
import { loadSections } from '@/shared/api/inspections/inspectionsApi';
import { loadDateWorkPlanCorrectional, loadObjClsWorkPlanCorrectionalUnfinishedByDate } from '@/shared/api/repairs/repairApi';
import { completeThePlanWork } from '@/shared/api/plans/planWorkApi';
import AppDropdown from '@/shared/ui/FormControls/AppDropdown.vue';
import BaseTable from '@/app/layouts/Table/BaseTable.vue';
import BackButton from '@/shared/ui/BackButton.vue';
import MainButton from '@/shared/ui/MainButton.vue';
import UiButton from '@/shared/ui/UiButton.vue';
import ResourcePlanningModal from '@/features/resource-planning/components/ResourcePlanningModal.vue';
import ConfirmationModal from '@/shared/ui/ConfirmationModal.vue';

const selectedSection = ref(null);
const selectedMonth = ref(null);
const selectedDay = ref(null);
const isGenerating = ref(false);
const isLoading = ref(false);
const tableData = ref([]);
const sections = ref([]);
const sectionsData = ref([]);
const months = ref([]);
const days = ref([]);
const allDatesData = ref([]); // Храним все даты
const monthDropdownKey = ref(0);
const dayDropdownKey = ref(0);
const isWorkCardModalOpen = ref(false);
const selectedRecord = ref(null);
const isConfirmModalOpen = ref(false);
const recordToComplete = ref(null);
const router = useRouter();
const notificationStore = useNotificationStore(); 

const selectedDate = computed(() => {
  if (!selectedMonth.value || !selectedDay.value) return null;
  const [year, month] = selectedMonth.value.split('-');
  const day = selectedDay.value.toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
});

const formattedDate = computed(() => {
  if (!selectedDate.value) return '';
  const date = new Date(selectedDate.value);
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
});

const selectedSectionName = computed(() => {
  const section = sections.value.find((s) => s.value === selectedSection.value);
  return section ? section.label : null;
});

// Вычисляемое свойство для фильтрации дней по выбранному месяцу
const filteredDays = computed(() => {
  if (!selectedMonth.value) return [];
  
  // Фильтруем даты, которые соответствуют выбранному месяцу
  const daysForMonth = allDatesData.value
    .filter(date => {
      const [year, month] = date.split('-');
      return `${year}-${month}` === selectedMonth.value;
    })
    .map(date => {
      const [, , day] = date.split('-');
      return day;
    });
  
  // Убираем дубликаты и сортируем
  const uniqueDays = [...new Set(daysForMonth)];
  return uniqueDays
    .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
    .map((day) => ({
      value: day,
      label: day,
    }));
});

const getSelectedSectionData = () => {
  if (!selectedSection.value) return { id: null, pv: null };
  const section = sectionsData.value.find((s) => s.id === selectedSection.value);
  return { id: section.id, pv: section.pv };
};

const selectedSectionPv = computed(() => getSelectedSectionData().pv);

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
    
    await completeThePlanWork(recordToComplete.value.id, today);
    
    notificationStore.showNotification('Работа успешно завершена!', 'success');
    
    await loadWorkPlanForDate();

  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message || 'Не удалось завершить работу';
    notificationStore.showNotification(`Не удалось завершить работу: ${errorMessage}`, 'error');
  } finally {
    isConfirmModalOpen.value = false;
    recordToComplete.value = null;
  }
};

const columns = [
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

        return () => h(UiButton, {
          text: 'Завершить планирование ресурсов',
          // onClick: onClickHandler,
          disabled: true,
        });
      },
    },
  },
];

const goBack = () => {
  router.push({ name: 'ResourcePlanning' });
};

const loadWorkPlanForDate = async () => {
  if (!selectedDate.value || !selectedSection.value) {
    notificationStore.showNotification('Пожалуйста, выберите участок и дату.', 'error');
    return;
  }

  isLoading.value = true;
  try {
    const sectionData = getSelectedSectionData();
    if (!sectionData.pv) {
      throw new Error('PV участка не найден');
    }

    const records = await loadObjClsWorkPlanCorrectionalUnfinishedByDate(sectionData.id, sectionData.pv, selectedDate.value);

    tableData.value = records.map((record) => ({
      id: record.id,
      pv: record.pv,
      name: record.fullNameWork || 'Без названия',
      place: record.nameSection || 'Не указано',
      objectType: record.nameClsObject || 'Неизвестно',
      object: record.fullNameObject || 'Объект не указан',
      objObject: record.objObject,
      coordinates: record.StartKm && record.FinishKm ? `${record.StartKm}км ${record.StartPicket || 0}пк ${record.StartLink || 0}зв – ${record.FinishKm}км ${record.FinishPicket || 0}пк ${record.FinishLink || 0}зв` : 'Координаты отсутствуют',
      StartKm: record.StartKm,
      StartPicket: record.StartPicket,
      StartLink: record.StartLink,
      FinishKm: record.FinishKm,
      FinishPicket: record.FinishPicket,
      FinishLink: record.FinishLink,
    }));
  } catch (error) {
    notificationStore.showNotification('Не удалось загрузить план работ', 'error');
    tableData.value = [];
  } finally {
    isLoading.value = false;
  }
};

const loadSectionsData = async () => {
  try {
    const data = await loadSections();
    sectionsData.value = data;
    sections.value = data.map((section) => ({
      value: section.id,
      label: section.name,
    }));
  } catch (error) {
    notificationStore.showNotification('Не удалось загрузить участки', 'error');
  }
};

const loadWorkPlanDatesData = async () => {
  const sectionData = getSelectedSectionData();

  if (!sectionData.pv) {
    months.value = [];
    days.value = [];
    allDatesData.value = [];
    selectedMonth.value = null;
    selectedDay.value = null;
    monthDropdownKey.value++;
    dayDropdownKey.value++;
    return;
  }

  try {
    const dates = await loadDateWorkPlanCorrectional(sectionData.id, sectionData.pv);
    
    // Сохраняем все даты для последующей фильтрации
    allDatesData.value = dates;

    const monthsSet = new Set();

    dates.forEach((date) => {
      const [year, month] = date.split('-');
      monthsSet.add(`${year}-${month}`);
    });

    months.value = Array.from(monthsSet).map((month) => ({
      value: month,
      label: new Date(`${month}-01`).toLocaleString('ru-RU', { month: 'long' }),
    }));

    // Не устанавливаем автоматически месяц и день
    selectedMonth.value = null;
    selectedDay.value = null;

    monthDropdownKey.value++;
    dayDropdownKey.value++;
  } catch (error) {
    notificationStore.showNotification('Не удалось загрузить даты для плана', 'error');
    months.value = [];
    days.value = [];
    allDatesData.value = [];
    selectedMonth.value = null;
    selectedDay.value = null;
    monthDropdownKey.value++;
    dayDropdownKey.value++;
  }
};

const onSectionChange = async (newSectionId) => {
  if (newSectionId) {
    selectedMonth.value = null;
    selectedDay.value = null;
    months.value = [];
    days.value = [];
    allDatesData.value = [];
    monthDropdownKey.value++;
    dayDropdownKey.value++;

    await loadWorkPlanDatesData();
  } else {
    months.value = [];
    days.value = [];
    allDatesData.value = [];
    selectedMonth.value = null;
    selectedDay.value = null;
    tableData.value = [];
    monthDropdownKey.value++;
    dayDropdownKey.value++;
  }
};

const onMonthChange = (newMonth) => {
  // Сбрасываем выбранный день при изменении месяца
  selectedDay.value = null;
  dayDropdownKey.value++;
};

const generatePlan = () => {
  if (isGenerating.value) return; 
  
  if (!selectedDate.value) {
    notificationStore.showNotification('Пожалуйста, выберите корректную дату.', 'error');
    return;
  }
  isGenerating.value = true;
  loadWorkPlanForDate().finally(() => {
    isGenerating.value = false;
  });
};

onMounted(async () => {
  await loadSectionsData();
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
</style>