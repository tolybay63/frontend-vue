<template>
  <div class="dashboard-page">
    <div v-if="isLoading" class="loading-overlay">
      <div class="spinner"></div>
      Загрузка данных...
    </div>

    <template v-else>
    <DashboardHeader
      :selected-farm="selectedFarm"
      :farms="farms"
      :is-railway-status-open="isRailwayStatusOpen"
      :railway-view-mode="railwayViewMode"
      @select-farm="selectFarm"
      @toggle-railway-status="toggleRailwayStatus"
      @switch-to-width="switchToWidthMode"
      @switch-to-status="switchToStatusMode"
      @switch-to-skew="switchToSkewMode"
    />

    <RailwaySectionStatus
      v-if="isRailwayStatusOpen"
      :key="railwayViewMode"
      :intermediate-stations="intermediateStations"
      :status-segments="railwayStatusSegments"
      :mode="railwayViewMode"
      :is-loading="isRailwayModeChanging"
    />

    <div class="kpi-grid">
      <KpiCard
        :value="kpi.newIncidents"
        :monthly-value="kpiMonthly.newIncidents"
        label="Новые запросы на сегодня"
        :class="{ 'active-kpi': activeKpiFilter === 'newIncidents' }"
        @click="setActiveKpi('newIncidents')"
      />
      <KpiCard
        :value="kpi.speedRestrictions"
        :monthly-value="kpiMonthly.speedRestrictions"
        label="Ограничение скорости"
        :class="{ 'active-kpi': activeKpiFilter === 'speedRestrictions' }"
        @click="setActiveKpi('speedRestrictions')"
      />
      <KpiCard
        :value="kpi.overdueWorks"
        label="Просроченные работы"
        variant="overdue"
        :class="{ 'active-kpi': activeKpiFilter === 'overdueWorks' }"
        @click="setActiveKpi('overdueWorks')"
      />
      <KpiCard
        :value="kpi.openIncidents"
        :monthly-value="kpiMonthly.openIncidents"
        label="Всего открытых запросов"
        :class="{ 'active-kpi': activeKpiFilter === 'openIncidents' }"
        @click="setActiveKpi('openIncidents')"
      />
    </div>

    <RailwaySection
      :intermediate-stations="intermediateStations"
      :railway-incidents="railwayIncidents"
      :is-loading="isMapLoading"
      :active-kpi-filter="activeKpiFilter"
      @incident-click="handleIncidentClick"
    />

    <QuickActions 
      @add-incident="isAddIncidentModalOpen = true"
      @plan-work="isPlanWorkModalOpen = true"
      @go-to-inspections="goToWorkPlan"
    />

    <div class="main-grid">
      <div class="widget-card no-padding">
        <CalendarWidget 
          :selected-farm-id="selectedFarmId"
          @date-selected="handleDateSelected" 
        />
      </div>

      <WorkPlanWidget
        :activity-title="activityTitle"
        :day-events="dayEvents"
        @event-double-click="handleEventDoubleClick"
      />
    </div>

    <ModalAddIncident
      v-if="isAddIncidentModalOpen"
      @close="isAddIncidentModalOpen = false"
      @update-table="refreshData"
    />
    <ModalPlanWork
      v-if="isPlanWorkModalOpen"
      @close="isPlanWorkModalOpen = false"
      @update-table="refreshData"
    />
    <ModalEditPlan
      v-if="isEditPlanModalOpen"
      :rowData="selectedEvent"
      @close="isEditPlanModalOpen = false"
      @save="handlePlanUpdated"
    />
    </template>
  </div>
</template>

<script setup>  
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import DashboardHeader from '@/features/dashboard/components/DashboardHeader.vue';
import QuickActions from '@/features/dashboard/components/QuickActions.vue';
import WorkPlanWidget from '@/features/work-plan/components/WorkPlanWidget.vue';
import ModalAddIncident from '@/features/incidents/components/ModalAddIncident.vue';
import ModalPlanWork from '@/features/work-plan/components/ModalPlanWork.vue';
import ModalEditPlan from '@/features/work-plan/components/ModalEditPlan.vue';
import KpiCard from '@/features/kpi/components/KpiCard.vue';
import CalendarWidget from '@/features/work-plan/components/CalendarWidget.vue';
import { loadDepartments, loadWorkPlanForKpi, loadIncidentsForKpi, loadRailwayStatus, loadRailwaySkewData, loadSizeIncidentOfMonth } from '@/shared/api/dashboard/dashboardApi';
import RailwaySection from '@/features/dashboard/components/RailwaySection.vue';
import RailwaySectionStatus from '@/features/dashboard/components/RailwaySectionStatus.vue';

