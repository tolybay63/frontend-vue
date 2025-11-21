<template>
  <ModalWrapper
    title="Редактирование ресурсов"
    :show-save="false"
    :show-cancel="false"
    :showDelete="false"
    @close="closeModal"
  >
    <div class="work-card-content">
      <WorkHeaderInfo :record="record" :section="section" :date="date" />

      <div class="tabs-block">
        <TabsHeader
          :tabs="tabsRow1"
          :modelValue="activeTab" 
          @update:modelValue="activeTab = $event"
          class="first-row-tabs"
        />
        <TabsHeader
          :tabs="tabsRow2"
          :modelValue="activeTab"
          @update:modelValue="activeTab = $event"
          class="second-row-tabs"
        />

        <div class="tab-content">
          <div v-if="activeTab === 'materials'">
            <ExistingDataBlock :existingRecords="existingRecordsMaterials" dataType="materials" />
            
            <div class="new-info-content">
              <div v-for="(material, index) in materialRecords" :key="index" class="resource-record-block">
                  <div class="resource-record-header">
                    <span v-if="index > 0" class="remove-object" @click="removeMaterialRecord(index)">×</span>
                  </div>
                  
                  <div class="form-line-materials">
                    <AppDropdown
                      label="Материал"
                      placeholder="Выберите материал"
                      :id="`material-dropdown-${index}`"
                      v-model="material.material"
                      :options="materialOptions"
                      :required="true" />
                      
                    <AppDropdown
                      label="Единица измерения"
                      placeholder="Выберите ед. изм."
                      :id="`unit-dropdown-${index}`"
                      v-model="material.unit"
                      :options="unitOptions"
                      :required="true" />
                      
                    <AppNumberInput
                      label="Объем"
                      :id="`material-volume-input-${index}`"
                      v-model.number="material.volume"
                      placeholder="Введите объем"
                      type="number" 
                      :min="0" />
                  </div>
              </div>
              
              <div class="col-span-2 add-object-btn-wrapper">
                <UiButton
                  text="Добавить материал"
                  icon="Plus"
                  :loading="isAddingObject"
                  @click="addNewMaterialRecord"
                />
              </div>

            </div>
          </div>

          <div v-if="activeTab === 'externalServices'">
            <ExistingDataBlock :existingRecords="existingRecordsServices" dataType="externalServices" />
            
            <div class="new-info-content">
              <div v-for="(service, index) in serviceRecords" :key="index" class="resource-record-block">
                  <div class="resource-record-header">
                    <span v-if="index > 0" class="remove-object" @click="removeServiceRecord(index)">×</span>
                  </div>
                  
                  <div class="form-line-services">
                    <AppDropdown
                      label="Сервис"
                      placeholder="Выберите сервис"
                      :id="`service-dropdown-${index}`"
                      v-model="service.service"
                      :options="serviceOptions"
                      :required="true" />
                      
                    <AppNumberInput
                      label="Объем"
                      :id="`service-volume-input-${index}`"
                      v-model.number="service.volume"
                      placeholder="Введите объем"
                      type="number" 
                      :min="0" />
                  </div>
              </div>
              
              <div class="col-span-2 add-object-btn-wrapper">
                <UiButton text="Добавить услугу" icon="Plus" :loading="isAddingObject" @click="addNewServiceRecord" />
              </div>

            </div>
          </div>
          
          <div v-if="activeTab === 'personnel'">
            <ExistingDataBlock :existingRecords="existingRecordsPersonnel" dataType="personnel" />
            
            <div class="new-info-content">
              <div v-for="(personnel, index) in personnelRecords" :key="index" class="resource-record-block">
                  <div class="resource-record-header">
                    <span v-if="index > 0" class="remove-object" @click="removePersonnelRecord(index)">×</span>
                  </div>
                  
                  <div class="form-line-personnel">
                    <AppDropdown
                      label="Должность"
                      placeholder="Выберите должность"
                      :id="`position-dropdown-${index}`"
                      v-model="personnel.position"
                      :options="positionOptions"
                      :required="true" />
                      
                    <AppNumberInput
                      label="Количество человек"
                      :id="`personnel-count-input-${index}`"
                      v-model.number="personnel.count"
                      placeholder="Кол-во"
                      type="number" 
                      :min="0"
                      :required="true" />
                      
                    <AppNumberInput
                      label="Часы"
                      :id="`personnel-hours-input-${index}`"
                      v-model.number="personnel.hours"
                      placeholder="Введите часы"
                      type="number" 
                      :min="0" />
                  </div>
              </div>
              
              <div class="col-span-2 add-object-btn-wrapper">
                <UiButton text="Добавить еще Должность" icon="Plus" :loading="isAddingObject" @click="addNewPersonnelRecord" />
              </div>

            </div>
          </div>
          
          <div v-if="activeTab === 'equipment'">
            <ExistingDataBlock :existingRecords="existingRecordsEquipment" dataType="equipment" />
            
            <div class="new-info-content">
              <div v-for="(equipment, index) in equipmentRecords" :key="index" class="resource-record-block">
                  <div class="resource-record-header">
                    <span v-if="index > 0" class="remove-object" @click="removeEquipmentRecord(index)">×</span>
                  </div>
                  
                  <div class="form-line-equipment">
                    <AppDropdown
                      label="Тип Техники"
                      placeholder="Выберите тип техники"
                      :id="`equipment-type-dropdown-${index}`"
                      v-model="equipment.equipmentType"
                      :options="equipmentTypeOptions"
                      :required="true" />
                      
                    <AppNumberInput
                      label="Количество"
                      :id="`equipment-count-input-${index}`"
                      v-model.number="equipment.count"
                      placeholder="Кол-во"
                      type="number" 
                      :min="0"
                      :required="true" />
                      
                    <AppNumberInput
                      label="Часы"
                      :id="`equipment-hours-input-${index}`"
                      v-model.number="equipment.hours"
                      placeholder="Введите часы"
                      type="number" 
                      :min="0" />
                  </div>
              </div>
              
              <div class="col-span-2 add-object-btn-wrapper">
                <UiButton text="Добавить еще Технику" icon="Plus" :loading="isAddingObject" @click="addNewEquipmentRecord" />
              </div>

            </div>
          </div>

          <div v-if="activeTab === 'tools'">
            <ExistingDataBlock :existingRecords="existingRecordsTools" dataType="tools" />
            <div class="new-info-content">
              <div v-for="(tool, index) in toolRecords" :key="index" class="resource-record-block">
                <div class="resource-record-header">
                  <span v-if="index > 0" class="remove-object" @click="removeToolRecord(index)">×</span>
                </div>
                <div class="form-line-tools">
                  <AppDropdown label="Инструмент" placeholder="Выберите инструмент" :id="`tool-type-dropdown-${index}`" v-model="tool.toolType" :options="toolTypeOptions" :required="true" />
                  <AppNumberInput label="Количество" :id="`tool-count-input-${index}`" v-model.number="tool.count" placeholder="Кол-во" type="number" :min="0" :required="true" />
                </div>
              </div>
              <div class="col-span-2 add-object-btn-wrapper">
                <UiButton text="Добавить инструмент" icon="Plus" :loading="isAddingObject" @click="addNewToolRecord" />
              </div>
            </div>
          </div>
          
        </div>
      </div>

      <div class="button-container">
        <div class="main-actions">
          <MainButton 
            :label="getButtonLabel()" 
            :loading="isSaving" 
            @click="saveData" 
            class="save-btn" />
        </div>
      </div>
    </div>
  </ModalWrapper>
