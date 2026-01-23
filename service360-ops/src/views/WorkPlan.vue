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
      :showCheckbox="true"
      :selectedRows="selectedRows"
      @update:filters="filters = $event"
      @row-dblclick="onRowDoubleClick"
      @update:selectedRows="selectedRows = $event"
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

  <ModalCopyPlan
    v-if="isCopyPlanModalOpen"
    :selectedRows="selectedRows"
    :currentDate="filters.date"
    :currentPeriodType="filters.periodType"
    @close="closeCopyPlanModal"
    @update-table="handleTableUpdate"
  />

  <ModalPlanByObjects
    v-if="isPlanByObjectsModalOpen"
    @close="closePlanByObjectsModal"
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
import { ref, onMounted, computed, h, watch } from 'vue';
import TableWrapper from '@/app/layouts/Table/TableWrapper.vue';
import ModalEditPlan from '@/features/work-plan/components/ModalEditPlan.vue';
import ModalPlanWork from '@/features/work-plan/components/ModalPlanWork.vue';
import ModalCopyPlan from '@/features/work-plan/components/ModalCopyPlan.vue';
import ModalPlanByObjects from '@/features/work-plan/components/ModalPlanByObjects.vue';
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
const isCopyPlanModalOpen = ref(false);
const isPlanByObjectsModalOpen = ref(false);
const tableWrapperRef = ref(null);
const isConfirmModalOpen = ref(false);
const recordToComplete = ref(null);
const notificationStore = useNotificationStore();
const selectedRows = ref([]);

const filters = ref({
  date: new Date(),
  periodType: null,
});

// Отслеживаем изменения выбранных строк (для дебага или дальнейшего использования)
watch(selectedRows, (newVal) => {
  console.log('Выбранные строки:', newVal);
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

const closeCopyPlanModal = () => {
  isCopyPlanModalOpen.value = false;
};

const closePlanByObjectsModal = () => {
  isPlanByObjectsModalOpen.value = false;
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

const handleCopyWorkPlan = () => {
  if (selectedRows.value.length === 0) {
    notificationStore.showNotification('Выберите работы для копирования', 'warning');
    return;
  }

  isCopyPlanModalOpen.value = true;
};

const tableActions = computed(() => {
  // Mapping icons to match the screenshot (Plus/Download)
  const baseActions = [
    {
      label: 'Копировать план работ',
      icon: 'Copy', // Copy icon
      onClick: handleCopyWorkPlan,
      hidden: !hasPermission('plan:copy'),
    },
    {
      label: 'Запланировать новую работу',
      icon: 'Plus', // Plus for add
      onClick: () => {
        isPlanWorkModalOpen.value = true;
      },
      hidden: !hasPermission('plan:ins'),
    },
    {
      label: 'Запланировать по объектам',
      icon: 'Layers', // Layers icon for objects
      onClick: () => {
        isPlanByObjectsModalOpen.value = true;
      },
      hidden: !hasPermission('plan:ins'),
    },
    // {
    //   label: 'Экспорт',
    //   icon: 'Printer', // Printer for print/export (like the screenshot)
    //   onClick: () => console.log('Экспортирование...'),
    // }
  ];

  // Reordering for mobile view to match the screenshot
  const copyAction = baseActions.find(a => a.icon === 'Copy');
  const plusAction = baseActions.find(a => a.icon === 'Plus');
  const objectsAction = baseActions.find(a => a.icon === 'Layers');
  const exportAction = baseActions.find(a => a.icon === 'Printer');

  return [copyAction, plusAction, objectsAction, exportAction].filter(action => action && !action.hidden);
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