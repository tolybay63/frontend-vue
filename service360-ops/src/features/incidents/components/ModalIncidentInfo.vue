<template>
  <ModalWrapper
    title="Информация об инциденте"
    @close="closeModal"
    :show-save="canUpdate"
    :show-delete="canDelete"
    @save="saveChanges"
    @delete="onDeleteClicked" 
  >
    <div class="form-section">
      <AppInput
        class="col-span-2"
        id="name"
        label="Событие / запрос"
        v-model="form.name"
        :disabled="true"
      />

      <AppInput
        id="status"
        label="Статус"
        v-model="form.statusName"
        :disabled="true"
      />
      
      <AppInput
        id="criticality"
        label="Критичность"
        :model-value="form.criticalityName"
        placeholder="Критичность не указана"
        :disabled="true"
      />

      <AppInput
        class="col-span-2"
        id="object"
        label="Объект"
        v-model="form.object"
        :disabled="true"
      />
      
      <FullCoordinates
        v-model="form.parsedCoordinates"
        label="Координаты"
        class="col-span-2"
        :disabled="true" 
      />
      
      <AppInput
        class="col-span-2"
        id="description"
        label="Описание"
        v-model="form.description"
        :disabled="false"
        type="textarea"
      />
      
      <AppInput
        id="applicantName"
        label="Информация о заявителе"
        v-model="form.applicantName"
        :disabled="false"
      />

      <Transition name="modal-fade">
        <ConfirmationModal
          v-if="showConfirmModal"
          title="Удаление инцидента"
          :message="`Вы действительно хотите удалить инцидент?`"
          @confirm="onConfirmDelete"
          @cancel="onCancelDelete"
        />
      </Transition>
      <AppInput
        id="date"
        label="Дата и время регистрации"
        :model-value="formattedRegistrationDateTime"
        :disabled="true"
      />

    </div>
  </ModalWrapper>
</template>

<script setup>
import { ref, onMounted, defineEmits, defineProps, computed } from 'vue'
import ModalWrapper from '@/app/layouts/Modal/ModalWrapper.vue'
import AppInput from '@/shared/ui/FormControls/AppInput.vue'
import AppDropdown from '@/shared/ui/FormControls/AppDropdown.vue'
import FullCoordinates from '@/shared/ui/FormControls/FullCoordinates.vue'
import ConfirmationModal from '@/shared/ui/ConfirmationModal.vue' 
import { useNotificationStore } from '@/app/stores/notificationStore'
import { usePermissions } from '@/shared/api/permissions/usePermissions';
import { deleteIncident, loadCriticalityLevels, updateIncident } from '@/shared/api/incidents/incidentApi' 

const emit = defineEmits(['close', 'deleted'])
const props = defineProps({
  rowData: {
    type: Object,
    required: true
  }
})

const showConfirmModal = ref(false)
const notificationStore = useNotificationStore()
const criticalityOptions = ref([])
const loadingCriticality = ref(false)

const { hasPermission } = usePermissions();
const canUpdate = computed(() => hasPermission('inc:upd'));
const canDelete = computed(() => hasPermission('inc:del'));

const initialCoordinates = { 
  coordStartKm: null, 
  coordStartPk: null, 
  coordStartZv: null, 
  coordEndKm: null, 
  coordEndPk: null, 
  coordEndZv: null 
}

const form = ref({
  id: null,
  name: '', 
  object: '', 
  criticalityName: '',
  place: 'Не указано', 
  criticality: '', 
  statusName: '', 
  date: null, 
  time: null,
  description: '', 
  applicantName: 'Неизвестно', 
  parsedCoordinates: { ...initialCoordinates },
})

const formattedRegistrationDateTime = computed(() => {
  if (form.value.date && form.value.time) {
    const [year, month, day] = form.value.date.split('-');
    const timePart = form.value.time.substring(0, 5); // HH:mm
    return `${timePart}, ${day}.${month}.${year}`;
  }
  return 'Дата и время не указаны';
});

const closeModal = () => {
  emit('close')
}