const router = useRouter();

const isAddIncidentModalOpen = ref(false);
const isPlanWorkModalOpen = ref(false);
const isEditPlanModalOpen = ref(false);
const isLoading = ref(true);
const isMapLoading = ref(false);
const isRailwayModeChanging = ref(false);
const selectedDate = ref(null); // Добавим ref для хранения выбранной даты
const activeKpiFilter = ref('newIncidents');
const selectedEvent = ref(null);
const isRailwayStatusOpen = ref(false);
const railwayViewMode = ref('status'); // 'status', 'width' или 'skew'

const selectedFarm = ref('Все хозяйства');
const selectedFarmId = ref(null);
const farms = ref(['Все хозяйства']);
const departmentsMap = ref({});

const RAILWAY_TOTAL_KM = 151;

 

const kpi = ref({
  newIncidents: 0,
  speedRestrictions: 0,
  overdueWorks: 0,
  openIncidents: 0,
});

const kpiMonthly = ref({
  newIncidents: 0,
  speedRestrictions: 0,
  openIncidents: 0,
});

const dayEvents = ref([]);
const activityTitle = ref('План работ на день');

const intermediateStations = ref([
  { id: 's1', name: 'Сарыжал', position: 12.58, km: 19.2 },
  { id: 's2', name: 'Шалабай', position: 31.26, km: 47.7 },
  { id: 's3', name: 'Бурсак', position: 46.52, km: 70.3 },
  { id: 's4', name: 'Екаша', position: 58.51, km: 88.4 },
  { id: 's5', name: 'Айыртау', position: 75.83, km: 114.5 },
  { id: 's6', name: 'Улан', position: 88.41, km: 133.7 },
]);

const railwayIncidents = ref([]);
const railwayStatusSegments = ref([]);

const goToWorkPlan = () => {
  router.push({ name: 'Inspections' });
};

const selectFarm = async (farm) => {
  selectedFarm.value = farm;
  
  if (farm === 'Все хозяйства') {
    selectedFarmId.value = null;
  } else {
    selectedFarmId.value = departmentsMap.value[farm];
  }

  // Загружаем KPI и обновляем карту
  await Promise.all([
    loadKpiData(),
    loadRailwayIncidents(activeKpiFilter.value, selectedFarmId.value),
  ]);

  // Обновляем план работ для новой фермы, используя текущую выбранную дату
  const dateToRefresh = selectedDate.value ? formatDateToString(selectedDate.value) : formatDateToString(new Date());
  await handleDateSelected(dateToRefresh);
};

const setActiveKpi = async (filter) => {
  // Если кликнули на уже активный фильтр, ничего не делаем
  if (activeKpiFilter.value === filter) {
    return;
  }
  
  activeKpiFilter.value = filter;
  // Обновляем только данные на карте
  await loadRailwayIncidents(filter, selectedFarmId.value);
};

