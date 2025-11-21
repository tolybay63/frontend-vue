<template>
  <ModalWrapper
    title="Определение работы"
    modal-class="modal-assign-work"
    @close="closeModal"
    @save="saveData"
  >
    <div class="form-section">
      <AppDropdown
        class="col-span-2"
        id="incidentType"
        label="Событие / запрос"
        placeholder="Выберите событие / запрос"
        v-model="form.incidentType"
        :options="incidentOptions"
        :required="true"
        @update:value="onIncidentTypeChange"
      />

      <IncidentHeaderInfo
        class="col-span-2"
        :incident="selectedIncident"
      />

      <AppDropdown
        class="col-span-2"
        id="workType"
        label="Работа"
        placeholder="Выберите работу"
        v-model="form.workType"
        :options="workTypeOptions"
        :loading="loadingWorks"
        @update:value="onWorkTypeChange"
        :required="true"
      />

      <AppDropdown
        id="criticality"
        label="Критичность"
        placeholder="Выберите критичность"
        v-model="form.criticality"
        :options="criticalityOptions"
        :loading="loadingCriticality"
        :required="true"
      />

      <AppDropdown
        id="section"
        label="Участок"
        placeholder="Выберите участок"
        v-model="form.section"
        :options="sectionOptions"
        :loading="loadingSections"
        :required="true"
      />

      <AppDatePicker
        id="completionDate"
        label="Дата завершения"
        placeholder="Выберите дату"
        v-model="form.completionDate"
        :is-date-disabled="isDateDisabled" :required="true"
      />
    </div>
  </ModalWrapper>
</template>

<script setup>
import { ref, defineEmits, defineProps, computed, onMounted } from 'vue'
import ModalWrapper from '@/app/layouts/Modal/ModalWrapper.vue'
import AppDropdown from '@/shared/ui/FormControls/AppDropdown.vue'
import AppDatePicker from '@/shared/ui/FormControls/AppDatePicker.vue'
import IncidentHeaderInfo from '@/features/incidents/components/IncidentHeaderInfo.vue'
import { useNotificationStore } from '@/app/stores/notificationStore'
import { fetchLocationByCoords } from '@/shared/api/plans/planWorkApi' 
import { assignWorkToIncident, loadCriticalityLevels, loadWorksForIncidentObject } from '@/shared/api/incidents/incidentApi'

const props = defineProps({
  incidents: { type: Array, default: () => [] }
});

const incidentOptions = computed(() => {
  if (!props.incidents) return [];
  return props.incidents
    .filter(incident => !incident.rawData?.objWorkPlan)
    .map(incident => ({
      label: `${incident.id} - ${incident.name} - ${incident.object}`,
      value: incident.id,
      fullIncidentData: incident
    }));
});

const isDateDisabled = (timestamp) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Устанавливаем время на начало дня
  return timestamp < today.getTime();
};

const emit = defineEmits(['close', 'assign-work'])
const notificationStore = useNotificationStore()

const form = ref({
  incidentType: null,
  workType: null,
  completionDate: null,
  criticality: null,
  section: null,
})

const selectedIncident = ref(null);

const workTypeOptions = ref([])
const loadingWorks = ref(false)
const criticalityOptions = ref([])
const loadingCriticality = ref(false)
const sectionOptions = ref([])
const loadingSections = ref(false)

const onIncidentTypeChange = async (selectedIncidentValue) => {
  form.value.criticality = null;
  form.value.section = null;
  sectionOptions.value = [];
  // Очищаем список работ при смене инцидента
  form.value.workType = null;
  workTypeOptions.value = [];

  selectedIncident.value = null;

  if (!selectedIncidentValue) return;

  const selectedIncidentOption = incidentOptions.value.find(opt => opt.value === selectedIncidentValue);
  if (!selectedIncidentOption || !selectedIncidentOption.fullIncidentData) return;

  selectedIncident.value = selectedIncidentOption.fullIncidentData;
  const incidentData = selectedIncidentOption.fullIncidentData.rawData;

  // Загружаем работы для объекта этого инцидента
  if (incidentData.objObject) {
    loadingWorks.value = true;
    try {
      const works = await loadWorksForIncidentObject(incidentData.objObject);
      workTypeOptions.value = works;
      if (works.length === 0) {
        notificationStore.showNotification('Для объекта этого инцидента нет подходящих работ.', 'warning');
      }
    } finally {
      loadingWorks.value = false;
    }
  }

  // Устанавливаем критичность из данных инцидента
  if (incidentData.fvCriticality) {
    const foundCriticality = criticalityOptions.value.find(
      c => c.value === incidentData.fvCriticality
    );
    if (foundCriticality) {
      form.value.criticality = foundCriticality;
    }
  }

  // Загружаем участки на основе координат инцидента
  const coords = {
    coordStartKm: incidentData.StartKm,
    coordStartPk: incidentData.StartPicket,
    coordEndKm: incidentData.FinishKm,
    coordEndPk: incidentData.FinishPicket,
  };

  // Загружаем участки, если выбрана и работа
  if (form.value.workType?.value && coords.coordStartKm !== null && coords.coordEndKm !== null) {
    await loadSections(coords, form.value.workType.value);
  }
};

