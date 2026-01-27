<template>
  <TableWrapper
    ref="tableWrapperRef"
    title="Журнал осмотров и проверок"
    :columns="columns"
    :actions="tableActions"
    :limit="limit"
    :loadFn="loadInspectionsWrapper"
    :datePickerConfig="datePickerConfig"
    :dropdownConfig="dropdownConfig"
    :showFilters="true"
    :filters="filters"
    :getRowClassFn="getRowClassFn"
    :storageKey="'inspections'"
    @update:filters="onFiltersUpdate"
    @row-dblclick="onRowDoubleClick"
  />
  <WorkCardInfoModal
    v-if="showWorkCardInfoModal"
    :record="selectedRecord"
    :inspectionId="selectedRecord?.rawData?.id"
    :section="selectedRecord?.name"
    :date="selectedRecord?.factDate"
    :sectionId="selectedRecord?.rawData?.objLocationClsSection"
    :sectionPv="selectedRecord?.rawData?.pvLocationClsSection"
    @delete-work="handleInspectionDeleted"
    @close="showWorkCardInfoModal = false"
  />
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import TableWrapper from '@/app/layouts/Table/TableWrapper.vue';
import { loadInspections } from '@/shared/api/inspections/inspectionApi';
import { loadPeriodTypes } from '@/shared/api/periods/periodApi';
import WorkStatus from '@/features/work-log/components/WorkStatus.vue';
import WorkCardInfoModal from '@/features/work-log/components/WorkCardInfoModal.vue';
import { usePermissions } from '@/shared/api/permissions/usePermissions';

const { hasPermission } = usePermissions();
const canInsert = computed(() => hasPermission('ins:ins'));

const router = useRouter();

const limit = 10;
const tableWrapperRef = ref(null);

// Новые реактивные переменные для модального окна
const showWorkCardInfoModal = ref(false);
const selectedRecord = ref(null);

// Проверяем флаг навигации - если пришли не со связанных страниц, очищаем фильтры
const checkAndClearFilters = () => {
  const navigationFlag = localStorage.getItem('inspectionsNavigation');

  if (navigationFlag !== 'fromRelatedPage') {
    // Пришли с другой страницы (sidebar) - очищаем все фильтры
    localStorage.removeItem('inspectionsDate');
    localStorage.removeItem('inspectionsPeriodType');
    localStorage.removeItem('inspections_columnFilters');
  }

  // Удаляем флаг после проверки
  localStorage.removeItem('inspectionsNavigation');
};

// Синхронно восстанавливаем дату из localStorage при инициализации
const getSavedDate = () => {
  checkAndClearFilters();

  const savedDate = localStorage.getItem('inspectionsDate');
  if (savedDate) {
    return new Date(savedDate);
  }
  return new Date();
};

