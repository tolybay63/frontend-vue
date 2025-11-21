<template>
  <TableWrapper
    ref="tableWrapperRef"
    title="Журнал параметров"
    :columns="columns"
    :actions="tableActions"
    :limit="limit"
    :loadFn="loadParameterLogWrapper"
    :datePickerConfig="datePickerConfig"
    :dropdownConfig="dropdownConfig"
    :showFilters="true"
    :filters="filters"
    :getRowClassFn="getRowClassFn"
    @update:filters="filters = $event"
    @row-dblclick="onRowDoubleClick"
  >
    <template #modals="{ selectedRow, showEditModal, closeModals }">
    </template>
  </TableWrapper>

  <ModalParameterLogInfo
    v-if="isModalOpen"
    :rowData="selectedRowData"
    @close="closeModal"
    @deleted="handleParameterDeleted"
  />
</template>

<script setup>
import { ref, onMounted } from 'vue';
import TableWrapper from '@/app/layouts/Table/TableWrapper.vue';
import ModalParameterLogInfo from '@/features/parameters/components/ModalParameterLogInfo.vue';
import { loadParameterLog } from '@/shared/api/parameters/parameterLogApi';
import { loadPeriodTypes } from '@/shared/api/periods/periodApi';

const limit = 10;
const tableWrapperRef = ref(null);
const isModalOpen = ref(false);
const selectedRowData = ref(null);

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

const handleTableUpdate = () => {
  if (tableWrapperRef.value && tableWrapperRef.value.refreshTable) {
    tableWrapperRef.value.refreshTable();
  }
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

const loadParameterLogWrapper = async ({ page, limit, filters: filterValues }) => {
  try {
    const objLocation = localStorage.getItem('objLocation');
    if (!objLocation) {
      return { total: 0, data: [] };
    }

    const selectedDate = filterValues.date ? formatDateToString(filterValues.date) : formatDateToString(new Date());
    const periodTypeId = filterValues.periodType?.value ?? 41;

    const records = await loadParameterLog(selectedDate, periodTypeId);
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
        FactDateEnd: r.FactDateEnd,
        nameLocationClsSection: r.nameLocationClsSection,
        nameSection: r.nameSection,
        nameObject: r.nameObject,
        coordinates: coordinatesString,
        nameComponent: r.nameComponent,
        nameComponentParams: r.nameComponentParams,
        ParamsLimitMin: r.ParamsLimitMin,
        ParamsLimitMax: r.ParamsLimitMax,
        ParamsLimit: r.ParamsLimit,
        nameOutOfNorm: r.nameOutOfNorm,
        Description: r.Description, 
        date: r.CreationDateTime,
        CreationTime: r.CreationDateTime ? r.CreationDateTime.split('T')[1].substring(0, 8) : null,
        rawData: r,
        hasDeviation: r.pvOutOfNorm !== 1300,
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
  selectedRowData.value = row;
  isModalOpen.value = true;
};

const closeModal = () => {
  isModalOpen.value = false;
  selectedRowData.value = null;
};

const handleParameterDeleted = () => {
  closeModal();
  handleTableUpdate();
};

const getRowClassFn = (row) => {
  return {
    'row-has-deviation': row.hasDeviation,
  };
};

const columns = [
  { key: 'index', label: '№' },
  { key: 'objInspection', label: 'ссылка на работу' },
  { key: 'FactDateEnd', label: 'Дата проверки' },
  { key: 'nameLocationClsSection', label: 'Участок' },
  // { key: 'nameSection', label: 'Место' },
  { key: 'nameObject', label: 'Объект', minWidth: 250 },
  { key: 'coordinates', label: 'Координаты', width: 220 },
  { key: 'nameComponent', label: 'Компонент', minWidth: 200 },
  { key: 'nameComponentParams', label: 'Параметр', minWidth: 200 },
  { key: 'ParamsLimitMin', label: 'MIN Значение' },
  { key: 'ParamsLimitMax', label: 'MAX Значение' },
  { key: 'ParamsLimit', label: 'Значение' },
  { key: 'nameOutOfNorm', label: 'Отклонение' },
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