<template>
  <TableWrapper
    ref="tableWrapperRef"
    title="Журнал планирования ресурсов"
    :columns="columns"
    :actions="tableActions"
    :limit="limit"
    :loadFn="loadInspectionsWrapper"
    :datePickerConfig="datePickerConfig"
    :dropdownConfig="dropdownConfig"
    :showFilters="true"
    :filters="filters"
    :getRowClassFn="getRowClassFn"
    @update:filters="filters = $event"    
    @row-dblclick="onRowDoubleClick"
  />
  <ResourceEditingModal
    v-if="isModalOpen"
    :record="selectedRecordForModal"
    :section="selectedRecordForModal?.name"
    :date="selectedRecordForModal?.planDateEnd"
    @close="isModalOpen = false"
    @saved="handleTableUpdate"
  />
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import TableWrapper from '@/app/layouts/Table/TableWrapper.vue';
import { loadPlanCorrectional } from '@/shared/api/repairs/repairApi';
import { loadPeriodTypes } from '@/shared/api/periods/periodApi';
import { usePermissions } from '@/shared/api/permissions/usePermissions';
import ResourceEditingModal from '@/features/resource-planning/components/ResourceEditingModal.vue';

const { hasPermission } = usePermissions();
const canInsert = computed(() => hasPermission('ins:ins'));

const router = useRouter();

const limit = 10;
const tableWrapperRef = ref(null);
const isModalOpen = ref(false);
const selectedRecord = ref(null);
const selectedRecordForModal = ref(null);


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

const onRowDoubleClick = (row) => {
  // `row` - это объект, который мы создаем в `loadInspectionsWrapper`
  selectedRecord.value = row;

  // `row.rawData` содержит исходный объект с бэкенда
  const rawData = row.rawData;

  if (rawData) {
    // Формируем объект для WorkHeaderInfo согласно вашему запросу
    selectedRecordForModal.value = {
      id: rawData.id,
      work: rawData.fullNameWork,
      name: rawData.nameLocationClsSection, // Участок
      location: rawData.nameSection, // Место
      objectType: 'нет данных', // Тип объекта
      object: rawData.fullNameObject, // Объект
      coordinates: formatCoordinates(rawData.StartKm, rawData.StartPicket, null, rawData.FinishKm, rawData.FinishPicket, null),
      planDateEnd: rawData.PlanDateEnd,
      rawData: rawData, // Сохраняем исходные данные на всякий случай
    };
    isModalOpen.value = true;
  } else {
    console.error("rawData отсутствует в выбранной строке. Невозможно открыть модальное окно.", row);
  }
};

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

const formatDateRange = (startDate, endDate) => {
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    // Если дата в формате YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split('-');
      return `${day}.${month}.${year}`;
    }
    return dateStr;
  };

  const start = formatDate(startDate);
  const end = formatDate(endDate);

  if (start && end) {
    return `<span class="label-strong">Начало:</span> ${start}\n<span class="label-strong">Конец:</span> ${end}`;
  } else if (start) {
    return `<span class="label-strong">Начало:</span> ${start}`;
  } else if (end) {
    return `<span class="label-strong">Конец:</span> ${end}`;
  }
  
  return '—';
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

const formatTaskInfo = (row) => {
  const parts = [];
  
  if (row.fullNameTask) {
    parts.push(`<span class="label-strong">Задача:</span> ${row.fullNameTask}`);
  }
  
  if (row.ValuePlan !== null && row.ValuePlan !== undefined) {
    parts.push(`<span class="label-strong">Объем:</span> ${row.ValuePlan}`);
  }
  
  const dateRange = formatDateRange(row.PlanDateStart, row.PlanDateEnd);
  if (dateRange && dateRange !== '—') {
    parts.push(dateRange);
  }
  
  return parts.join('\n');
};