</template>

<script setup>
import { ref, watch, defineProps, defineEmits, onMounted, computed } from 'vue';
import ModalWrapper from '@/app/layouts/Modal/ModalWrapper.vue';
import MainButton from '@/shared/ui/MainButton.vue';
import AppNumberInput from '@/shared/ui/FormControls/AppNumberInput.vue';
import TabsHeader from '@/shared/ui/TabsHeader.vue';
import WorkHeaderInfo from '@/shared/ui/WorkHeaderInfo.vue';
import ExistingDataBlock from '@/shared/ui/ExistingDataBlock.vue';
import AppDropdown from '@/shared/ui/FormControls/AppDropdown.vue';
import UiButton from '@/shared/ui/UiButton.vue'; 

import { useNotificationStore } from '@/app/stores/notificationStore';
import { fetchUserData } from '@/shared/api/inspections/inspectionsApi'; 
import { 
  saveResourceMaterial, 
  loadResourceMaterialsForTaskLog,
  saveResourceExternalService,
  loadResourceExternalServicesForTaskLog,
  saveResourcePersonnel,
  saveResourceEquipment,
  loadResourcePersonnelForTaskLog,
  loadResourceEquipmentForTaskLog,
  saveResourceTool,
  loadResourceToolsForTaskLog,
  loadMaterials, 
  loadUnits, 
  loadExternalServices,
  loadPositions,
  loadEquipmentTypes,
  loadToolTypes
} from '@/shared/api/repairs/repairApi';
import { formatDateToISO } from '@/app/stores/date.js';

