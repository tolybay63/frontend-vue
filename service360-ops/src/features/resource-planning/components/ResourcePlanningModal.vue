<template>
  <ModalWrapper
    title="Планирование ресурсов"
    :show-save="false"
    :show-cancel="false"
    :showDelete="false"
    @close="closeModal"
    :loading="isSaving"
  >
    <div class="work-card-content">
      <!-- Основной контент с табами -->
      <div v-show="!showNorma">
          <WorkHeaderInfo :record="record" :section="section" :date="date" />
          <div class="tabs-block">
            <TabsHeader
              :tabs="tabsRow1"
              :modelValue="activeTab"
              @update:modelValue="handleTabChange"
              :disabledTabs="disabledTabs"
              class="first-row-tabs"
            />
            <TabsHeader
              :tabs="tabsRow2"
              :modelValue="activeTab"
              @update:modelValue="handleTabChange"
              :disabledTabs="disabledTabs"
              class="second-row-tabs"
            />

            <div class="tab-content">
              <PlanningInfoTab
                v-if="activeTab === 'info'"
                ref="infoTab"
                :record="record"
                :sectionId="sectionId"
                :sectionPv="sectionPv"
                @saving="onSaving"
                @saved="onInfoSaved"
              />

              <MaterialsTab
                v-if="activeTab === 'materials'"
                ref="materialsTab"
                :savedTaskLogId="savedTaskLogId"
                :savedTaskLogCls="savedTaskLogCls"
                :record="record"
                @saving="onSaving"
              />

              <ExternalServicesTab
                v-if="activeTab === 'externalServices'"
                ref="externalServicesTab"
                :savedTaskLogId="savedTaskLogId"
                :savedTaskLogCls="savedTaskLogCls"
                :record="record"
                @saving="onSaving"
              />

              <PersonnelTab
                v-if="activeTab === 'personnel'"
                ref="personnelTab"
                :savedTaskLogId="savedTaskLogId"
                :savedTaskLogCls="savedTaskLogCls"
                :record="record"
                @saving="onSaving"
              />

              <EquipmentTab
                v-if="activeTab === 'equipment'"
                ref="equipmentTab"
                :savedTaskLogId="savedTaskLogId"
                :savedTaskLogCls="savedTaskLogCls"
                :record="record"
                @saving="onSaving"
              />

              <ToolsTab
                v-if="activeTab === 'tools'"
                ref="toolsTab"
                :savedTaskLogId="savedTaskLogId"
                :savedTaskLogCls="savedTaskLogCls"
                :record="record"
                @saving="onSaving"
              />
            </div>
          </div>

          <div class="button-container">
            <div class="main-actions">
              <button
                v-if="activeTab === 'info'"
                class="norma-btn"
                @click="openNorma"
              >
                Норма
              </button>
              <MainButton
                :label="getButtonLabel()"
                :loading="isSaving"
                @click="saveData"
                class="save-btn" />
            </div>
          </div>
        </div>

      <!-- Нормативы -->
      <NormativeView
        v-if="showNorma"
        :objWork="normaObjWork"
        :objTask="normaObjTask"
        :plannedVolume="normaPlannedVolume"
        @back="showNorma = false"
        @apply="onNormaApply"
      />
    </div>
  </ModalWrapper>
</template>

<script setup>
import { ref, watch, defineProps, defineEmits, computed, nextTick } from 'vue';
import ModalWrapper from '@/app/layouts/Modal/ModalWrapper.vue';
import MainButton from '@/shared/ui/MainButton.vue';
import TabsHeader from '@/shared/ui/TabsHeader.vue';
import WorkHeaderInfo from '@/shared/ui/WorkHeaderInfo.vue';

import PlanningInfoTab from './tabs/PlanningInfoTab.vue';
import MaterialsTab from './tabs/MaterialsTab.vue';
import ExternalServicesTab from './tabs/ExternalServicesTab.vue';
import PersonnelTab from './tabs/PersonnelTab.vue';
import EquipmentTab from './tabs/EquipmentTab.vue';
import ToolsTab from './tabs/ToolsTab.vue';
import NormativeView from './tabs/NormativeView.vue';