const filters = ref({
  date: getSavedDate(),
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

// Обработчик изменения фильтров - сохраняем в localStorage
const onFiltersUpdate = (newFilters) => {
  filters.value = newFilters;

  // Сохраняем фильтры в localStorage
  if (newFilters.date) {
    localStorage.setItem('inspectionsDate', formatDateToString(newFilters.date));
  }
  if (newFilters.periodType?.value) {
    localStorage.setItem('inspectionsPeriodType', newFilters.periodType.value);
  }
};

onMounted(async () => {
  try {
    const types = await loadPeriodTypes();

    dropdownConfig.value.options = types;

    // Восстанавливаем тип периода из localStorage
    const savedPeriodType = localStorage.getItem('inspectionsPeriodType');

    if (savedPeriodType) {
      const savedType = types.find(t => t.value === parseInt(savedPeriodType));
      if (savedType) {
        filters.value.periodType = savedType;
      } else {
        const defaultType = types.find(t => t.value === 71);
        filters.value.periodType = defaultType || types[0] || null;
      }
    } else {
      const defaultType = types.find(t => t.value === 71);
      if (defaultType) {
        filters.value.periodType = defaultType;
      } else if (types.length > 0) {
        filters.value.periodType = types[0];
      }
    }

    // Перезагружаем таблицу с восстановленными фильтрами
    if (tableWrapperRef.value) {
      tableWrapperRef.value.refreshTable();
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
    return startPart;
  }
  return 'Координаты отсутствуют';
};

const loadInspectionsWrapper = async ({ page, limit, filters: filterValues }) => {
  try {
    const objLocation = localStorage.getItem('objLocation');
    if (!objLocation) {
      return { total: 0, data: [] };
    }

    const selectedDate = filterValues.date ? formatDateToString(filterValues.date) : formatDateToString(new Date());
    const periodTypeId = filterValues.periodType?.value ?? 71;

    const records = await loadInspections(selectedDate, periodTypeId);
    const totalRecords = records.length;
    const start = (page - 1) * limit;
    const end = page * limit;

    const sliced = records.slice(start, end).map((r, index) => ({
      index: null,
      id: r.id,
      objWorkPlan: r.objWorkPlan,
      work: r.fullNameWork,
      name: r.nameLocationClsSection,
      location: r.nameSection,
      object: r.fullNameObject,
      coordinates: formatCoordinates(r.StartKm, r.StartPicket, r.StartLink, r.FinishKm, r.FinishPicket, r.FinishLink),
      planDate: r.PlanDateEnd,
      factDate: r.FactDateEnd,
      inspector: r.fullNameUser,
      deviation: r.nameDeviationDefect,
      reason: r.ReasonDeviation,
      rawData: r,
      objWork: r.objWork,
      objObject: r.objObject,
      status: {
        showCheck: r.ActualDateEnd !== '0000-01-01',
        showMinus: r.ActualDateEnd === '0000-01-01',
        showHammer: r.nameFlagDefect === 'да',
        showRuler: r.nameFlagParameter === 'да',
      },
      // Добавляем флаг для стилизации строки
      hasDefects: r.nameFlagDefect === 'да',
    }));

    return {
      total: totalRecords,
      data: sliced,
    };
  } catch (e) {
    console.error('Ошибка при загрузке данных инспекций:', e);
    return { total: 0, data: [] };
  }
};

const onRowDoubleClick = (row) => {

  selectedRecord.value = row;

  if (!row.rawData?.id) {
    console.warn('Отсутствует ID инспекции. Открытие окна Defect/Parameters невозможно.');
    return;
  }

  // Сохраняем фильтры перед открытием модального окна
  localStorage.setItem('inspectionsDate', formatDateToString(filters.value.date));
  localStorage.setItem('inspectionsPeriodType', filters.value.periodType?.value || '71');

  showWorkCardInfoModal.value = true;
};

const handleInspectionDeleted = () => {
  showWorkCardInfoModal.value = false;
  selectedRecord.value = null;
  handleTableUpdate();
};

// Функция для условного форматирования строки
const getRowClassFn = (row) => {
  return {
    'row-has-defects': row.hasDefects,
  };
};

const columns = [
  { key: 'id', label: '№' },
  { key: 'objWorkPlan', label: 'ссылка на план' },
  { key: 'work', label: 'Наименование работы' },
  { key: 'name', label: 'Участок' },
  { key: 'location', label: 'Место' },
  { key: 'object', label: 'Объект' },
  { key: 'coordinates', label: 'Координаты' },
  { key: 'planDate', label: 'Плановая дата' },
  { key: 'factDate', label: 'Фактическая дата' },
  { key: 'status', label: 'Статус работы', component: WorkStatus,}
];

const tableActions = computed(() => [
  {
    label: 'Добавить запись',
    icon: 'Plus',
    onClick: () => {
      // Сохраняем данные фильтров в localStorage для использования на странице добавления
      localStorage.setItem('inspectionsDate', formatDateToString(filters.value.date));
      localStorage.setItem('inspectionsPeriodType', filters.value.periodType?.value || '71');

      // Устанавливаем флаг что переходим на связанную страницу
      localStorage.setItem('inspectionsNavigation', 'fromRelatedPage');

      router.push({ name: 'InspectionRecord' });
    },
    show: canInsert.value,
  },
  // {
  //   label: 'Экспорт',
  //   icon: 'Download',
  //   onClick: () => console.log('Экспортирование инспекций...'),
  //   show: true,
  // },
].filter(action => action.show));
</script>