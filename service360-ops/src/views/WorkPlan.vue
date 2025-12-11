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

  <ConfirmationModal
    v-if="isConfirmModalOpen"
    title="Завершение работы"
    message="Вы уверены, что хотите завершить эту работу?"
    @confirm="handleConfirmComplete"
    @cancel="isConfirmModalOpen = false"
  />
</template>

<script setup>
import { ref, onMounted, computed, h } from 'vue';
import TableWrapper from '@/app/layouts/Table/TableWrapper.vue';
import ModalEditPlan from '@/features/work-plan/components/ModalEditPlan.vue';
import ModalPlanWork from '@/features/work-plan/components/ModalPlanWork.vue';
import { loadWorkPlan, completeThePlanWork } from '@/shared/api/plans/planApi';
import { loadPeriodTypes } from '@/shared/api/periods/periodApi';
import { usePermissions } from '@/shared/api/permissions/usePermissions';
import WorkStatus from '@/features/work-log/components/WorkStatus.vue';
import UiButton from '@/shared/ui/UiButton.vue';
import ConfirmationModal from '@/shared/ui/ConfirmationModal.vue';
import { useNotificationStore } from '@/app/stores/notificationStore';

const { hasPermission } = usePermissions();

const limit = 10;
const isPlanWorkModalOpen = ref(false);
const tableWrapperRef = ref(null);
const isConfirmModalOpen = ref(false);
const recordToComplete = ref(null);
const notificationStore = useNotificationStore();

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
    
    const defaultType = types.find(t => t.value === 71);
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

const formatDateToISO = (date) => {
  if (!date) return null;
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const openConfirmationModal = (row) => {
  recordToComplete.value = row;
  isConfirmModalOpen.value = true;
};

const handleConfirmComplete = async () => {
  if (!recordToComplete.value || !recordToComplete.value.id) {
    notificationStore.showNotification('Ошибка: Нет записи для завершения.', 'error');
    return;
  }

  try {
    const today = formatDateToISO(new Date());

    // У записи в WorkPlan.vue должен быть cls из rawData
    const cls = recordToComplete.value.rawData?.cls;

    if (!cls) {
      notificationStore.showNotification('Ошибка: Не найден cls записи.', 'error');
      return;
    }

    await completeThePlanWork(recordToComplete.value.id, cls, today);

    notificationStore.showNotification('Работа успешно завершена!', 'success');

    handleTableUpdate();

  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message || 'Не удалось завершить работу';
    notificationStore.showNotification(`Не удалось завершить работу: ${errorMessage}`, 'error');
  } finally {
    isConfirmModalOpen.value = false;
    recordToComplete.value = null;
  }
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
    const periodTypeId = filterValues.periodType?.value ?? 71;

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
      coordinates: formatCoordinates(r.StartKm, r.StartPicket, r.StartLink, r.FinishKm, r.FinishPicket, r.FinishLink),
      object: r.fullNameObject,
      planDate: r.PlanDateEnd,
      rawData: r,
      objWork: r.objWork,
      objObject: r.objObject,
      StartKm: r.StartKm,
      StartPicket: r.StartPicket,
      StartLink: r.StartLink,
      FinishKm: r.FinishKm,
      FinishPicket: r.FinishPicket,
      FinishLink: r.FinishLink,
      nameLocationClsSection: r.nameLocationClsSection,
      objLocationClsSection: r.objLocationClsSection,
      status: {
        showCheck: r.FactDateEnd && r.FactDateEnd !== '0000-01-01',
        showMinus: !r.FactDateEnd || r.FactDateEnd === '0000-01-01',
      },
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
  { key: 'status', label: 'Статус работы', component: WorkStatus },
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
          // Не показываем кнопку если работа уже завершена
          if (rowData?.status?.showCheck) return null;

          return h(UiButton, {
            text: 'Завершить работу',
            onClick: onClickHandler,
          });
        };
      },
    },
  },
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
    // {
    //   label: 'Экспорт',
    //   icon: 'Printer', // Printer for print/export (like the screenshot)
    //   onClick: () => console.log('Экспортирование...'),
    // }
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