const props = defineProps({
  record: {
    type: Object,
    default: null,
  },
  section: {
    type: String,
    default: null,
  },
  date: {
    type: String,
    default: null,
  },
});

const emit = defineEmits(['close', 'saved']);

const isSaving = ref(false);
const isAddingObject = ref(false); 
const activeTab = ref('materials');
const taskLogId = ref(null);
const taskLogCls = ref(null);

const tabsRow1 = ref([
  { name: 'materials', label: 'Материалы', icon: 'Box' },
  { name: 'externalServices', label: 'Услуги сторонних организаций', icon: 'HardHat' },
]);

const tabsRow2 = ref([
  { name: 'personnel', label: 'Исполнители', icon: 'Users' }, 
  { name: 'equipment', label: 'Техника', icon: 'Truck' },
  { name: 'tools', label: 'Инструменты', icon: 'Hammer' },
]);

const notificationStore = useNotificationStore();

const createNewMaterialObject = () => ({
  material: null,
  unit: null,
  volume: null,
});

const createNewServiceObject = () => ({ service: null, volume: null });
const createNewPersonnelObject = () => ({ position: null, count: null, hours: null });
const createNewEquipmentObject = () => ({ equipmentType: null, count: null, hours: null });
const createNewToolObject = () => ({ toolType: null, count: null });

const materialRecords = ref([createNewMaterialObject()]); 
const serviceRecords = ref([createNewServiceObject()]);
const personnelRecords = ref([createNewPersonnelObject()]);
const equipmentRecords = ref([createNewEquipmentObject()]);
const toolRecords = ref([createNewToolObject()]);

const materialOptions = ref([]);
const unitOptions = ref([]);
const serviceOptions = ref([]);
const positionOptions = ref([]);
const equipmentTypeOptions = ref([]);
const toolTypeOptions = ref([]);

const existingRecordsMaterials = ref([]);
const existingRecordsServices = ref([]);
const existingRecordsPersonnel = ref([]);
const existingRecordsEquipment = ref([]);
const existingRecordsTools = ref([]);

const closeModal = () => {
  emit('close');
};

const getButtonLabel = () => {
  switch (activeTab.value) {
    case 'materials': return 'Сохранить материалы';
    case 'externalServices': return 'Сохранить услуги';
    case 'personnel': return 'Сохранить исполнителей';
    case 'equipment': return 'Сохранить технику';
    case 'tools': return 'Сохранить инструменты';
    default: return 'Сохранить';
  }
};

const addNewMaterialRecord = () => materialRecords.value.push(createNewMaterialObject());
const removeMaterialRecord = (index) => {
  if (materialRecords.value.length > 1) materialRecords.value.splice(index, 1);
};

const addNewServiceRecord = () => serviceRecords.value.push(createNewServiceObject());
const removeServiceRecord = (index) => {
  if (serviceRecords.value.length > 1) serviceRecords.value.splice(index, 1);
};

const addNewPersonnelRecord = () => personnelRecords.value.push(createNewPersonnelObject());
const removePersonnelRecord = (index) => {
  if (personnelRecords.value.length > 1) personnelRecords.value.splice(index, 1);
};

const addNewEquipmentRecord = () => equipmentRecords.value.push(createNewEquipmentObject());
const removeEquipmentRecord = (index) => {
  if (equipmentRecords.value.length > 1) equipmentRecords.value.splice(index, 1);
};

const addNewToolRecord = () => toolRecords.value.push(createNewToolObject());
const removeToolRecord = (index) => {
  if (toolRecords.value.length > 1) toolRecords.value.splice(index, 1);
};

const saveData = async () => {
  switch (activeTab.value) {
    case 'materials':
      await saveMaterials();
      break;
    case 'externalServices':
      await saveServices();
      break;
    case 'personnel':
      await savePersonnel();
      break;
    case 'equipment':
      await saveEquipment();
      break;
    case 'tools':
      await saveTools();
      break;
  }
};