const fillFormWithData = () => {
  const data = props.rowData
  const rawData = data.rawData
  
  form.value.id = data.id || null
  form.value.name = data.name || ''
  form.value.object = data.object || ''
  form.value.statusName = data.statusName || ''
  form.value.date = data.date || null
  form.value.time = data.time || null
  form.value.description = data.description || ''
  
  form.value.place = rawData.nameLocationClsSection || 'Не указано'
  form.value.applicantName = rawData.InfoApplicant || 'Неизвестно'

  // Устанавливаем критичность
  const foundCriticality = criticalityOptions.value.find(
    c => c.value === rawData.fvCriticality
  );
  form.value.criticality = foundCriticality || null;
  form.value.criticalityName = foundCriticality ? foundCriticality.label : 'Не указана';
  
  
  form.value.parsedCoordinates = {
    coordStartKm: rawData.StartKm || null, 
    coordStartPk: rawData.StartPicket || null,
    coordStartZv: rawData.StartLink || null, 
    
    coordEndKm: rawData.FinishKm || null,
    coordEndPk: rawData.FinishPicket || null,
    coordEndZv: rawData.FinishLink || null,
  }
}

onMounted(() => {
  loadInitialData();
})

const loadInitialData = async () => {
  loadingCriticality.value = true;
  try {
    criticalityOptions.value = await loadCriticalityLevels();
    fillFormWithData();
  } catch (error) {
    notificationStore.showNotification('Ошибка при загрузке данных для редактирования', 'error');
  } finally {
    loadingCriticality.value = false;
  }
}

const saveChanges = async () => {
  const rawData = props.rowData.rawData;

  if (!rawData || !rawData.id) {
    notificationStore.showNotification('Отсутствуют исходные данные для обновления.', 'error');
    return;
  }

  const payload = {
    id: rawData.id, // id инцидента
    
    // Передаем ID свойств из rawData, чтобы сервер знал, какие свойства обновлять
    idCriticality: rawData.idCriticality,
    idInfoApplicant: rawData.idInfoApplicant,
    idDescription: rawData.idDescription,
    idUpdatedAt: rawData.idUpdatedAt,

    criticalityFv: form.value.criticality?.value,
    criticalityPv: form.value.criticality?.pv,
    InfoApplicant: form.value.applicantName,
    Description: form.value.description,
  };

  try {
    await updateIncident(payload);
    notificationStore.showNotification('Инцидент успешно обновлен!', 'success');
    emit('deleted'); // Используем событие 'deleted' для обновления таблицы, как при удалении
  } catch (error) {
    notificationStore.showNotification(error.message || 'Ошибка при обновлении инцидента.', 'error');
  }
};

const onDeleteClicked = () => {
  if (!form.value.id) {
     notificationStore.showNotification('Не удалось получить ID записи для удаления.', 'error')
     return
  }
  showConfirmModal.value = true
}

const onCancelDelete = () => {
  showConfirmModal.value = false
}

const onConfirmDelete = async () => {
  showConfirmModal.value = false
  
  const recordId = form.value.id

  try {
    await deleteIncident(recordId) 
    
    notificationStore.showNotification('Инцидент успешно удален!', 'success')
    emit('deleted') 

  } catch (error) {
    notificationStore.showNotification('Ошибка при удалении инцидента.', 'error')
  }
}

</script>

<style scoped>
.form-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem; /* 16px */
  padding: 2rem 1rem; /* 32px 16px */
  background-color: #f9fafb;
}

@media (min-width: 768px) {
  .form-section {
    padding: 2rem; /* 32px */
  }
}

.section-title {
  font-weight: 600;
  color: #2b6cb0;
  grid-column: span 2;
  font-size: 14px;
  margin-bottom: -12px;
}

.col-span-2 {
  grid-column: span 2;
}

/* Стили для анимации вложенного модального окна */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-active .modal-wrapper,
.modal-fade-leave-active .modal-wrapper {
  transition: transform 0.3s ease;
}

.modal-fade-enter-from .modal-wrapper,
.modal-fade-leave-to .modal-wrapper {
  transform: scale(0.95);
  opacity: 0;
}
</style>