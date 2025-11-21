<template>
  <TableWrapper
    ref="tableWrapperRef"
    title="Журнал работ"
    :columns="columns"
    :actions="tableActions"
    :limit="limit"
    :loadFn="loadWorkLogWrapper"
    :datePickerConfig="datePickerConfig"
    :dropdownConfig="dropdownConfig"
    :showFilters="true"
    :filters="filters"
    :getRowClassFn="getRowClassFn"
    @update:filters="filters = $event"    
    @row-dblclick="onRowDoubleClick"
  />
  </template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import TableWrapper from '@/app/layouts/Table/TableWrapper.vue';
import { loadTaskLog, loadObjTaskLog } from '@/shared/api/execution/executionApi';
import { loadPeriodTypes } from '@/shared/api/periods/periodApi';
import { usePermissions } from '@/shared/api/permissions/usePermissions';
// ResourceEditingModal больше не импортируется

const { hasPermission } = usePermissions();
const canInsert = computed(() => hasPermission('ins:ins'));

const router = useRouter();

const limit = 10;
const tableWrapperRef = ref(null);
// Состояния модального окна удалены: isModalOpen, selectedRecord, selectedRecordForModal


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

const onRowDoubleClick = async (row) => {
  const workLogId = row.id;
  if (!workLogId) {
    console.error("ID записи журнала работ отсутствует.", row);
    return;
  }
  
  try {
    // Сначала вызываем API, как вы и просили
    const data = await loadObjTaskLog(workLogId); 
    console.log(`Данные для записи с ID ${workLogId}:`, data); 

    // Затем выполняем переход на страницу формы
    router.push({ 
      name: 'WorkLogForm', 
      params: { id: workLogId } 
    });
  } catch (error) {
    console.error('Ошибка при загрузке данных записи журнала работ:', error);
  }
};

// Функция handleTableUpdate больше не нужна, так как модальное окно не вызывает событие 'saved'.
// Но оставим ее на случай, если вы захотите вызывать refreshTable в другом месте:
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

/**
 * Преобразует строку даты (YYYY-MM-DD) в формат DD.MM.YYYY.
 * @param {string} dateStr - Строка даты.
 * @returns {string} Отформатированная дата или прочерк.
 */
const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  // Проверяем формат YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-');
    return `${day}.${month}.${year}`;
  }
  return dateStr;
};

/**
 * Формирует информацию о датах (Начало и Конец) для ячейки таблицы.
 * @param {object} row - Объект с данными строки.
 * @returns {string} HTML-строка с датами.
 */
const formatDateInfo = (row) => {
  const startDate = formatDate(row.PlanDateStart);
  const endDate = formatDate(row.PlanDateEnd);
  
  return `<span class="label-strong">Начало:</span> ${startDate}<br><span class="label-strong">Конец:</span> ${endDate}`;
};

const formatVolumeInfo = (row) => {
  const plan = row.ValuePlan !== null && row.ValuePlan !== undefined ? row.ValuePlan : '-';
  const fact = row.ValueFact !== null && row.ValueFact !== undefined ? row.ValueFact : '-';

  return `<span class="label-strong">план:</span> ${plan}<br><span class="label-strong">факт:</span> ${fact}`;
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
    return `${startPart} - ${finishPart}`;
  } else if (startPart) {
    return `${startPart}`;
  }
  return 'Координаты отсутствуют';
};

const formatGeneralInfo = (row) => {
  const parts = [];
  
  if (row.fullNameTask) {
    parts.push(`<span class="label-strong">Задача:</span> ${row.fullNameTask}`);
  }

  if (row.fullNameWork) {
    parts.push(`<span class="label-strong">Работа:</span> ${row.fullNameWork}`);
  }
  
  if (row.nameLocationClsSection) {
    parts.push(`<span class="label-strong">Участок:</span> ${row.nameLocationClsSection}`);
  }
  
  if (row.nameSection) {
    parts.push(`<span class="label-strong">Место:</span> ${row.nameSection}`);
  }
  
  if (row.fullNameObject) {
    parts.push(`<span class="label-strong">Объект:</span> ${row.fullNameObject}`);
  }
  
  if (row.StartKm !== null || row.StartPicket !== null || row.FinishKm !== null || row.FinishPicket !== null) {
    const coords = formatCoordinates(row.StartKm, row.StartPicket, null, row.FinishKm, row.FinishPicket, null);
    parts.push(`<span class="label-strong">Координаты:</span> ${coords}`);
  }
  
  return parts.join('\n');
};

const loadWorkLogWrapper = async ({ page, limit, filters: filterValues }) => {
  try {
    const selectedDate = filterValues.date ? formatDateToString(filterValues.date) : formatDateToString(new Date());
    const periodTypeId = filterValues.periodType?.value ?? 11;

    const records = await loadTaskLog(selectedDate, periodTypeId);

    const totalRecords = records.length;
    const start = (page - 1) * limit;
    const end = page * limit;

    const sliced = records.slice(start, end).map((r) => {
      return {
        index: null,
        id: r.id,
        objWorkPlan: r.objWorkPlan,
        dateInfo: formatDateInfo(r),
        volumeInfo: formatVolumeInfo(r),
        
        planDateStart: r.PlanDateStart,
        planDateEnd: r.PlanDateEnd,
        generalInfo: formatGeneralInfo(r),
        description: r.description || '-',
        rawData: r,
        objWork: r.objWork,
        objObject: r.objObject,
        StartKm: r.StartKm,
        StartPicket: r.StartPicket,
        FinishKm: r.FinishKm,
        FinishPicket: r.FinishPicket,
        nameLocationClsSection: r.nameLocationClsSection,
        objLocationClsSection: r.objLocationClsSection,
        nameSection: r.nameSection,
        fullNameObject: r.fullNameObject,
      };
    });

    return {
      total: totalRecords,
      data: sliced,
    };
  } catch (e) {
    console.error('Ошибка при загрузке данных для журнала работ:', e);
    return { total: 0, data: [] };
  }
};

const getRowClassFn = (row) => {
  return {};
};

// Обновленный массив столбцов с объединенными полями
const columns = [
  { key: 'id', label: '№' },
  { key: 'generalInfo', label: 'Общая информация' },
  { key: 'dateInfo', label: 'Дата', width: 150 }, // Колонка "Дата"
  { key: 'volumeInfo', label: 'Объем', width: 100 }, // Колонка "Объем"
  { key: 'objWorkPlan', label: 'Ссылка на план' },
];

const tableActions = computed(() => [
  {
    label: 'Добавить запись',
    icon: 'Plus',
    onClick: () => {
      console.log('Добавление новой записи в журнал работ...');
    },
    show: canInsert.value,
  },
  {
    label: 'Экспорт',
    icon: 'Download',
    onClick: () => console.log('Экспортирование журнала работ...'),
    show: true,
  },
].filter(action => action.show));
</script>