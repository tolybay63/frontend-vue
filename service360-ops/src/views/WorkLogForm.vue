<template>
  <div class="plan-form-page">
    <div class="header">
      <BackButton @click="goBack" />
      <h1>Журнал ресурсов</h1>
    </div>

    <ResourceInfoSection 
      v-if="recordData" 
      :recordData="recordData"
      :taskLogId="workLogId"
      :onTaskUpdated="onTaskUpdated"
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
        <ResourceEditTable
          v-if="recordData && activeTab === 'materials'"
          key="materials"
          title="Материалы"
          :rows="recordData.materials"
          :nameOptions="materialNameOptions"
          :unitOptions="unitOptions"
          @update:rows="recordData.materials = $event"
          @save-row="handleSaveRow"
          @delete-row="handleDeleteRow"
          @add-row="handleAddMaterialRow"
        />
        <ResourceEditTable
          v-else-if="recordData && activeTab === 'tools'"
          key="tools"
          title="Инструменты"
          :rows="recordData.tools"
          :nameOptions="toolNameOptions"
          :unitOptions="unitOptions"
          :is-tool="true"
          @update:rows="recordData.tools = $event"
          @save-row="handleSaveRow"
          @delete-row="handleDeleteRow"
          @add-row="handleAddToolRow"
          @save-resource="handleSaveResource"
          @delete-resource="handleDeleteResource"
        />
        <ResourceEditTable
          v-else-if="recordData && activeTab === 'equipment'"
          key="equipment"
          title="Техника"
          :rows="recordData.equipment"
          :nameOptions="equipmentNameOptions"
          :unitOptions="unitOptions"
          :is-equipment="true"
          @update:rows="recordData.equipment = $event"
          @save-row="handleSaveRow"
          @delete-row="handleDeleteRow"
          @add-row="handleAddEquipmentRow"
          @save-resource="handleSaveResource"
          @delete-resource="handleDeleteResource"
        />
        <ResourceEditTable
          v-else-if="recordData && activeTab === 'services'"
          key="services"
          title="Услуги"
          :rows="recordData.services"
          :nameOptions="serviceNameOptions"
          @update:rows="recordData.services = $event"
          @save-row="handleSaveRow"
          @delete-row="handleDeleteRow"
          @add-row="handleAddServiceRow"
        />
        <ResourceEditTable
          v-else-if="recordData && activeTab === 'performers'"
          key="performers"
          title="Исполнители"
          :rows="recordData.performers"
          :nameOptions="performerNameOptions"
          :unitOptions="performerUnitOptions"
          :is-performer="true"
          :performerNameOptions="performerNameOptionsForDropdown"
          @update:rows="recordData.performers = $event"
          @save-row="handleSaveRow"
          @delete-row="handleDeleteRow"
          @save-performer="handleSavePerformer"
          @delete-performer="handleDeletePerformer"
          @add-performer="handleAddPerformer"
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
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import BackButton from '@/shared/ui/BackButton.vue';
import ResourceCard from '@/features/resource-planning/components/ResourceCard.vue';
import ResourceEditTable from '@/features/resource-planning/components/ResourceEditTable.vue';
import ResourceInfoSection from '@/features/resource-planning/components/ResourceInfoSection.vue';
import { loadObjTaskLog, saveResourceFact, saveServiceFact, addResourceMaterial, addResourceTpService, saveComplexPersonnel, deleteComplexPersonnel, saveComplexTool, saveComplexEquipment } from '@/shared/api/execution/executionApi';
import { loadMaterials, loadUnits, loadExternalServices } from '@/shared/api/repairs/repairApi';
import { useNotificationStore } from '@/app/stores/notificationStore';

const router = useRouter();
const route = useRoute();

const recordData = ref(null);
const isLoading = ref(true);
const workLogId = ref(route.params.id);
const activeTab = ref('materials');
const notificationStore = useNotificationStore();

const materialNameOptions = ref([]);
const unitOptions = ref([]);

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

