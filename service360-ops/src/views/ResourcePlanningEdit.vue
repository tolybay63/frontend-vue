<template>
  <div class="resource-planning-edit-page">
    <div class="header">
      <BackButton @click="goBack" />
      <h1>Редактирование ресурсов</h1>
    </div>

    <ResourceInfoSection
      v-if="recordData"
      :recordData="recordData"
      :showActionButton="false"
    />

    <div class="cards-section" v-if="recordData">
      <ResourceCard
        title="Материалы"
        icon="package"
        :items="recordData.materials"
        :is-active="activeTab === 'materials'"
        @click="setActiveTab('materials')" />
      <ResourceCard
        title="Инструменты"
        icon="wrench"
        :items="recordData.tools"
        :is-active="activeTab === 'tools'"
        is-tool
        @click="setActiveTab('tools')"
      />
      <ResourceCard
        title="Техника"
        icon="truck"
        :items="recordData.equipment"
        :is-active="activeTab === 'equipment'"
        is-equipment
        @click="setActiveTab('equipment')"
      />
      <ResourceCard
        title="Услуги"
        icon="briefcase"
        :items="recordData.services"
        :is-active="activeTab === 'services'"
        @click="setActiveTab('services')"
      />
      <ResourceCard
        title="Исполнители"
        icon="users"
        :items="recordData.performers"
        :is-active="activeTab === 'performers'"
        is-performer
        @click="setActiveTab('performers')"
      />
    </div>

    <div class="table-transition-wrapper">
      <Transition name="fade-table" mode="out-in">
        <ResourcePlanningTable
          v-if="recordData && activeTab === 'materials'"
          key="materials"
          title="Материалы"
          :rows="recordData.materials"
          :nameOptions="materialNameOptions"
          :unitOptions="unitOptions"
          resourceType="materials"
          :canInsert="canInsert"
          @add-row="handleAddMaterialRow"
        />
        <ResourcePlanningTable
          v-else-if="recordData && activeTab === 'tools'"
          key="tools"
          title="Инструменты"
          :rows="recordData.tools"
          :nameOptions="toolNameOptions"
          resourceType="tools"
          :canInsert="canInsert"
          @add-row="handleAddToolRow"
        />
        <ResourcePlanningTable
          v-else-if="recordData && activeTab === 'equipment'"
          key="equipment"
          title="Техника"
          :rows="recordData.equipment"
          :nameOptions="equipmentNameOptions"
          resourceType="equipment"
          :canInsert="canInsert"
          @add-row="handleAddEquipmentRow"
        />
        <ResourcePlanningTable
          v-else-if="recordData && activeTab === 'services'"
          key="services"
          title="Услуги"
          :rows="recordData.services"
          :nameOptions="serviceNameOptions"
          resourceType="services"
          :canInsert="canInsert"
          @add-row="handleAddServiceRow"
        />
        <ResourcePlanningTable
          v-else-if="recordData && activeTab === 'performers'"
          key="performers"
          title="Исполнители"
          :rows="recordData.performers"
          :nameOptions="performerNameOptions"
          resourceType="personnel"
          :canInsert="canInsert"
          @add-row="handleAddPerformerRow"
        />
      </Transition>
    </div>

    <div v-if="isLoading" class="loading-overlay">
      <div class="spinner"></div>
      Загрузка данных...
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import BackButton from '@/shared/ui/BackButton.vue';
import ResourceCard from '@/features/resource-planning/components/ResourceCard.vue';
import ResourcePlanningTable from '@/features/resource-planning/components/ResourcePlanningTable.vue';
import ResourceInfoSection from '@/features/resource-planning/components/ResourceInfoSection.vue';
import { useNotificationStore } from '@/app/stores/notificationStore';
import { usePermissions } from '@/shared/api/permissions/usePermissions';
import {
  saveResourceMaterial,
  loadResourceMaterialsForTaskLog,
  saveResourceExternalService,
  loadResourceExternalServicesForTaskLog,
  saveResourcePersonnel,
  loadResourcePersonnelForTaskLog,
  saveResourceEquipment,
  loadResourceEquipmentForTaskLog,
  saveResourceTool,
  loadResourceToolsForTaskLog,
  loadMaterials,
  loadUnits,
  loadExternalServices,
  loadPositions,
  loadEquipmentTypes,
  loadToolTypes,
  loadPlanCorrectional
} from '@/shared/api/repairs/repairApi';
import { getUserData } from '@/shared/api/inspections/inspectionsApi';
import { formatDateToISO } from '@/app/stores/date.js';

const router = useRouter();
const route = useRoute();
const { hasPermission } = usePermissions();

const recordData = ref(null);
const isLoading = ref(true);
const taskLogId = ref(route.params.id);
const activeTab = ref('materials');
const notificationStore = useNotificationStore();