const saveMaterials = async () => {
  if (isSaving.value) return; 

  const validRecords = materialRecords.value.filter(m => m.material && m.unit && m.volume != null && m.volume > 0);
  
  if (validRecords.length === 0) {
    notificationStore.showNotification('Нет данных для сохранения. Заполните обязательные поля (Материал, Ед. изм., Объем) хотя бы для одной записи.', 'error');
    return;
  }

  if (!taskLogId.value || !taskLogCls.value) {
    notificationStore.showNotification('Не найден ID или CLS родительской задачи.', 'error');
    return;
  }

  isSaving.value = true;
  try {
    const user = await fetchUserData();
    const today = formatDateToISO(new Date());

    const savePromises = validRecords.map(async (material) => {
      const payload = {
        name: `${taskLogId.value}-${today}`,
        objMaterial: material.material.value,
        pvMaterial: material.material.pv,
        meaMeasure: material.unit.value,
        pvMeasure: material.unit.pv,
        Value: Number(material.volume),
        objTaskLog: taskLogId.value,
        linkCls: taskLogCls.value,
        CreatedAt: today,
        UpdatedAt: today,
        objUser: user.id,
        pvUser: user.pv,
      };
      return saveResourceMaterial(payload);
    });

    const results = await Promise.allSettled(savePromises);
    const successfulSaves = results.filter(r => r.status === 'fulfilled' && !r.value.error).length;

    if (successfulSaves > 0) {
      notificationStore.showNotification(`Успешно сохранено ${successfulSaves} записей материалов!`, 'success');
      materialRecords.value = [createNewMaterialObject()];
      await loadExistingMaterials(taskLogId.value);
      emit('saved');
    }
    if (results.length > successfulSaves) {
      notificationStore.showNotification(`Не удалось сохранить ${results.length - successfulSaves} записей.`, 'warning');
    }
  } catch (error) {
    console.error('Ошибка сохранения материалов:', error);
    notificationStore.showNotification(error.message || 'Не удалось сохранить информацию по материалам.', 'error');
  } finally {
    isSaving.value = false;
  }
};

const saveServices = async () => {
  if (isSaving.value) return;

  const validRecords = serviceRecords.value.filter(s => s.service && s.volume != null && s.volume > 0);
  
  if (validRecords.length === 0) {
    notificationStore.showNotification('Нет данных для сохранения. Заполните обязательные поля (Сервис, Объем) хотя бы для одной записи.', 'error');
    return;
  }

  if (!taskLogId.value || !taskLogCls.value) {
    notificationStore.showNotification('Не найден ID или CLS родительской задачи.', 'error');
    return;
  }

  isSaving.value = true;
  try {
    const user = await fetchUserData();
    const today = formatDateToISO(new Date());

    const savePromises = validRecords.map(async (service) => {
      const payload = {
        name: `${taskLogId.value}-${today}`,
        objTpService: service.service.value,
        pvTpService: service.service.pv,
        Value: Number(service.volume),
        objTaskLog: taskLogId.value,
        linkCls: taskLogCls.value,
        CreatedAt: today,
        UpdatedAt: today,
        objUser: user.id,
        pvUser: user.pv,
      };
      return saveResourceExternalService(payload);
    });

    const results = await Promise.allSettled(savePromises);
    const successfulSaves = results.filter(r => r.status === 'fulfilled' && !r.value.error).length;

    if (successfulSaves > 0) {
      notificationStore.showNotification(`Успешно сохранено ${successfulSaves} записей услуг!`, 'success');
      serviceRecords.value = [createNewServiceObject()];
      await loadExistingServices(taskLogId.value);
      emit('saved');
    }
    if (results.length > successfulSaves) {
      notificationStore.showNotification(`Не удалось сохранить ${results.length - successfulSaves} записей.`, 'warning');
    }
  } catch (error) {
    console.error('Ошибка сохранения услуг:', error);
    notificationStore.showNotification(error.message || 'Не удалось сохранить информацию по услугам.', 'error');
  } finally {
    isSaving.value = false;
  }
};