const handleSaveRow = async ({ row }) => {
  const payload = {
    id: row.id,
    idValue: row.idValue,
    Value: row.fact,
    idUser: row.idUser,
    idUpdatedAt: row.idUpdatedAt,
    UpdatedAt: getFormattedDate(),
  };

  let apiMethod, successMsg, errorMsg, errorLog;

  try {
    if (activeTab.value === 'materials') {
      apiMethod = saveResourceFact;
      successMsg = 'Факт по материалу успешно сохранен!';
      errorMsg = 'Ошибка при сохранении факта по материалу.';
      errorLog = 'Ошибка сохранения факта по материалу:';
    } else if (activeTab.value === 'services') {
      apiMethod = saveServiceFact;
      successMsg = 'Факт по услуге успешно сохранен!';
      errorMsg = 'Ошибка при сохранении факта по услуге.';
      errorLog = 'Ошибка сохранения факта по услуге:';
    } else {
      return;
    }

    const response = await apiMethod(payload);
    notificationStore.showNotification(successMsg, 'success');
    await loadWorkLogData(workLogId.value);
  } catch (error) {
    const serverError = error.response?.data?.error?.message || error.message;
    notificationStore.showNotification(`${errorMsg} ${serverError}`, 'error');
    console.error(errorLog, error);
  }
};

// --- Обработчики для исполнителей ---

const handleSavePerformer = async ({ rowId, performer, performerIndex }) => {
  try {
    const performerData = {
      objPerformer: performer.id,
      pvPerformer: performer.pv,
      PerformerValue: performer.time,
      isNew: performer.isNew,
    };

    // Для существующих исполнителей добавляем дополнительные поля
    if (!performer.isNew) {
      performerData.idPerformer = performer.idPerformer;
      performerData.idPerformerValue = performer.idPerformerValue;
    }

    await saveComplexPersonnel(rowId, performerData);

    notificationStore.showNotification('Данные исполнителя успешно сохранены!', 'success');

    // Перезагружаем данные с сервера
    // Watcher в ResourceEditTable автоматически сохранит несохраненных исполнителей
    await loadWorkLogData(workLogId.value);
  } catch (error) {
    notificationStore.showNotification('Ошибка при сохранении данных исполнителя.', 'error');
    console.error('Ошибка сохранения исполнителя:', error);
  }
};

const handleDeletePerformer = async ({ performer }) => {
  try {
    const complexId = performer.complexId;

    if (!complexId) {
      throw new Error('ID комплекса не найден');
    }

    await deleteComplexPersonnel(complexId);

    notificationStore.showNotification('Исполнитель успешно удален!', 'success');

    // Перезагружаем данные для обновления списка
    await loadWorkLogData(workLogId.value);
  } catch (error) {
    notificationStore.showNotification('Ошибка при удалении исполнителя.', 'error');
    console.error('Ошибка удаления исполнителя:', error);
  }
};

const handleAddPerformer = async () => {
  try {
    // TODO: Реализовать API для массового добавления исполнителей
    notificationStore.showNotification('Исполнители успешно добавлены!', 'success');
    await loadWorkLogData(workLogId.value);
  } catch (error) {
    notificationStore.showNotification('Ошибка при добавлении исполнителей.', 'error');
    console.error('Ошибка добавления исполнителей:', error);
  }
};

// --- Обработчики для инструментов и техники ---

const handleSaveResource = async ({ rowId, detail, detailIndex, resourceType }) => {
  try {
    const resourceName = resourceType === 'tool' ? 'инструмента' : 'техники';

    if (resourceType === 'tool') {
      const toolData = {
        objTool: detail.id,
        pvTool: detail.pv,
        ToolValue: detail.quantity || 1,
        isNew: detail.isNew,
      };

      if (!detail.isNew) {
        toolData.idTool = detail.idTool;
        toolData.idToolValue = detail.idToolValue;
      }

      await saveComplexTool(rowId, toolData);
    } else if (resourceType === 'equipment') {
      const equipmentData = {
        objEquipment: detail.id,
        pvEquipment: detail.pv,
        EquipmentValue: detail.time || 0,
        isNew: detail.isNew,
      };

      if (!detail.isNew) {
        equipmentData.idEquipment = detail.idEquipment;
        equipmentData.idEquipmentValue = detail.idEquipmentValue;
      }

      await saveComplexEquipment(rowId, equipmentData);
    }

    notificationStore.showNotification(`Данные ${resourceName} успешно сохранены!`, 'success');

    // Перезагружаем данные с сервера
    await loadWorkLogData(workLogId.value);
  } catch (error) {
    const resourceName = resourceType === 'tool' ? 'инструмента' : 'техники';
    notificationStore.showNotification(`Ошибка при сохранении данных ${resourceName}.`, 'error');
    console.error(`Ошибка сохранения ${resourceName}:`, error);
  }
};