const formatResources = (taskLogId, resourceRecords) => {
  if (!taskLogId || !resourceRecords || resourceRecords.length === 0) {
    return { materials: '—', services: '—', tools: '—', equipment: '—', performers: '—' };
  }

  const materials = [];
  const services = [];
  const tools = [];
  const equipment = [];
  const performers = [];

  for (const resource of resourceRecords) {
    if (resource.objTaskLog === taskLogId) {
      if (resource.objMaterial) {
        materials.push(`${resource.nameMaterial}, ${resource.Value} ${resource.nameMeasure}`);
      } else if (resource.objTpService) {
        services.push(`${resource.nameTpService}, ${resource.Value} ед.`);
      } else if (resource.idTypTool) { 
        tools.push(`${resource.nameTypTool}, ${resource.Value} ед.`);
      } else if (resource.fvTypEquipment) {
        const quantity = resource.Quantity || 0;
        const value = resource.Value || 0;
        equipment.push(`${resource.nameTypEquipment}, ${quantity} ед., ${value} час;`);
      } else if (resource.fvPosition) {
        const quantity = resource.Quantity || 0;
        const value = resource.Value || 0;
        performers.push(`${resource.namePosition}, ${quantity} чел., ${value} час;`);
      }
    }
  }

  const formatWithEllipsis = (items) => {
    if (items.length === 0) return '—';
    if (items.length > 5) {
      return items.slice(0, 5).join('\n') + '\n...';
    }
    return items.join('\n');
  };

  return {
    materials: formatWithEllipsis(materials),
    services: formatWithEllipsis(services),
    tools: formatWithEllipsis(tools),
    equipment: formatWithEllipsis(equipment),
    performers: formatWithEllipsis(performers),
  };
};

const loadInspectionsWrapper = async ({ page, limit, filters: filterValues }) => {
  try {
    const objLocation = localStorage.getItem('objLocation');
    if (!objLocation) {
      return { total: 0, data: [] };
    }

    const selectedDate = filterValues.date ? formatDateToString(filterValues.date) : formatDateToString(new Date());
    const periodTypeId = filterValues.periodType?.value ?? 41;

    const result = await loadPlanCorrectional(selectedDate, periodTypeId);
    const storeRecords = result?.store?.records || [];
    const resourceRecords = result?.resource?.records || [];

    const totalRecords = storeRecords.length;
    const start = (page - 1) * limit;
    const end = page * limit;

    const sliced = storeRecords.slice(start, end).map((r, index) => {
      const resources = formatResources(r.id, resourceRecords);
      return {
      index: null,
      id: r.id,
      objWorkPlan: r.objWorkPlan,
      taskInfo: formatTaskInfo(r),      materials: resources.materials,
      services: resources.services,
      tools: resources.tools,
      equipment: resources.equipment,
      performers: resources.performers,
      planDateStart: r.PlanDateStart,
      planDateEnd: r.PlanDateEnd,
      generalInfo: formatGeneralInfo(r),
      description: r.description || '—',
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
    }});

    return {
      total: totalRecords,
      data: sliced,
    };
  } catch (e) {
    console.error('Ошибка при загрузке данных для планирования ресурсов:', e);
    return { total: 0, data: [] };
  }
};

const getRowClassFn = (row) => {
  return {
    'row-has-defects': row.hasDefects,
  };
};

const columns = [
  { key: 'id', label: '№' },
  { key: 'taskInfo', label: 'Задача' },
  { key: 'generalInfo', label: 'Общая информация' },
  { key: 'materials', label: 'Материалы' },
  { key: 'services', label: 'Услуги' },
  { key: 'tools', label: 'Инструменты' },
  { key: 'equipment', label: 'Техника' },
  { key: 'performers', label: 'Исполнители' },
  { key: 'objWorkPlan', label: 'ссылка на план' },
];

const tableActions = computed(() => [
  {
    label: 'Добавить запись',
    icon: 'Plus',
    onClick: () => {
      router.push({ name: 'ResourcePlanningRecord' });
    },
    show: canInsert.value,
  },
  {
    label: 'Экспорт',
    icon: 'Download',
    onClick: () => console.log('Экспортирование инспекций...'),
    show: true,
  },
].filter(action => action.show));
</script>