const savePersonnel = async () => {
  if (isSaving.value) return;

  const validRecords = personnelRecords.value.filter(p => p.position && p.count != null && p.count > 0);
  
  if (validRecords.length === 0) {
    notificationStore.showNotification('Нет данных для сохранения. Заполните обязательные поля (Должность, Количество человек).', 'error');
    return;
  }

  if (!taskLogId.value || !taskLogCls.value) {
    notificationStore.showNotification('Не найден ID или CLS родительской задачи.', 'error');
    return;
  }

  isSaving.value = true;
  try {
    const user = await fetchUserData();
    const today = formatDateToISO(new Date());

    const savePromises = validRecords.map(async (personnel) => {
      const payload = {
        name: `${taskLogId.value}-${today}`,
        fvPosition: personnel.position.value,
        pvPosition: personnel.position.pv,
        Quantity: Number(personnel.count),
        Value: personnel.hours ? Number(personnel.hours) : 0,
        objTaskLog: taskLogId.value,
        linkCls: taskLogCls.value,
        CreatedAt: today,
        UpdatedAt: today,
        objUser: user.id,
        pvUser: user.pv,
      };
      return saveResourcePersonnel(payload);
    });

    const results = await Promise.allSettled(savePromises);
    const successfulSaves = results.filter(r => r.status === 'fulfilled' && !r.value.error).length;

    if (successfulSaves > 0) {
      notificationStore.showNotification(`Успешно сохранено ${successfulSaves} записей исполнителей!`, 'success');
      personnelRecords.value = [createNewPersonnelObject()];
      await loadExistingPersonnel(taskLogId.value);
      emit('saved');
    }
    if (results.length > successfulSaves) {
      notificationStore.showNotification(`Не удалось сохранить ${results.length - successfulSaves} записей.`, 'warning');
    }
  } catch (error) {
    console.error('Ошибка сохранения исполнителей:', error);
    notificationStore.showNotification(error.message || 'Не удалось сохранить информацию по исполнителям.', 'error');
  } finally {
    isSaving.value = false;
  }
};

const saveEquipment = async () => {
  if (isSaving.value) return;

  const validRecords = equipmentRecords.value.filter(e => e.equipmentType && e.count != null && e.count > 0);
  
  if (validRecords.length === 0) {
    notificationStore.showNotification('Нет данных для сохранения. Заполните обязательные поля (Тип Техники, Количество).', 'error');
    return;
  }

  if (!taskLogId.value || !taskLogCls.value) {
    notificationStore.showNotification('Не найден ID или CLS родительской задачи.', 'error');
    return;
  }

  isSaving.value = true;
  try {
    const user = await fetchUserData();
    const today = formatDateToISO(new Date());

    const savePromises = validRecords.map(async (equipment) => {
      const payload = {
        name: `${taskLogId.value}-${today}`,
        fvTypEquipment: equipment.equipmentType.value,
        pvTypEquipment: equipment.equipmentType.pv,
        Quantity: Number(equipment.count),
        Value: equipment.hours ? Number(equipment.hours) : 0,
        objTaskLog: taskLogId.value,
        linkCls: taskLogCls.value,
        CreatedAt: today,
        UpdatedAt: today,
        objUser: user.id,
        pvUser: user.pv,
      };
      return saveResourceEquipment(payload);
    });

    const results = await Promise.allSettled(savePromises);
    const successfulSaves = results.filter(r => r.status === 'fulfilled' && !r.value.error).length;

    if (successfulSaves > 0) {
      notificationStore.showNotification(`Успешно сохранено ${successfulSaves} записей техники!`, 'success');
      equipmentRecords.value = [createNewEquipmentObject()];
      await loadExistingEquipment(taskLogId.value);
      emit('saved');
    }
    if (results.length > successfulSaves) {
      notificationStore.showNotification(`Не удалось сохранить ${results.length - successfulSaves} записей.`, 'warning');
    }
  } catch (error) {
    console.error('Ошибка сохранения техники:', error);
    notificationStore.showNotification(error.message || 'Не удалось сохранить информацию по технике.', 'error');
  } finally {
    isSaving.value = false;
  }
};