const handleDeleteResource = async ({ detail, resourceType }) => {
  try {
    const resourceName = resourceType === 'tool' ? 'Инструмент' : 'Техника';

    const complexId = detail.complexId;

    if (!complexId) {
      throw new Error('ID комплекса не найден');
    }

    await deleteComplexPersonnel(complexId);

    notificationStore.showNotification(`${resourceName} успешно удален!`, 'success');

    // Перезагружаем данные для обновления списка
    await loadWorkLogData(workLogId.value);
  } catch (error) {
    const resourceName = resourceType === 'tool' ? 'инструмента' : 'техники';
    notificationStore.showNotification(`Ошибка при удалении ${resourceName}.`, 'error');
    console.error(`Ошибка удаления ${resourceName}:`, error);
  }
};

// --- Обработчики для добавления ресурсов ---

const handleAddMaterialRow = async (newRowData) => {
  try {
    if (!recordData.value?.taskLogCls) {
      throw new Error('Не найдены данные задачи');
    }

    console.log('Данные для добавления материала (newRowData):', newRowData);
    console.log('Справочник материалов:', materialNameOptions.value);
    console.log('Справочник единиц измерения:', unitOptions.value);

    const materialId = newRowData.name?.value;
    const unitId = newRowData.unit?.value;

    const selectedMaterial = materialNameOptions.value.find(m => m.value === materialId);
    const selectedUnit = unitOptions.value.find(u => u.value === unitId);

    if (!selectedMaterial || !selectedUnit) {
      if (!selectedMaterial) console.error('Материал с ID', materialId, 'не найден в справочнике materialNameOptions.');
      if (!selectedUnit) console.error('Единица измерения с ID', unitId, 'не найдена в справочнике unitOptions.');
      throw new Error('Материал или единица измерения не найдены');
    }

    const materialData = {
      objMaterial: selectedMaterial.value,
      pvMaterial: selectedMaterial.pv,
      meaMeasure: selectedUnit.value,
      pvMeasure: selectedUnit.pv,
      Value: newRowData.fact || 0,
    };

    await addResourceMaterial(
      materialData, 
      workLogId.value, 
      recordData.value.taskLogCls
    );

    notificationStore.showNotification('Материал успешно добавлен!', 'success');
    await loadWorkLogData(workLogId.value);
  } catch (error) {
    notificationStore.showNotification('Ошибка при добавлении материала.', 'error');
    console.error('Ошибка добавления материала:', error);
  }
};

const handleAddToolRow = async (newRowData) => {
  try {
    // TODO: Здесь должен быть вызов API для добавления нового инструмента
    console.log('Добавление инструмента:', newRowData);
    notificationStore.showNotification('Инструмент успешно добавлен!', 'success');
    await loadWorkLogData(workLogId.value);
  } catch (error) {
    notificationStore.showNotification('Ошибка при добавлении инструмента.', 'error');
    console.error('Ошибка добавления инструмента:', error);
  }
};

