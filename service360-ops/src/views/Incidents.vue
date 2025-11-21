<template>
  <TableWrapper
    ref="tableWrapperRef"
    title="Журнал событий и запросов на работы"
    :columns="columns"
    :actions="tableActions"
    :limit="limit"
    :loadFn="loadIncidentsWrapper"
    :datePickerConfig="datePickerConfig"
    :dropdownConfig="dropdownConfig"
    :showFilters="true"
    :filters="filters"
    :getRowClassFn="getRowClassFn"
    @update:filters="filters = $event"
    @row-dblclick="onRowDoubleClick"
  >
  <template #modals>
      <ModalIncidentInfo
        v-if="showIncidentInfoModal && selectedRecord"
        :rowData="selectedRecord"
        @deleted="handleIncidentDeleted"
        @close="showIncidentInfoModal = false; selectedRecord = null"
      />
    </template>
  </TableWrapper>

  <ModalAddIncident
    v-if="showAddIncidentModal"
    @close="closeAddIncidentModal"
    @update-table="handleTableUpdate"
  />

  <ModalAssignWork
    v-if="showAssignWorkModal"
    :incidents="loadedIncidents"
    @close="showAssignWorkModal = false"
    @assign-work="handleWorkAssigned"
  />
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import TableWrapper from '@/app/layouts/Table/TableWrapper.vue';
import { loadIncidents } from '@/shared/api/incidents/incidentApi';
import { loadPeriodTypes } from '@/shared/api/periods/periodApi';
import { usePermissions } from '@/shared/api/permissions/usePermissions';

import ModalAddIncident from '@/features/incidents/components/ModalAddIncident.vue';
import ModalIncidentInfo from '@/features/incidents/components/ModalIncidentInfo.vue';
import ModalAssignWork from '@/features/work-plan/components/ModalAssignWork.vue';

const router = useRouter();

const { hasPermission } = usePermissions();
const canInsert = computed(() => hasPermission('inc:ins'));
const canAssign = computed(() => hasPermission('inc:assign'));

const limit = 10;
const tableWrapperRef = ref(null);

const showIncidentInfoModal = ref(false);
const showAddIncidentModal = ref(false);
const showAssignWorkModal = ref(false);
const selectedRecord = ref(null);
const loadedIncidents = ref([]);

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

const closeAddIncidentModal = () => {
  showAddIncidentModal.value = false;
  handleTableUpdate(); 
};

const handleWorkAssigned = () => {
  showAssignWorkModal.value = false;
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
    return `${startPart} - ${finishPart}`;
  } else if (startPart) {
    return startPart;
  }
  return 'Координаты отсутствуют';
};

const loadIncidentsWrapper = async ({ page, limit, filters: filterValues }) => {
  try {
    const objLocation = localStorage.getItem('objLocation');
    if (!objLocation) {
      return { total: 0, data: [] };
    }

    const selectedDate = filterValues.date ? formatDateToString(filterValues.date) : formatDateToString(new Date());
    const periodTypeId = filterValues.periodType?.value ?? 41;
    const records = await loadIncidents(selectedDate, periodTypeId);
    const totalRecords = records.length;
    const start = (page - 1) * limit;
    const end = page * limit;

    const sliced = records.slice(start, end).map((r, index) => {
      const registrationDateTime = r.RegistrationDateTime;
      let date = null;
      let time = null;
      
      if (registrationDateTime && typeof registrationDateTime === 'string') {
        [date, time] = registrationDateTime.split('T');
      }
      
      return {
        index: null,
        id: r.id,
        name: r.name,
        nameCls: r.nameCls,
        object: r.nameObject,
        coordinates: formatCoordinates(r.StartKm, r.StartPicket, r.StartLink, r.FinishKm, r.FinishPicket, r.FinishLink),
        statusName: r.nameStatus, 
        criticality: r.nameCriticality || 'не указана',
        date: date,
        time: time ? time.substring(0, 8) : null,
        description: r.Description,
        source: r.objFault || r.objParameterLog,
        rawData: r,
        hasDefects: r.nameFlagDefect,
        fullNameWork: r.fullNameWork,
        PlanDateEnd: r.PlanDateEnd,
        FactDateEnd: r.FactDateEnd === '0000-01-01' ? null : r.FactDateEnd,
      };
    });

    loadedIncidents.value = sliced;

    return {
      total: totalRecords,
      data: sliced,
    };
  } catch (e) {
    console.error('Ошибка при загрузке данных инцидентов:', e);
    return { total: 0, data: [] };
  }
};

const onRowDoubleClick = (row) => {
  selectedRecord.value = row;
  
  if (!row.rawData?.id) {
    console.warn('Отсутствует ID инцидента. Открытие модального окна невозможно.');
    return;
  }
  showIncidentInfoModal.value = true;
};

const handleIncidentDeleted = () => {
  showIncidentInfoModal.value = false;
  selectedRecord.value = null;
  handleTableUpdate();
};

const getRowClassFn = (row) => {
  return {
    'row-has-defects': row.hasDefects,
  };
};

const columns = [
  { key: 'id', label: '№' },
  { key: 'name', label: 'Наименование' },
  { key: 'source', label: 'Ссылка на источник' },
  { key: 'nameCls', label: 'Источник' },
  { key: 'object', label: 'Объект' },
  { key: 'coordinates', label: 'Координаты' },
  { key: 'criticality', label: 'Критичность' },
  { key: 'statusName', label: 'Статус'},
  { key: 'date', label: 'Дата' },
  { key: 'time', label: 'Время' },
  { key: 'description', label: 'Описание' },
  { key: 'fullNameWork', label: 'Назначенная работа' },
  { key: 'PlanDateEnd', label: 'Дата (план)' },
  { key: 'FactDateEnd', label: 'Дата (факт)' },
];

const tableActions = computed(() => [
  {
    label: 'Добавить запись',
    icon: 'Plus',
    onClick: () => {
      showAddIncidentModal.value = true;
    },
    show: canInsert.value,
  },
  {
    label: 'Назначить работу',
    icon: 'ClipboardList',
    onClick: () => {
      showAssignWorkModal.value = true;
    },
    show: canAssign.value,
  },
  {
    label: 'Экспорт',
    icon: 'Download',
    onClick: () => console.log('Экспортирование инцидентов...'),
    show: true,
  },
].filter(action => action.show));
</script>

<style scoped>
.row-has-defects {
  background-color: #ffeaea;
}
</style>