import { useNotificationStore } from '@/app/stores/notificationStore';
import { getUserData } from '@/shared/api/inspections/inspectionsApi';
import { saveTaskLogNormative } from '@/shared/api/repairs/repairApi';
import { formatDateToISO } from '@/app/stores/date.js';

const props = defineProps({
  record: { type: Object, default: null },
  section: { type: String, default: null },
  date: { type: String, default: null },
  sectionId: { type: [Number, String], default: null },
  sectionPv: { type: [Number, String], default: null },
});

const emit = defineEmits(['close']);

const notificationStore = useNotificationStore();

const isSaving = ref(false);
const activeTab = ref('info');
const isInfoSaved = ref(false);
const savedTaskLogId = ref(null);
const savedTaskLogCls = ref(null);

// Norma view state
const showNorma = ref(false);
const normaObjWork = ref(null);
const normaObjTask = ref(null);
const normaPlannedVolume = ref(null);

const disabledTabs = computed(() => isInfoSaved.value ? [] : ['materials', 'externalServices', 'personnel', 'equipment', 'tools']);

const tabsRow1 = ref([
  { name: 'info', label: 'Новая информация по задаче', icon: 'Info' },
  { name: 'externalServices', label: 'Услуги сторонних организаций', icon: 'HardHat' },
]);

const tabsRow2 = ref([
  { name: 'materials', label: 'Материалы', icon: 'Box' },
  { name: 'personnel', label: 'Исполнители', icon: 'Users' },
  { name: 'equipment', label: 'Техника', icon: 'Truck' },
  { name: 'tools', label: 'Инструменты', icon: 'Hammer' },
]);

// Template refs
const infoTab = ref(null);
const materialsTab = ref(null);
const externalServicesTab = ref(null);
const personnelTab = ref(null);
const equipmentTab = ref(null);
const toolsTab = ref(null);

const tabRefs = {
  info: infoTab,
  materials: materialsTab,
  externalServices: externalServicesTab,
  personnel: personnelTab,
  equipment: equipmentTab,
  tools: toolsTab,
};

const closeModal = () => { emit('close'); };

const openNorma = () => {
  if (!infoTab.value?.isFormValid()) {
    notificationStore.showNotification('Пожалуйста, заполните все обязательные поля (Задача, Дата начала, Дата завершения).', 'error');
    return;
  }
  const volume = infoTab.value.getPlannedVolume();
  if (volume !== null && volume <= 0) {
    notificationStore.showNotification('Плановый объем должен быть больше нуля.', 'error');
    return;
  }
  const selectedTask = infoTab.value.getSelectedTask();
  normaObjWork.value = props.record?.objWork;
  normaObjTask.value = selectedTask.value;
  normaPlannedVolume.value = volume;
  showNorma.value = true;
};

const onNormaApply = async (normativeData) => {
  if (isSaving.value) return;
  isSaving.value = true;

  try {
    const formData = infoTab.value.getFormData();
    const user = await getUserData();
    const today = formatDateToISO(new Date());

    const payload = {
      name: `${props.record.id}-${today}`,
      objWorkPlan: props.record.id,
      pvWorkPlan: props.record.pv,
      objTask: formData.task.value,
      pvTask: formData.task.pv,
      objUser: user.id,
      pvUser: user.pv,
      Value: formData.plannedVolume ? Number(formData.plannedVolume) : null,
      PlanDateStart: formData.dateStartPlan ? formatDateToISO(formData.dateStartPlan) : null,
      PlanDateEnd: formData.dateEndPlan ? formatDateToISO(formData.dateEndPlan) : null,
      CreatedAt: today,
      UpdatedAt: today,
      objLocationClsSection: (props.record.objLocationClsSection !== null && props.record.objLocationClsSection !== undefined) ? props.record.objLocationClsSection : props.sectionId,
      pvLocationClsSection: (props.record.pvLocationClsSection !== null && props.record.pvLocationClsSection !== undefined) ? parseInt(props.record.pvLocationClsSection) : parseInt(props.sectionPv),
      id: normativeData.id,
      relcls: normativeData.relcls,
      idrom1: normativeData.idrom1,
      clsrom1: normativeData.clsrom1,
      idrom2: normativeData.idrom2,
      clsrom2: normativeData.clsrom2,
      material: normativeData.material || [],
      tool: normativeData.tool || [],
      equipment: normativeData.equipment || [],
      service: normativeData.service || [],
      personnel: normativeData.personnel || [],
    };

    const response = await saveTaskLogNormative(payload);

    if (response.error) {
      throw new Error(response.error.message || JSON.stringify(response.error));
    }

    notificationStore.showNotification('Нормативы успешно сохранены!', 'success');
    showNorma.value = false;
    infoTab.value?.loadExisting();
  } catch (error) {
    let errorMessage = 'Не удалось сохранить нормативы.';
    if (error.response?.data?.error?.message) {
      errorMessage = error.response.data.error.message;
    }
    console.error('Ошибка сохранения нормативов:', error);
    notificationStore.showNotification(errorMessage, 'error');
  } finally {
    isSaving.value = false;
  }
};