const handleAddEquipmentRow = async (newRowData) => {
  try {
    // TODO: Здесь должен быть вызов API для добавления новой техники
    console.log('Добавление техники:', newRowData);
    notificationStore.showNotification('Техника успешно добавлена!', 'success');
    await loadWorkLogData(workLogId.value);
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

    console.log('Данные для добавления услуги (newRowData):', newRowData);
    console.log('Справочник услуг:', serviceNameOptions.value);

    const serviceId = newRowData.name?.value;

    const selectedService = serviceNameOptions.value.find(s => s.value === serviceId);

    if (!selectedService) {
      console.error('Услуга с ID', serviceId, 'не найдена в справочнике serviceNameOptions.');
      throw new Error('Услуга не найдена');
    }

    const serviceData = {
      objTpService: selectedService.value,
      pvTpService: selectedService.pv,
      Value: newRowData.fact || 0,
    };

    await addResourceTpService(
      serviceData,
      workLogId.value,
      recordData.value.taskLogCls
    );

    notificationStore.showNotification('Услуга успешно добавлена!', 'success');
    await loadWorkLogData(workLogId.value);
  } catch (error) {
    notificationStore.showNotification('Ошибка при добавлении услуги.', 'error');
    console.error('Ошибка добавления услуги:', error);
  }
};

const handleDeleteRow = (payload) => console.log('Deleting row:', payload);

const goBack = () => {
  router.push({ name: 'WorkLog' });
};

const formatDate = (dateStr) => {
  if (!dateStr || dateStr.startsWith('0000')) return '-';
  const [year, month, day] = dateStr.split('-');
  return `${day}.${month}.${year}`;
};

const formatCoordinates = (startKm, startPk, finishKm, finishPk) => {
  const isPresent = (val) => val !== null && val !== undefined;
  const start = isPresent(startKm) ? `${startKm}км ${startPk || 0}пк` : '';
  const finish = isPresent(finishKm) ? `${finishKm}км ${finishPk || 0}пк` : '';

  if (start && finish) {
    return `${start} - ${finish}`;
  }
  return start || finish || 'Координаты отсутствуют';
};

const onTaskUpdated = () => {
  loadWorkLogData(workLogId.value);
};

const loadWorkLogData = async (id) => {
  isLoading.value = true;
  
  try {
    const data = await loadObjTaskLog(id);
    if (!data) {
      throw new Error("Данные для записи журнала работ не найдены.");
    }

    recordData.value = {
      taskLogPv: data.pv,
      taskLogCls: data.cls,
      taskName: data.fullNameTask || '-',
      volume: data.ValuePlan !== null ? data.ValuePlan : '-',
      startDate: formatDate(data.PlanDateStart),
      endDate: formatDate(data.PlanDateEnd),
      workName: data.fullNameWork || '-',
      section: data.nameLocationClsSection || '-',
      place: data.nameSection || '-',
      objectName: data.fullNameObject || '-',
      coordinates: formatCoordinates(data.StartKm, data.StartPicket, data.FinishKm, data.FinishPicket),
      volumeFact: data.ValueFact !== null ? data.ValueFact : '-',
      startDateFact: formatDate(data.FactDateStart),
      endDateFact: formatDate(data.FactDateEnd),
      
      materials: (data.material || []).map(item => ({
        id: item.id,
        name: item.objMaterial,
        name_text: item.nameMaterial,
        plan: item.ValuePlan,
        fact: item.Value,
        unit: item.meaMeasure,
        unit_text: item.nameMeasure,
        idValue: item.idValue,
        idUser: item.idUser,
        idUpdatedAt: item.idUpdatedAt,
      })),
      services: (data.tpService || []).map(item => {
        // Извлекаем единицу измерения из fullNameTpService (часть после запятой)
        const fullName = item.fullNameTpService || item.nameTpService || '';
        const parts = fullName.split(',');
        const unit = parts.length > 1 ? parts[1].trim() : 'ед.';
        const serviceName = parts[0].trim() || item.nameTpService;

        return {
          id: item.id,
          name: serviceName,
          plan: item.ValuePlan,
          fact: item.Value || 0,
          unit: unit,
          idValue: item.idValue,
          idUser: item.idUser,
          idUpdatedAt: item.idUpdatedAt,
        };
      }),
      tools: (data.tool || []).map(item => ({
        id: item.id,
        name: item.nameTypTool,
        planCount: item.Value || 0,
        factCount: (item.complex || []).length,
        toolDetails: (item.complex || []).map(complexItem => ({
          complexId: complexItem.idToolComplex,
          id: complexItem.objTool,
          pv: complexItem.pvTool,
          name: complexItem.nameTool,
          inventoryNumber: complexItem.nameTool,
          quantity: complexItem.ToolValue || 1,
          idTool: complexItem.idTool,
          idToolValue: complexItem.idToolValue,
          isNew: false,
        })),
        typToolPv: item.pvTypTool || null,
      })),
      equipment: (data.equipment || []).map(item => {
        const details = (item.complex || []).map(complexItem => ({
          complexId: complexItem.idEquipmentComplex,
          id: complexItem.objEquipment,
          pv: complexItem.pvEquipment,
          name: complexItem.nameEquipment,
          inventoryNumber: complexItem.nameEquipment,
          time: complexItem.EquipmentValue || 0,
          idEquipment: complexItem.idEquipment,
          idEquipmentValue: complexItem.idEquipmentValue,
          isNew: false,
        }));

        const factCount = details.length;
        const factHours = details.reduce((sum, d) => sum + (d.time || 0), 0);

        return {
          id: item.id,
          name: item.nameTypEquipment,
          planCount: item.Quantity || 0,
          planHours: item.Value || 0,
          factCount: factCount,
          factHours: factHours,
          equipmentDetails: details,
          typEquipmentPv: item.pvTypEquipment || null,
        };
      }),
      performers: (data.personnel || []).map(item => ({
        id: item.id,
        name: item.namePosition,
        plan: item.Quantity,
        hours: item.Value,
        performerDetails: (item.complex || []).map(complexItem => ({
          complexId: complexItem.idPerformerComplex, // ID комплекса для удаления
          id: complexItem.objPerformer,
          pv: complexItem.pvPerformer,
          fullName: complexItem.fullNamePerformer,
          time: complexItem.PerformerValue || 0,
          idPerformer: complexItem.idPerformer,
          idPerformerValue: complexItem.idPerformerValue,
          isNew: false, // Это существующий исполнитель
        })),
        positionPv: item.pvPosition || item.pv, // PV позиции для загрузки исполнителей
      })),
    };
  } catch (error) {
    console.error('Ошибка загрузки данных:', error);
    notificationStore.showNotification('Ошибка загрузки данных', 'error');
  } finally {
    isLoading.value = false;
  }
};