const formatDateToString = (date) => {
  if (!date) return null;
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const fetchFarms = async () => {
  try {
    const departments = await loadDepartments();
    
    const depsMap = {};
    departments.forEach(dep => {
      depsMap[dep.name] = dep.id;
    });
    departmentsMap.value = depsMap;
    
    farms.value = ['Все хозяйства', ...departments.map(dep => dep.name)];
  } catch (error) {
    console.error("Не удалось загрузить список хозяйств:", error);
  }
};

const loadKpiData = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = formatDateToString(today);

    const objLocationParam = selectedFarmId.value;

    // Новые инциденты сегодня: periodType=71, без status и event
    const newIncidentsPromise = loadIncidentsForKpi(todayStr, 71, objLocationParam, null, null);

    // Ограничение скорости: periodType=11, event=1157
    const speedRestrictionsPromise = loadIncidentsForKpi(todayStr, 11, objLocationParam, null, 1157);

    // Всего открытых инцидентов: periodType=11, status=1
    const openIncidentsPromise = loadIncidentsForKpi(todayStr, 11, objLocationParam, 1, null);

    // Просроченные работы
    const allWorksPromise = loadWorkPlanForKpi(todayStr, null, objLocationParam);

    // Месячные данные
    const newIncidentsMonthlyPromise = loadSizeIncidentOfMonth(objLocationParam, null, null);
    const speedRestrictionsMonthlyPromise = loadSizeIncidentOfMonth(objLocationParam, 1157, null);
    const openIncidentsMonthlyPromise = loadSizeIncidentOfMonth(objLocationParam, null, 1);

    const [newIncidents, speedRestrictions, openIncidents, allWorks, newIncidentsMonthly, speedRestrictionsMonthly, openIncidentsMonthly] = await Promise.all([
      newIncidentsPromise,
      speedRestrictionsPromise,
      openIncidentsPromise,
      allWorksPromise,
      newIncidentsMonthlyPromise,
      speedRestrictionsMonthlyPromise,
      openIncidentsMonthlyPromise
    ]);

    kpi.value.newIncidents = newIncidents.length;
    kpi.value.speedRestrictions = speedRestrictions.length;
    kpi.value.openIncidents = openIncidents.length;
    kpi.value.overdueWorks = allWorks.length;

    kpiMonthly.value.newIncidents = newIncidentsMonthly;
    kpiMonthly.value.speedRestrictions = speedRestrictionsMonthly;
    kpiMonthly.value.openIncidents = openIncidentsMonthly;
  } catch (error) {
    console.error("Ошибка при загрузке KPI:", error);
  }
};

const processIncidents = (rawIncidents, forcedColor = null) => {
  return rawIncidents.map(incident => {
    const startKmValue = (incident.StartKm || 0) + (incident.StartPicket / 10 || 0);
    const position = (startKmValue / RAILWAY_TOTAL_KM) * 100;

    let color;
    if (forcedColor) {
      color = forcedColor;
    } else {
      // Логика по умолчанию, если цвет не задан принудительно
      const statusName = incident.nameStatus ? incident.nameStatus.toLowerCase() : '';
      if (statusName.includes('зарегистрирован')) color = 'red-marker'; 
      else if (statusName.includes('в работе')) color = 'yellow-marker'; 
      else if (statusName.includes('завершен') || statusName.includes('закрыт')) color = 'green-marker';
      else color = 'red-marker'; // Цвет по умолчанию
    }
    

    const description = incident.Description || incident.fullNameWork;

    const rawData = { ...incident, Description: description };

    const title = `${incident.nameCls}: ${description} (${startKmValue.toFixed(2)}км)`;

    return {
      id: incident.id,
      position: position,
      color: color,
      title: title,
      km: startKmValue,
      rawData: rawData,
    };
  });
};

const loadRailwayIncidents = async (filter, farmId) => {
  isMapLoading.value = true;
  try {
    let rawIncidents = [];
    let color = null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = formatDateToString(today);

    switch (filter) {
      case 'newIncidents':
        rawIncidents = await loadIncidentsForKpi(todayStr, 71, farmId, null, null);
        color = 'red-marker';
        break;
      case 'speedRestrictions':
        rawIncidents = await loadIncidentsForKpi(todayStr, 11, farmId, null, 1157);
        color = 'orange-marker';
        break;
      case 'overdueWorks':
        rawIncidents = await loadWorkPlanForKpi(todayStr, null, farmId);
        color = 'purple-marker';
        break;
      case 'openIncidents':
        rawIncidents = await loadIncidentsForKpi(todayStr, 11, farmId, 1, null);
        color = 'red-marker';
        break;
      default:
        // По умолчанию загружаем новые инциденты
        rawIncidents = await loadIncidentsForKpi(todayStr, 71, farmId, null, null);
        color = 'red-marker';
    }

    railwayIncidents.value = processIncidents(rawIncidents, color);
  } catch (error) {
    console.error("Ошибка при загрузке инцидентов:", error);
    railwayIncidents.value = [];
  } finally {
    isMapLoading.value = false;
  }
};