const onWorkTypeChange = async (selectedWorkValue) => {
  const selectedIncidentOption = incidentOptions.value.find(opt => opt.value === form.value.incidentType?.value);
  if (!selectedIncidentOption || !selectedIncidentOption.fullIncidentData) return;

  const incidentData = selectedIncidentOption.fullIncidentData.rawData;
  await loadSections({ coordStartKm: incidentData.StartKm, coordEndKm: incidentData.FinishKm, coordStartPk: incidentData.StartPicket, coordEndPk: incidentData.FinishPicket }, selectedWorkValue);
};

const loadSections = async (coords, workId) => {
  form.value.section = null;
  sectionOptions.value = [];

  if (coords.coordStartKm === null || coords.coordEndKm === null) {
    return;
  }

  loadingSections.value = true;
  try {
    const sections = await fetchLocationByCoords(
      workId,
      coords.coordStartKm,
      coords.coordEndKm,
      coords.coordStartPk || 0,
      coords.coordEndPk || 0
    );

    if (Array.isArray(sections) && sections.length > 0) {
      sectionOptions.value = sections.map(s => ({
        label: s.name || s.label,
        value: s.id || s.value,
        pv: s.pv,
        fullRecord: s
      }));

      // Если только один участок, выбираем его автоматически
      if (sections.length === 1) {
        form.value.section = sectionOptions.value[0];
      }
    } else {
      notificationStore.showNotification('Не найден участок по указанным координатам выбранного инцидента', 'warning');
    }
  } catch (error) {
    console.error('Ошибка при загрузке участков:', error);
    notificationStore.showNotification('Ошибка при загрузке участков', 'error');
  } finally {
    loadingSections.value = false;
  }
};

onMounted(async () => {
  try {
    loadingWorks.value = true
    loadingCriticality.value = true;
    const criticalityLevels = await loadCriticalityLevels();
    criticalityOptions.value = criticalityLevels;
  } catch (error) {
    notificationStore.showNotification('Ошибка при загрузке данных', 'error');
  } finally {
    // Загрузка работ теперь происходит при выборе инцидента
    loadingWorks.value = false;
    loadingCriticality.value = false;
  }
})

const validateForm = () => {
  if (!form.value.incidentType || !form.value.incidentType.value) {
    notificationStore.showNotification('Не выбрано Событие / запрос', 'error')
    return false
  }
  if (!form.value.workType || !form.value.workType.value) {
    notificationStore.showNotification('Не выбрана Работа', 'error')
    return false
  }
  if (!form.value.criticality || !form.value.criticality.value) {
    notificationStore.showNotification('Не выбрана Критичность', 'error')
    return false
  }
  if (!form.value.section || !form.value.section.value) {
    notificationStore.showNotification('Не выбран Участок', 'error')
    return false
  }
  if (!form.value.completionDate) {
    notificationStore.showNotification('Не выбрана Дата завершения', 'error')
    return false
  }

  return true
}

const saveData = async () => {
  if (!validateForm()) {
     return
  }
  
  const selectedIncidentOption = incidentOptions.value.find(
    inc => inc.value === form.value.incidentType.value
  );

  const selectedWorkOption = workTypeOptions.value.find(
      work => work.value === form.value.workType.value
  );

  const selectedCriticality = form.value.criticality;
  const selectedSection = form.value.section;

  const completionDate = form.value.completionDate;

  if (!selectedIncidentOption || !selectedIncidentOption.fullIncidentData) {
    notificationStore.showNotification('Не удалось найти данные выбранного инцидента.', 'error');
    return;
  }
  
  if (!selectedWorkOption) {
    notificationStore.showNotification('Не удалось найти данные выбранной работы.', 'error');
    return;
  }

  if (!selectedCriticality) {
    notificationStore.showNotification('Не удалось найти данные выбранной критичности.', 'error');
    return;
  }

  if (!selectedSection) {
    notificationStore.showNotification('Не удалось найти данные выбранного участка.', 'error');
    return;
  }
  
  try {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const assignDateTime = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.000`;

      await assignWorkToIncident(
        selectedIncidentOption.fullIncidentData.rawData,
        selectedWorkOption,
        completionDate,
        selectedCriticality,
        selectedSection,
        assignDateTime
      );

      notificationStore.showNotification('Работа успешно назначена', 'success')
      emit('assign-work')
      closeModal()
  } catch (error) {
      notificationStore.showNotification(error.message || 'Ошибка при назначении работы', 'error')
  }
}

const closeModal = () => {
  emit('close')
}
</script>

<style scoped>
.form-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); 
  gap: 16px;
  padding: 0 32px 32px;
  background-color: #f9fafb;
}

.modal-assign-work .form-section {
  padding-top: 32px;
}

.col-span-2 {
  grid-column: span 2;
}
</style>