// Загрузка справочников
const loadDropdownOptions = async () => {
  try {
    const [materials, units, services] = await Promise.all([
      loadMaterials(),
      loadUnits(),
      loadExternalServices()
    ]);

    materialNameOptions.value = materials;
    unitOptions.value = units;
    serviceNameOptions.value = services;
  } catch (error) {
    console.error('Ошибка загрузки справочников:', error);
    notificationStore.showNotification('Ошибка загрузки справочников', 'error');
  }
};

// Mock data for dropdowns in ResourceEditTable
const toolNameOptions = ref([
  { value: 'hammer', label: 'Молоток' },
  { value: 'drill', label: 'Дрель' },
  { value: 'saw', label: 'Пила' },
]);

const equipmentNameOptions = ref([
  { value: 'excavator', label: 'Экскаватор' },
  { value: 'bulldozer', label: 'Бульдозер' },
  { value: 'crane', label: 'Кран' },
]);

const serviceNameOptions = ref([]);

const performerNameOptions = ref([
  { value: 'foreman', label: 'Бригадир' },
  { value: 'worker', label: 'Рабочий' },
  { value: 'engineer', label: 'Инженер' },
]);

const performerUnitOptions = ref([
  { value: 'person', label: 'чел.' },
]);

// Опции для дропдауна исполнителей (ФИО конкретных людей)
const performerNameOptionsForDropdown = ref([
  { value: 'ivanov', label: 'Иванов Иван Иванович' },
  { value: 'petrov', label: 'Петров Петр Петрович' },
  { value: 'sidorov', label: 'Сидоров Сидор Сидорович' },
  { value: 'kuznetsov', label: 'Кузнецов Алексей Михайлович' },
  { value: 'smirnov', label: 'Смирнов Дмитрий Александрович' },
]);

onMounted(async () => {
  await loadDropdownOptions();
  await loadWorkLogData(workLogId.value);
});
</script>

<style scoped>
.plan-form-page {
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

@media (max-width: 768px) {
  .cards-section {
    gap: 8px;
  }
}
</style>