const handleDateSelected = async (dateStr) => {
  selectedDate.value = new Date(dateStr); // Сохраняем выбранную дату
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (date.getTime() === today.getTime()) {
    activityTitle.value = 'План работ на сегодня';
  } else {
    activityTitle.value = `Работы на ${date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}`;
  }

  try {
    // Используем periodType 71 для выбранной даты
    const works = await loadWorkPlanForKpi(dateStr, 71, selectedFarmId.value);
    dayEvents.value = works;
  } catch (error) {
    console.error(`Ошибка при загрузке работ:`, error);
    dayEvents.value = [];
  }
};

const loadRailwayStatusData = async (mode = 'status') => {
  try {
    if (mode === 'skew') {
      // Для режима перекосов загружаем все 4 типа отклонений
      const skewData = await loadRailwaySkewData(null);
      railwayStatusSegments.value = skewData;
    } else {
      // Для режимов оценки и ширины используем старый метод
      const relobj = mode === 'width' ? 1700 : 2525;
      const statusData = await loadRailwayStatus(null, relobj);
      railwayStatusSegments.value = statusData;
    }
  } catch (error) {
    console.error('Ошибка при загрузке статуса пути:', error);
    railwayStatusSegments.value = [];
  }
};

const refreshData = () => {
  isLoading.value = true;
  Promise.all([
    loadKpiData(),
    loadRailwayIncidents(activeKpiFilter.value, selectedFarmId.value),
    loadRailwayStatusData(),
    handleDateSelected(formatDateToString(new Date()))
  ]).finally(() => {
    isLoading.value = false;
  });
};

const handleEventDoubleClick = (event) => {
  selectedEvent.value = {
    id: event.id,
    objWork: event.objWork,
    objObject: event.objObject,
    objLocationClsSection: event.objLocationClsSection,
    planDate: event.PlanDateEnd,
    StartKm: event.StartKm,
    StartPicket: event.StartPicket,
    FinishKm: event.FinishKm,
    FinishPicket: event.FinishPicket,
    rawData: event,
  };
  isEditPlanModalOpen.value = true;
};

const handlePlanUpdated = () => {
  isEditPlanModalOpen.value = false;
  refreshData();
};

const handleIncidentClick = (incident) => {
  console.log('Clicked incident:', incident);
};

const toggleRailwayStatus = () => {
  isRailwayStatusOpen.value = !isRailwayStatusOpen.value;
};

const switchToWidthMode = async () => {
  // Если уже в режиме ширины и открыт, то закрываем
  if (railwayViewMode.value === 'width' && isRailwayStatusOpen.value) {
    isRailwayStatusOpen.value = false;
    return;
  }

  isRailwayModeChanging.value = true;
  railwayViewMode.value = 'width';
  isRailwayStatusOpen.value = true;
  await loadRailwayStatusData('width');
  isRailwayModeChanging.value = false;
};

const switchToStatusMode = async () => {
  // Если уже в режиме оценки и открыт, то закрываем
  if (railwayViewMode.value === 'status' && isRailwayStatusOpen.value) {
    isRailwayStatusOpen.value = false;
    return;
  }

  isRailwayModeChanging.value = true;
  railwayViewMode.value = 'status';
  isRailwayStatusOpen.value = true;
  await loadRailwayStatusData('status');
  isRailwayModeChanging.value = false;
};

const switchToSkewMode = async () => {
  // Если уже в режиме перекосов и открыт, то закрываем
  if (railwayViewMode.value === 'skew' && isRailwayStatusOpen.value) {
    isRailwayStatusOpen.value = false;
    return;
  }

  isRailwayModeChanging.value = true;
  railwayViewMode.value = 'skew';
  isRailwayStatusOpen.value = true;
  await loadRailwayStatusData('skew');
  isRailwayModeChanging.value = false;
};

onMounted(() => {
  fetchFarms().then(() => {
    refreshData();
  });
});
</script>

<style scoped>
.dashboard-page {
  padding: 24px;
  background: #f7fafc;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden; 
  font-family: system-ui;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
  gap: 24px;
  margin-bottom: 32px;
}

.main-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 24px;
}

.widget-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  max-width: 100%;
  overflow-x: auto;
}

.widget-card.no-padding {
  padding: 0;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  font-size: 16px;
  color: #4a5568;
  gap: 16px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e2e8f0;
  border-top-color: #3182ce;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>