// Проверка прав доступа
const canInsert = computed(() => hasPermission('res:ins'));

const materialNameOptions = ref([]);
const unitOptions = ref([]);
const toolNameOptions = ref([]);
const equipmentNameOptions = ref([]);
const serviceNameOptions = ref([]);
const performerNameOptions = ref([]);

const setActiveTab = (tab) => {
  activeTab.value = tab;
};

const getFormattedDate = (date = new Date()) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDate = (dateStr) => {
  if (!dateStr || dateStr.startsWith('0000')) return '-';
  const [year, month, day] = dateStr.split('-');
  return `${day}.${month}.${year}`;
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

// --- Обработчики для добавления ресурсов ---

const handleAddMaterialRow = async (newRowData) => {
  try {
    if (!recordData.value?.taskLogCls) {
      throw new Error('Не найдены данные задачи');
    }

    const materialId = newRowData.name?.value;
    const unitId = newRowData.unit?.value;

    const selectedMaterial = materialNameOptions.value.find(m => m.value === materialId);
    const selectedUnit = unitOptions.value.find(u => u.value === unitId);

    if (!selectedMaterial || !selectedUnit) {
      throw new Error('Материал или единица измерения не найдены');
    }

    const user = await getUserData();
    const today = formatDateToISO(new Date());

    const payload = {
      name: `${taskLogId.value}-${today}`,
      objMaterial: selectedMaterial.value,
      pvMaterial: selectedMaterial.pv,
      meaMeasure: selectedUnit.value,
      pvMeasure: selectedUnit.pv,
      Value: newRowData.plan || 0,
      objTaskLog: taskLogId.value,
      linkCls: recordData.value.taskLogCls,
      CreatedAt: today,
      UpdatedAt: today,
      objUser: user.id,
      pvUser: user.pv,
    };

    await saveResourceMaterial(payload);

    notificationStore.showNotification('Материал успешно добавлен!', 'success');
    await loadRecordData();
  } catch (error) {
    notificationStore.showNotification('Ошибка при добавлении материала.', 'error');
    console.error('Ошибка добавления материала:', error);
  }
};

const handleAddToolRow = async (newRowData) => {
  try {
    if (!recordData.value?.taskLogCls) {
      throw new Error('Не найдены данные задачи');
    }

    const toolTypeId = newRowData.name?.value;
    const selectedToolType = toolNameOptions.value.find(t => t.value === toolTypeId);

    if (!selectedToolType) {
      throw new Error('Тип инструмента не найден');
    }

    const user = await getUserData();
    const today = formatDateToISO(new Date());

    const payload = {
      name: `${taskLogId.value}-${today}`,
      fvTypTool: selectedToolType.value,
      pvTypTool: selectedToolType.pv,
      Value: newRowData.planCount || 0,
      objTaskLog: taskLogId.value,
      linkCls: recordData.value.taskLogCls,
      CreatedAt: today,
      UpdatedAt: today,
      objUser: user.id,
      pvUser: user.pv,
    };

    await saveResourceTool(payload);

    notificationStore.showNotification('Инструмент успешно добавлен!', 'success');
    await loadRecordData();
  } catch (error) {
    notificationStore.showNotification('Ошибка при добавлении инструмента.', 'error');
    console.error('Ошибка добавления инструмента:', error);
  }
};

const handleAddEquipmentRow = async (newRowData) => {
  try {
    if (!recordData.value?.taskLogCls) {
      throw new Error('Не найдены данные задачи');
    }

    const equipmentTypeId = newRowData.name?.value;
    const selectedEquipmentType = equipmentNameOptions.value.find(e => e.value === equipmentTypeId);

    if (!selectedEquipmentType) {
      throw new Error('Тип техники не найден');
    }

    const user = await getUserData();
    const today = formatDateToISO(new Date());

    const payload = {
      name: `${taskLogId.value}-${today}`,
      fvTypEquipment: selectedEquipmentType.value,
      pvTypEquipment: selectedEquipmentType.pv,
      Quantity: newRowData.planCount || 0,
      Value: newRowData.planHours || 0,
      objTaskLog: taskLogId.value,
      linkCls: recordData.value.taskLogCls,
      CreatedAt: today,
      UpdatedAt: today,
      objUser: user.id,
      pvUser: user.pv,
    };

    await saveResourceEquipment(payload);

    notificationStore.showNotification('Техника успешно добавлена!', 'success');
    await loadRecordData();
  } catch (error) {
    notificationStore.showNotification('Ошибка при добавлении техники.', 'error');
    console.error('Ошибка добавления техники:', error);
  }
};

const handleAddServiceRow = async (newRowData) => {
  try {
    if (!recordData.value?.taskLogCls) {
      throw new Error('Не найдены данные задачи');
    }

    const serviceId = newRowData.name?.value;
    const selectedService = serviceNameOptions.value.find(s => s.value === serviceId);

    if (!selectedService) {
      throw new Error('Услуга не найдена');
    }

    const user = await getUserData();
    const today = formatDateToISO(new Date());

    const payload = {
      name: `${taskLogId.value}-${today}`,
      objTpService: selectedService.value,
      pvTpService: selectedService.pv,
      Value: newRowData.plan || 0,
      objTaskLog: taskLogId.value,
      linkCls: recordData.value.taskLogCls,
      CreatedAt: today,
      UpdatedAt: today,
      objUser: user.id,
      pvUser: user.pv,
    };

    await saveResourceExternalService(payload);

    notificationStore.showNotification('Услуга успешно добавлена!', 'success');
    await loadRecordData();
  } catch (error) {
    notificationStore.showNotification('Ошибка при добавлении услуги.', 'error');
    console.error('Ошибка добавления услуги:', error);
  }
};

const handleAddPerformerRow = async (newRowData) => {
  try {
    if (!recordData.value?.taskLogCls) {
      throw new Error('Не найдены данные задачи');
    }

    const positionId = newRowData.name?.value;
    const selectedPosition = performerNameOptions.value.find(p => p.value === positionId);

    if (!selectedPosition) {
      throw new Error('Должность не найдена');
    }

    const user = await getUserData();
    const today = formatDateToISO(new Date());

    const payload = {
      name: `${taskLogId.value}-${today}`,
      fvPosition: selectedPosition.value,
      pvPosition: selectedPosition.pv,
      Quantity: newRowData.planCount || 0,
      Value: newRowData.planHours || 0,
      objTaskLog: taskLogId.value,
      linkCls: recordData.value.taskLogCls,
      CreatedAt: today,
      UpdatedAt: today,
      objUser: user.id,
      pvUser: user.pv,
    };

    await saveResourcePersonnel(payload);

    notificationStore.showNotification('Исполнитель успешно добавлен!', 'success');
    await loadRecordData();
  } catch (error) {
    notificationStore.showNotification('Ошибка при добавлении исполнителя.', 'error');
    console.error('Ошибка добавления исполнителя:', error);
  }
};

const goBack = () => {
  // Устанавливаем флаг что возвращаемся на ResourcePlanning
  localStorage.setItem('resourcePlanningNavigation', 'fromRelatedPage');
  router.push({ name: 'ResourcePlanning' });
};

const loadRecordData = async () => {
  isLoading.value = true;

  try {
    const recordId = route.params.id;

    if (!recordId) {
      throw new Error('ID записи не найден');
    }

    // Получаем данные из localStorage (были сохранены при клике в таблице)
    const selectedDate = localStorage.getItem('resourcePlanningDate') || new Date().toISOString().split('T')[0];
    const periodTypeId = parseInt(localStorage.getItem('resourcePlanningPeriodType')) || 71;

    const result = await loadPlanCorrectional(selectedDate, periodTypeId);
    const storeRecords = result?.store?.records || [];
    const resourceRecords = result?.resource?.records || [];

    // Находим нужную запись по ID
    const rawData = storeRecords.find(r => r.id === parseInt(recordId));

    if (!rawData) {
      throw new Error('Запись не найдена');
    }

    // Формируем данные для ResourceInfoSection (без кнопок управления задачей)
    recordData.value = {
      taskLogPv: rawData.pv,
      taskLogCls: rawData.cls,
      taskName: rawData.fullNameTask || '-',
      volume: rawData.ValuePlan !== null ? rawData.ValuePlan : '-',
      startDate: formatDate(rawData.PlanDateStart),
      endDate: formatDate(rawData.PlanDateEnd),
      workName: rawData.fullNameWork || '-',
      section: rawData.nameLocationClsSection || '-',
      place: rawData.nameSection || '-',
      objectName: rawData.fullNameObject || '-',
      coordinates: formatCoordinates(rawData.StartKm, rawData.StartPicket, rawData.StartLink, rawData.FinishKm, rawData.FinishPicket, rawData.FinishLink),
      volumeFact: '-',
      startDateFact: '-',
      endDateFact: '-',

      // Загружаем ресурсы для этой задачи
      materials: [],
      services: [],
      tools: [],
      equipment: [],
      performers: [],
    };

    // Загружаем ресурсы
    await Promise.all([
      loadMaterialsForTask(rawData.id),
      loadServicesForTask(rawData.id),
      loadToolsForTask(rawData.id),
      loadEquipmentForTask(rawData.id),
      loadPersonnelForTask(rawData.id),
    ]);

  } catch (error) {
    console.error('Ошибка загрузки данных:', error);
    notificationStore.showNotification('Ошибка загрузки данных', 'error');
  } finally {
    isLoading.value = false;
  }
};

const loadMaterialsForTask = async (taskLogId) => {
  try {
    const data = await loadResourceMaterialsForTaskLog(taskLogId);
    recordData.value.materials = data.map(item => ({
      id: item.id,
      name: item.objMaterial,
      name_text: item.nameMaterial,
      plan: item.Value || 0,
      fact: 0,
      unit: item.meaMeasure,
      unit_text: item.nameMeasure,
      idValue: item.idValue,
      idUser: item.idUser,
      idUpdatedAt: item.idUpdatedAt,
    }));
  } catch (error) {
    console.error('Ошибка загрузки материалов:', error);
  }
};

const loadServicesForTask = async (taskLogId) => {
  try {
    const data = await loadResourceExternalServicesForTaskLog(taskLogId);
    recordData.value.services = data.map(item => {
      const fullName = item.fullNameTpService || item.nameTpService || '';
      const parts = fullName.split(',');
      const unit = parts.length > 1 ? parts[1].trim() : 'ед.';
      const serviceName = parts[0].trim() || item.nameTpService;

      return {
        id: item.id,
        name: serviceName,
        plan: item.Value || 0,
        fact: 0,
        unit: unit,
        idValue: item.idValue,
        idUser: item.idUser,
        idUpdatedAt: item.idUpdatedAt,
      };
    });
  } catch (error) {
    console.error('Ошибка загрузки услуг:', error);
  }
};

const loadToolsForTask = async (taskLogId) => {
  try {
    const data = await loadResourceToolsForTaskLog(taskLogId);
    recordData.value.tools = data.map(item => ({
      id: item.id,
      name: item.nameTypTool,
      planCount: item.Value || 0,
      factCount: 0,
      toolDetails: [],
      typToolPv: item.pvTypTool || null,
    }));
  } catch (error) {
    console.error('Ошибка загрузки инструментов:', error);
  }
};

const loadEquipmentForTask = async (taskLogId) => {
  try {
    const data = await loadResourceEquipmentForTaskLog(taskLogId);
    recordData.value.equipment = data.map(item => ({
      id: item.id,
      name: item.nameTypEquipment,
      planCount: item.Quantity || 0,
      planHours: item.Value || 0,
      factCount: 0,
      factHours: 0,
      equipmentDetails: [],
      typEquipmentPv: item.pvTypEquipment || null,
    }));
  } catch (error) {
    console.error('Ошибка загрузки техники:', error);
  }
};

const loadPersonnelForTask = async (taskLogId) => {
  try {
    const data = await loadResourcePersonnelForTaskLog(taskLogId);
    recordData.value.performers = data.map(item => ({
      id: item.id,
      name: item.namePosition,
      plan: item.Quantity || 0,
      hours: item.Value || 0,
      performerDetails: [],
      positionPv: item.pvPosition || item.pv,
    }));
  } catch (error) {
    console.error('Ошибка загрузки исполнителей:', error);
  }
};

// Загрузка справочников
const loadDropdownOptions = async () => {
  try {
    const [materials, units, services, positions, equipmentTypes, toolTypes] = await Promise.all([
      loadMaterials(),
      loadUnits(),
      loadExternalServices(),
      loadPositions(),
      loadEquipmentTypes(),
      loadToolTypes()
    ]);

    materialNameOptions.value = materials;
    unitOptions.value = units;
    serviceNameOptions.value = services;
    performerNameOptions.value = positions;
    equipmentNameOptions.value = equipmentTypes;
    toolNameOptions.value = toolTypes;
  } catch (error) {
    console.error('Ошибка загрузки справочников:', error);
    notificationStore.showNotification('Ошибка загрузки справочников', 'error');
  }
};

onMounted(async () => {
  await loadDropdownOptions();
  await loadRecordData();
});
</script>

<style scoped>
.resource-planning-edit-page {
  padding: 24px;
  background: #f7fafc;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
}

.header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.header h1 {
  font-size: 24px;
  font-weight: 600;
  color: #1a202c;
  margin: 0;
}

.cards-section {
  display: flex;
  flex-wrap: nowrap;
  gap: 16px;
  margin-bottom: 24px;
  overflow-x: auto;
}

.loading-overlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
  gap: 16px;
  font-size: 16px;
  color: #4a5568;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e2e8f0;
  border-top-color: #3182ce;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.table-transition-wrapper {
  position: relative;
}

.fade-table-enter-active,
.fade-table-leave-active {
  transition: opacity 0.15s ease;
}

.fade-table-enter-from,
.fade-table-leave-to {
  opacity: 0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 1200px) {
  .cards-section {
    gap: 12px;
  }
}

@media (max-width: 1024px) {
  .cards-section :deep(.resource-card) {
    min-width: 175px;
    max-width: 195px;
  }
}

@media (max-width: 768px) {
  .cards-section {
    gap: 8px;
  }

  .cards-section :deep(.resource-card) {
    min-width: 150px;
    max-width: 170px;
  }
}
</style>
