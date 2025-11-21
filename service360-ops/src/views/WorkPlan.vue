<template>
  <div class="work-plan-page">
    <TableWrapper
      ref="tableWrapperRef"
      title="План работ"
      :columns="columns"
      :actions="tableActions"
      :limit="limit"
      :loadFn="loadWorkPlanWrapper"
      :datePickerConfig="datePickerConfig"
      :dropdownConfig="dropdownConfig"
      :showFilters="true"
      :filters="filters"
      :getRowClassFn="getRowClass"
      @update:filters="filters = $event"
      @row-dblclick="onRowDoubleClick"
    >
      <template #modals="{ selectedRow, showEditModal, closeModals, onSave }">
        <ModalEditPlan
          v-if="showEditModal"
          :rowData="selectedRow"
          @close="closeModals"
          @save="onSave"
        />
      </template>
    </TableWrapper>
  </div>

  <ModalPlanWork
    v-if="isPlanWorkModalOpen"
    @close="closePlanWorkModal"
    @update-table="handleTableUpdate"
  />
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import TableWrapper from '@/app/layouts/Table/TableWrapper.vue';
import ModalEditPlan from '@/features/work-plan/components/ModalEditPlan.vue';
import ModalPlanWork from '@/features/work-plan/components/ModalPlanWork.vue';
import { loadWorkPlan } from '@/shared/api/plans/planApi';
import { loadPeriodTypes } from '@/shared/api/periods/periodApi';
import { usePermissions } from '@/shared/api/permissions/usePermissions';

const { hasPermission } = usePermissions();

const limit = 10;
const isPlanWorkModalOpen = ref(false);
const tableWrapperRef = ref(null);

const filters = ref({
  date: new Date(),
  periodType: null,
});

const datePickerConfig = {
  label: 'Дата',
  placeholder: 'Выберите дату',
};

const dropdownConfig = ref({
  label: 'Тип периода',
  options: [],
  placeholder: 'Выберите тип периода',
});

onMounted(async () => {
  try {
    const types = await loadPeriodTypes();
    
    dropdownConfig.value.options = types;
    
    const defaultType = types.find(t => t.value === 41);
    if (defaultType) {
      filters.value.periodType = defaultType;
    } else if (types.length > 0) {
      filters.value.periodType = types[0];
    }
    
  } catch (error) {
    console.error('Ошибка загрузки типов периодов:', error);
    dropdownConfig.value.options = [];
  }
});

const closePlanWorkModal = () => {
  isPlanWorkModalOpen.value = false;
};

const handleTableUpdate = () => {
  if (tableWrapperRef.value && tableWrapperRef.value.refreshTable) {
    tableWrapperRef.value.refreshTable();
  }
};

const onSave = (closeFn) => {
  closeFn();              
  handleTableUpdate();    
};

const formatDateToString = (date) => {
  if (!date) return null;
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatCoordinates = (startKm, startPk, startZv, finishKm, finishPk, finishZv) => {
  const isPresent = (val) => val !== null && val !== undefined && val !== '';

  const createCoordPart = (km, pk, zv) => {
    const parts = [];
    if (isPresent(km)) parts.push(`${km}км`);
    if (isPresent(pk)) parts.push(`${pk}пк`);
    if (isPresent(zv)) parts.push(`${zv}зв`);
    return parts.join(' ');
  };

  const startPart = createCoordPart(startKm, startPk, startZv);
  const finishPart = createCoordPart(finishKm, finishPk, finishZv);

  if (startPart && finishPart) {
    return `${startPart} – ${finishPart}`;
  } else if (startPart) {
    return startPart;
  }
  return 'Координаты отсутствуют';
};

const loadWorkPlanWrapper = async ({ page, limit, filters: filterValues }) => {
  try {
    
    const objLocation = localStorage.getItem('objLocation');
    if (!objLocation) {
      return { total: 0, data: [] };
    }

    const selectedDate = filterValues.date ? formatDateToString(filterValues.date) : formatDateToString(new Date());
    const periodTypeId = filterValues.periodType?.value ?? 41;

    const records = await loadWorkPlan(selectedDate, periodTypeId);
    const totalRecords = records.length;
    const start = (page - 1) * limit;
    const end = page * limit;

    const sliced = records.map((r, index) => ({ // map all data for local processing in TableWrapper
      index: null,
      id: r.id,
      name: r.nameLocationClsSection,
      work: r.nameClsWork,
      fullNameWork: r.fullNameWork,
      coordinates: formatCoordinates(r.StartKm, r.StartPicket, null, r.FinishKm, r.FinishPicket, null),
      object: r.fullNameObject,
      planDate: r.PlanDateEnd,
      rawData: r,
      objWork: r.objWork,
      objObject: r.objObject,
      StartKm: r.StartKm,
      StartPicket: r.StartPicket,
      FinishKm: r.FinishKm,
      FinishPicket: r.FinishPicket,
      nameLocationClsSection: r.nameLocationClsSection,
      objLocationClsSection: r.objLocationClsSection
    }));

    // The loadFn no longer needs to slice the data since TableWrapper is now handling full data loading
    return {
      total: totalRecords,
      data: sliced,
    };
  } catch (e) {
    console.error('Ошибка при загрузке данных:', e);
    return { total: 0, data: [] };
  }
};

const onRowDoubleClick = (row) => {
  // This function is still needed to receive the event, 
  // though the main logic for modal opening is in TableWrapper
};

// Example implementation for getRowClassFn, though not strictly required by the prompt
const getRowClass = (row) => {
  return {}; // No custom class for now
};

const columns = [
  { key: 'id', label: '№', hide: true },
  { key: 'name', label: 'Участок' },
  { key: 'work', label: 'Вид работы' },
  { key: 'fullNameWork', label: 'Работы' },
  { key: 'coordinates', label: 'Координаты' },
  { key: 'object', label: 'Объект' },
  { key: 'planDate', label: 'Плановая дата' },
];

const tableActions = computed(() => {
  // Mapping icons to match the screenshot (Plus/Download)
  const baseActions = [
    {
      label: 'Запланировать новую работу',
      icon: 'Plus', // Plus for add
      onClick: () => {
        isPlanWorkModalOpen.value = true;
      },
      hidden: !hasPermission('plan:ins'),
    },
    {
      label: 'Экспорт',
      icon: 'Printer', // Printer for print/export (like the screenshot)
      onClick: () => console.log('Экспортирование...'),
    }
  ];

  // Reordering for mobile view to match the screenshot (Plus, then Print)
  const plusAction = baseActions.find(a => a.icon === 'Plus');
  const exportAction = baseActions.find(a => a.icon === 'Printer');

  return [plusAction, exportAction].filter(action => action && !action.hidden);
});
</script>

<style scoped>
.work-plan-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}
</style>