const saveTools = async () => {
  if (isSaving.value) return;

  const validRecords = toolRecords.value.filter(t => t.toolType && t.count != null && t.count > 0);

  if (validRecords.length === 0) {
    notificationStore.showNotification('Нет данных для сохранения. Заполните обязательные поля (Инструмент, Количество).', 'error');
    return;
  }

  if (!taskLogId.value || !taskLogCls.value) {
    notificationStore.showNotification('Не найден ID или CLS родительской задачи.', 'error');
    return;
  }

  isSaving.value = true;
  try {
    const user = await fetchUserData();
    const today = formatDateToISO(new Date());

    const savePromises = validRecords.map(async (tool) => {
      const payload = {
        name: `${taskLogId.value}-${today}`,
        fvTypTool: tool.toolType.value,
        pvTypTool: tool.toolType.pv,
        Value: Number(tool.count),
        objTaskLog: taskLogId.value,
        linkCls: taskLogCls.value,
        CreatedAt: today,
        UpdatedAt: today,
        objUser: user.id,
        pvUser: user.pv,
      };
      return saveResourceTool(payload);
    });

    const results = await Promise.allSettled(savePromises);
    const successfulSaves = results.filter(r => r.status === 'fulfilled' && !r.value.error).length;

    if (successfulSaves > 0) {
      notificationStore.showNotification(`Успешно сохранено ${successfulSaves} записей инструментов!`, 'success');
      toolRecords.value = [createNewToolObject()];
      await loadExistingTools(taskLogId.value);
      emit('saved');
    }
    if (results.length > successfulSaves) {
      notificationStore.showNotification(`Не удалось сохранить ${results.length - successfulSaves} записей.`, 'warning');
    }
  } catch (error) {
    console.error('Ошибка сохранения инструментов:', error);
    notificationStore.showNotification(error.message || 'Не удалось сохранить информацию по инструментам.', 'error');
  } finally {
    isSaving.value = false;
  }
};

const loadExistingMaterials = async (id) => {
  if (!id) {
    existingRecordsMaterials.value = [];
    return;
  }
  try {
    const data = await loadResourceMaterialsForTaskLog(id);
    existingRecordsMaterials.value = data.map(item => ({
      id: item.id,
      material: item.nameMaterial || '—',
      unit: item.nameMeasure || '—',
      volume: item.Value !== null && item.Value !== undefined ? `${item.Value}` : '—',
    }));
  } catch (error) {
    console.error('Ошибка загрузки материалов:', error);
    notificationStore.showNotification('Не удалось загрузить ранее внесенные материалы.', 'error');
    existingRecordsMaterials.value = [];
  }
};

const loadExistingServices = async (id) => {
  if (!id) {
    existingRecordsServices.value = [];
    return;
  }
  try {
    const data = await loadResourceExternalServicesForTaskLog(id);
    existingRecordsServices.value = data.map(item => ({
      id: item.id,
      service: item.nameTpService || item.name || '—',
      volume: item.Value !== null && item.Value !== undefined ? `${item.Value}` : '—',
    }));
  } catch (error) {
    console.error('Ошибка загрузки услуг:', error);
    notificationStore.showNotification('Не удалось загрузить ранее внесенные услуги.', 'error');
    existingRecordsServices.value = [];
  }
};

const loadExistingPersonnel = async (id) => {
  if (!id) {
    existingRecordsPersonnel.value = [];
    return;
  }
  try {
    const data = await loadResourcePersonnelForTaskLog(id);
    existingRecordsPersonnel.value = data.map(item => ({
      id: item.id,
      position: item.namePosition || '—',
      count: item.Quantity !== null && item.Quantity !== undefined ? `${item.Quantity}` : '—',
      hours: item.Value !== null && item.Value !== undefined ? `${item.Value}` : '—',
    }));
  } catch (error) {
    console.error('Ошибка загрузки исполнителей:', error);
    notificationStore.showNotification('Не удалось загрузить ранее внесенных исполнителей.', 'error');
    existingRecordsPersonnel.value = [];
  }
};

const loadExistingEquipment = async (id) => {
  if (!id) {
    existingRecordsEquipment.value = [];
    return;
  }
  try {
    const data = await loadResourceEquipmentForTaskLog(id);
    existingRecordsEquipment.value = data.map(item => ({
      id: item.id,
      equipmentType: item.nameTypEquipment || '—',
      count: item.Quantity !== null && item.Quantity !== undefined ? `${item.Quantity}` : '—',
      hours: item.Value !== null && item.Value !== undefined ? `${item.Value}` : '—',
    }));
  } catch (error) {
    console.error('Ошибка загрузки техники:', error);
    notificationStore.showNotification('Не удалось загрузить ранее внесенную технику.', 'error');
    existingRecordsEquipment.value = [];
  }
};