const onSaving = (value) => { isSaving.value = value; };

const onInfoSaved = ({ taskLogId, taskLogCls }) => {
  if (taskLogId) {
    savedTaskLogId.value = taskLogId;
    savedTaskLogCls.value = taskLogCls;
    isInfoSaved.value = true;
  }
};

const buttonLabels = {
  info: 'Добавить новую задачу в план',
  materials: 'Сохранить материалы',
  externalServices: 'Сохранить услуги',
  personnel: 'Сохранить исполнителей',
  equipment: 'Сохранить технику',
  tools: 'Сохранить инструменты',
};

const getButtonLabel = () => buttonLabels[activeTab.value] || 'Сохранить';

const saveData = async () => {
  if (isSaving.value) return;
  const currentTab = tabRefs[activeTab.value]?.value;
  if (currentTab?.save) {
    await currentTab.save();
  }
};

const handleTabChange = async (newTab) => {
  const resourceTabs = ['materials', 'externalServices', 'personnel', 'equipment', 'tools'];
  if (resourceTabs.includes(newTab) && !isInfoSaved.value) {
    notificationStore.showNotification('Сначала необходимо сохранить информацию по задаче!', 'error');
    return;
  }
  activeTab.value = newTab;

  if (resourceTabs.includes(newTab) && isInfoSaved.value) {
    await nextTick();
    const currentTab = tabRefs[newTab]?.value;
    if (currentTab?.loadExisting) {
      currentTab.loadExisting(savedTaskLogId.value);
    }
  }
};

watch(
  () => props.record,
  (newRecordData) => {
    if (newRecordData) {
      isInfoSaved.value = false;
      savedTaskLogId.value = null;
      savedTaskLogCls.value = null;
      activeTab.value = 'info';
      showNorma.value = false;
    }
  },
  { immediate: true }
);
</script>

<style scoped>
.work-card-content {
  padding: 24px;
}

.tabs-block {
  margin-bottom: 24px;
}

.tabs-block .first-row-tabs .tabs-header {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  justify-items: center;
  border-bottom: 1px solid #e0e6ed;
  margin-bottom: 16px;
}

.tabs-block .second-row-tabs .tabs-header {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  justify-content: center;
  align-content: center;
  border-bottom: none;
  margin-bottom: 0;
}

.tabs-block .first-row-tabs .tab {
  border-bottom-color: transparent !important;
  width: 100%;
}

.tabs-block .first-row-tabs .tab.active {
  border-bottom-color: #3182ce !important;
}

.tab-content {
  display: flex;
  flex-direction: column;
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

.norma-btn {
  padding: 10px 20px;
  background: white;
  color: #64748b;
  font-size: 16px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  cursor: pointer;
  transition: all 0.3s;
  white-space: nowrap;
}

.norma-btn:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}

/* Transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .button-container {
    flex-direction: column;
    gap: 16px;
  }

  .main-actions {
    width: 100%;
    justify-content: center;
  }

  .tabs-block .first-row-tabs .tabs-header {
    grid-template-columns: 1fr;
    margin-bottom: 0;
    border-bottom: 1px solid #e0e6ed;
    justify-items: unset;
  }

  .tabs-block .second-row-tabs .tabs-header {
    grid-template-columns: 1fr;
    margin-bottom: 16px;
    border-top: 1px solid #e0e6ed;
    border-bottom: none;
    justify-content: unset;
  }
}
</style>
