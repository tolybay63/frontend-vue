<template>
  <TableWrapper
    ref="tableWrapperRef"
    title="Журнал неисправностей"
    :columns="columns"
    :actions="tableActions"
    :limit="limit"
    :loadFn="loadFaultsWrapper"
    :datePickerConfig="datePickerConfig"
    :dropdownConfig="dropdownConfig"
    :showFilters="true"
    :filters="filters"
    @update:filters="filters = $event"
    @row-dblclick="onRowDoubleClick"
  >
    <template #modals="{ selectedRow, showEditModal, closeModals }">
      <ModalFaultInfo
        v-if="showInfoModal && selectedFaultRow"
        :rowData="selectedFaultRow"
        @deleted="handleFaultDeleted"
        @close="showInfoModal = false; selectedFaultRow = null"
      />
    </template>
  </TableWrapper>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import TableWrapper from '@/app/layouts/Table/TableWrapper.vue';
import { loadFaults } from '@/shared/api/defects/faultApi';
import { loadPeriodTypes } from '@/shared/api/periods/periodApi';
import ModalFaultInfo from '@/features/faults/components/ModalFaultInfo.vue';

const limit = 10;
const tableWrapperRef = ref(null);

const filters = ref({
  date: new Date(),
  periodType: null,
});

const showInfoModal = ref(false);
const selectedFaultRow = ref(null);

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

const handleTableUpdate = () => {
  if (tableWrapperRef.value && tableWrapperRef.value.refreshTable) {
    tableWrapperRef.value.refreshTable();
  }
};

const handleFaultDeleted = () => {
  showInfoModal.value = false;
  selectedFaultRow.value = null;
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

const formatCoordPart = (value, unit) => {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  return `${unit === 'км' ? '' : ' '}${value} ${unit}`;
};

const loadFaultsWrapper = async ({ page, limit, filters: filterValues }) => {
  try {

    const objLocation = localStorage.getItem('objLocation');
    if (!objLocation) {
    }

    const selectedDate = filterValues.date ? formatDateToString(filterValues.date) : formatDateToString(new Date());
    const periodTypeId = filterValues.periodType?.value ?? 41;

    const records = await loadFaults(selectedDate, periodTypeId);
    const totalRecords = records.length;
    const start = (page - 1) * limit;
    const end = page * limit;

    const sliced = records.slice(start, end).map((r, index) => {

      const startCoord = 
        formatCoordPart(r.StartKm, 'км') + 
        formatCoordPart(r.StartPicket, 'пк') + 
        formatCoordPart(r.StartLink, 'зв');
      
      const finishCoord = 
        formatCoordPart(r.FinishKm, 'км') + 
        formatCoordPart(r.FinishPicket, 'пк') + 
        formatCoordPart(r.FinishLink, 'зв');
      
      let coordinatesString = '';
      if (startCoord) {
        coordinatesString += startCoord;
      }
      if (startCoord && finishCoord) {
        coordinatesString += ' - ';
      }
      if (finishCoord) {
        coordinatesString += finishCoord;
      }

      return {
        id: r.id,
        index: start + index + 1,
        objInspection: r.objInspection,
        nameSection: r.nameSection,
        nameDefect: r.nameDefect,
        nameObject: r.nameObject,
        coordinates: coordinatesString,
        FactDateEnd: r.FactDateEnd,
        Description: r.Description,
        nameDefectsComponent: r.nameDefectsComponent,
        nameDefectsCategory: r.nameDefectsCategory,
        nameLocationClsSection: r.nameLocationClsSection,
        date: r.CreationDateTime,
        CreationTime: r.CreationDateTime ? r.CreationDateTime.split('T')[1].substring(0, 8) : null,
        rawData: r, 
      };
    });

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
  selectedFaultRow.value = row;
  showInfoModal.value = true;
};

const columns = [
  { key: 'index', label: '№' },
  { key: 'objInspection', label: 'ссылка на работу' },
  { key: 'FactDateEnd', label: 'Дата проверки' },
  // { key: 'nameLocationClsSection', label: 'Место' },
  { key: 'nameSection', label: 'Участок' },
  { key: 'nameObject', label: 'Объект', minWidth: 200 },
  { key: 'coordinates', label: 'Координаты', width: 220 },
  { key: 'nameDefectsComponent', label: 'Компонент', minWidth: 200 },
  { key: 'nameDefect', label: 'Неисправность', minWidth: 200 },
  { key: 'nameDefectsCategory', label: 'Категория', width: 120 },
  // { key: 'Description', label: 'Примечание', minWidth: 200 },
  // { key: 'CreationDate', label: 'Дата записи', width: 120 },
  // { key: 'CreationTime', label: 'Время записи', width: 120 },
];

const tableActions = [
  {
    label: 'Экспорт',
    icon: 'Download',
    onClick: () => console.log('Экспортирование...'),
  }
];
</script>