const loadExistingTools = async (id) => {
  if (!id) {
    existingRecordsTools.value = [];
    return;
  }
  try {
    const data = await loadResourceToolsForTaskLog(id);
    existingRecordsTools.value = data.map(item => ({
      id: item.id,
      toolType: item.nameTypTool || '—',
      count: item.Quantity !== null && item.Quantity !== undefined ? `${item.Quantity}` : '—',
    }));
  } catch (error) {
    console.error('Ошибка загрузки инструментов:', error);
    notificationStore.showNotification('Не удалось загрузить ранее внесенные инструменты.', 'error');
    existingRecordsTools.value = [];
  }
};

const loadAllOptions = async () => {
  try {
    [
      materialOptions.value,
      unitOptions.value,
      serviceOptions.value,
      positionOptions.value,
      equipmentTypeOptions.value,
      toolTypeOptions.value,
    ] = await Promise.all([
      loadMaterials(),
      loadUnits(),
      loadExternalServices(),
      loadPositions(),
      loadEquipmentTypes(),
      loadToolTypes(),
    ]);
  } catch (error) {
    notificationStore.showNotification('Ошибка при загрузке справочников.', 'error');
  }
};

const loadAllExistingData = (id) => {
  loadExistingMaterials(id);
  loadExistingServices(id);
  loadExistingPersonnel(id);
  loadExistingEquipment(id);
  loadExistingTools(id);
};

onMounted(() => {
  loadAllOptions();
});

watch(
  () => props.record,
  (newRecordData) => {
    if (newRecordData) {
      taskLogId.value = newRecordData.id;
      taskLogCls.value = newRecordData.rawData?.cls || newRecordData.rawData?.linkCls;
      
      activeTab.value = 'materials';
      
      materialRecords.value = [createNewMaterialObject()];
      serviceRecords.value = [createNewServiceObject()];
      personnelRecords.value = [createNewPersonnelObject()];
      equipmentRecords.value = [createNewEquipmentObject()];
      toolRecords.value = [createNewToolObject()];
      
      loadAllExistingData(newRecordData.id);
    }
  },
  { immediate: true, deep: true } 
);

watch(activeTab, (newTab) => {
  if (taskLogId.value) {
    switch (newTab) {
      case 'materials': loadExistingMaterials(taskLogId.value); break;
      case 'externalServices': loadExistingServices(taskLogId.value); break;
      case 'personnel': loadExistingPersonnel(taskLogId.value); break;
      case 'equipment': loadExistingEquipment(taskLogId.value); break;
      case 'tools': loadExistingTools(taskLogId.value); break;
    }
  }
});

</script>

<style scoped>
.work-card-content {
  padding: 24px;
}

.tabs-block {
  margin-bottom: 24px;
}

.tabs-block .first-row-tabs .tabs-header,
.tabs-block .second-row-tabs .tabs-header {
  border-bottom: 1px solid #e0e6ed;
  margin-bottom: 16px;
}

.tabs-block .second-row-tabs .tabs-header {
  margin-bottom: 0;
}

.tab-content {
  display: flex;
  flex-direction: column;
  gap: 16px; 
}

.new-info-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.resource-record-block {
  padding-bottom: 16px; 
  border-bottom: 1px solid #eee;
  position: relative; 
}

.resource-record-block:last-child {
  border-bottom: none;
  padding-bottom: 0;
  margin-bottom: 16px;
}

.resource-record-header {
  height: 20px; 
}

.remove-object {
  position: absolute;
  top: 0; 
  right: 0; 
  font-size: 1.5rem;
  font-weight: bold;
  cursor: pointer;
  color: #ff4d4f; 
  line-height: 1;
  padding: 0 4px; 
  transition: color 0.2s;
}

.remove-object:hover {
  color: #ff7875;
  background-color: #fff2f0;
  border-radius: 50%;
}

.add-object-btn-wrapper {
  display: flex;
  justify-content: flex-start;
  margin-top: 8px;
}

.form-line-materials {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.form-line-services {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 16px;
}

.form-line-personnel,
.form-line-equipment {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 16px;
}

.form-line-tools {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 16px;
}

.button-container {
  display: flex;
  justify-content: flex-end;
  align-items: flex-end;
  margin-top: 24px;
}

.main-actions {
  display: flex;
  gap: 12px;
}

@media (max-width: 768px) {
  .form-line-materials,
  .form-line-services,
  .form-line-personnel,
  .form-line-equipment,
  .form-line-tools {
    grid-template-columns: 1fr;
  }

  .button-container {
    flex-direction: column;
    gap: 16px;
  }

  .main-actions {
    width: 100%;
    justify-content: center;
  }
}
</style>