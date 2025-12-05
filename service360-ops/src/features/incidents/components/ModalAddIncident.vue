<template>
  <ModalWrapper
    title="Добавить новый инцидент"
    :show-save="canInsert"
    @close="closeModal"
    @save="saveData"
  >
    <div class="form-section">
      <AppDropdown
        class="col-span-2"
        id="incidentType"
        label="Событие / запрос"
        placeholder="Введите или выберите тип инцидента"
        v-model="form.incidentType"
        :options="computedIncidentTypeOptions"
        @update:value="onIncidentTypeSelect"
        filterable
        @search="handleIncidentSearch"
        :required="true"
      />

      <AppInput 
        class="col-span-2" 
        id="applicantNameGlobal"
        label="Информация о заявителе" 
        placeholder="Введите информацию о заявителе.." 
        v-model="form.applicantName" 
        :required="true"
      />

      <div v-for="(incident, index) in form.incidents" :key="incident.id" class="col-span-2">
        <div class="incident-header">
          <h4 class="section-title">Инцидент #{{ index + 1 }}</h4>
          <span v-if="index > 0" class="remove-object" @click="removeObject(index)">×</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AppDropdown
            class="col-span-1"
            :id="'place-' + incident.id"
            label="Место"
            placeholder="Выберите место"
            v-model="incident.place"
            :options="placeOptions"
            :loading="loadingPlaces"
            @update:value="(val) => onPlaceChange(val, index)"
            :required="true"
          />

          <AppDropdown 
            class="col-span-1"
            :id="'incidentType-' + incident.id"
            label="Тип объекта"
            placeholder="Выберите тип объекта"
            v-model="incident.objectType"
            :options="incident.objectTypeOptions"
            :loading="incident.loadingObjectTypes"
            @update:value="(val) => onObjectTypeChange(val, index)"
            :required="true"
          />

          <AppDropdown
            class="col-span-2"
            :id="'incident-' + incident.id"
            label="Объект"
            placeholder="Выберите объект"
            v-model="incident.object"
            :options="incident.objectOptions"
            :loading="incident.loadingObjects"
            @update:value="(val) => onObjectChange(val, index)"
            :required="true"
          />

          <FullCoordinates
            class="col-span-2"
            v-model="incident.coordinates"
            :object-bounds="incident.objectBounds"
            @invalid-range="incident.isInvalidRange = $event"
            @out-of-bounds="incident.isOutOfBounds = true"
            :required="true"
          />

          <AppInput 
            class="col-span-2" 
            :id="'description-' + incident.id"
            label="Описание" 
            placeholder="Введите описание инцидента..." 
            v-model="incident.description" 
            type="textarea" 
            :required="true"
          />

        </div>
      </div>

      <div class="divider"></div>

      <div class="col-span-2">
        <UiButton
          text="Добавить инцидент"
          icon="Plus"
          @click="addObject"
        />
      </div>
    </div>
  </ModalWrapper>
</template>

<script setup>
import { ref, defineEmits, onMounted, nextTick, computed } from 'vue'
import ModalWrapper from '@/app/layouts/Modal/ModalWrapper.vue'
import AppInput from '@/shared/ui/FormControls/AppInput.vue'
import AppDropdown from '@/shared/ui/FormControls/AppDropdown.vue'
import FullCoordinates from '@/shared/ui/FormControls/FullCoordinates.vue'
import UiButton from '@/shared/ui/UiButton.vue'
import { loadEvents, saveIncident, saveNewEvent } from '@/shared/api/incidents/incidentApi'
import { fetchObjectsForSelect } from '@/shared/api/plans/planWorkApi'
import { usePermissions } from '@/shared/api/permissions/usePermissions';
import { useNotificationStore } from '@/app/stores/notificationStore'

const emit = defineEmits(['close', 'update-table'])
const notificationStore = useNotificationStore()
const { hasPermission } = usePermissions()
const canInsert = computed(() => hasPermission('inc:ins'))

let nextObjectId = 1;
const generateObjectId = () => nextObjectId++;

const createNewObjectForm = (dataToCopy = {}) => ({
  id: generateObjectId(), 
  place: dataToCopy.place || null,
  objectType: dataToCopy.objectType || null,
  object: dataToCopy.object || null,
  description: '',
  coordinates: dataToCopy.coordinates ? JSON.parse(JSON.stringify(dataToCopy.coordinates)) : {
    coordStartKm: null,
    coordStartPk: null,
    coordStartZv: null,
    coordEndKm: null,
    coordEndPk: null,
    coordEndZv: null,
  },
  objectBounds: dataToCopy.objectBounds ? JSON.parse(JSON.stringify(dataToCopy.objectBounds)) : null,
  isInvalidRange: false,
  isOutOfBounds: false,
  // Копируем опции для корректной инициализации (если они были загружены)
  objectTypeOptions: dataToCopy.objectTypeOptions ? JSON.parse(JSON.stringify(dataToCopy.objectTypeOptions)) : [],
  objectOptions: dataToCopy.objectOptions ? JSON.parse(JSON.stringify(dataToCopy.objectOptions)) : [],
  filteredRecordsByPlace: dataToCopy.filteredRecordsByPlace ? JSON.parse(JSON.stringify(dataToCopy.filteredRecordsByPlace)) : [],
  loadingObjectTypes: false,
  loadingObjects: false,
});

const form = ref({
  incidentType: null,
  applicantName: '', 
  incidents: [createNewObjectForm()],
})

const incidentTypeOptions = ref([])
const placeOptions = ref([])
const allLoadedRecords = ref([])

const loadingPlaces = ref(false)
const searchQuery = ref('');

const computedIncidentTypeOptions = computed(() => {
  if (searchQuery.value && !incidentTypeOptions.value.some(opt => opt.label.toLowerCase() === searchQuery.value.toLowerCase())) {
    return [
      {
        label: `Создать "${searchQuery.value}"`,
        value: `__CREATE__${searchQuery.value}`,
        isCreate: true
      },
      ...incidentTypeOptions.value
    ];
  }
  return incidentTypeOptions.value;
});

const handleIncidentSearch = (query) => {
  searchQuery.value = query;
};

const onIncidentTypeSelect = async (selectedValue, selectedOption) => {
  if (typeof selectedValue === 'string' && selectedValue.startsWith('__CREATE__')) {
    const labelToCreate = selectedValue.substring('__CREATE__'.length);
    form.value.incidentType = null;
    searchQuery.value = '';

    try {
      if (!labelToCreate.trim()) return;
      const newEvent = await saveNewEvent(labelToCreate);
      incidentTypeOptions.value.push(newEvent);
      
      await nextTick();
      form.value.incidentType = incidentTypeOptions.value.find(opt => opt.value === newEvent.value);
      notificationStore.showNotification(`Событие "${labelToCreate}" успешно создано`, 'success');
    } catch (error) {
      notificationStore.showNotification(`Ошибка при создании события: ${error.message}`, 'error');
      form.value.incidentType = null;
    }
  } else {
    form.value.incidentType = selectedOption;
    searchQuery.value = '';
  }
};

const loadAllObjects = async () => {
  loadingPlaces.value = true
  try {
    const records = await fetchObjectsForSelect(0) 
    allLoadedRecords.value = records

    if (records.length === 0) {
      notificationStore.showNotification('Нет доступных инцидентов для выбора', 'warning')
      return
    }

    const uniquePlaces = [...new Map(
      records.map(item => [String(item.objSection), item])
    ).values()]

    placeOptions.value = uniquePlaces.map(p => ({
      label: p.nameSection,
      value: p.objSection,
      fullRecord: p
    }))

  } catch (error) {
    notificationStore.showNotification('Ошибка при загрузке мест', 'error')
  } finally {
    loadingPlaces.value = false
  }
}

const onPlaceChange = (selectedPlaceId, index) => {
  const objectForm = form.value.incidents[index];
  objectForm.objectType = null
  objectForm.object = null
  objectForm.objectTypeOptions = []
  objectForm.objectOptions = []
  objectForm.filteredRecordsByPlace = []
  objectForm.coordinates = { coordStartKm: null, coordStartPk: null, coordStartZv: null, coordEndKm: null, coordEndPk: null, coordEndZv: null }
  objectForm.objectBounds = null
  objectForm.isInvalidRange = false
  objectForm.isOutOfBounds = false

  if (!selectedPlaceId) return

  objectForm.loadingObjectTypes = true
  try {
    const placeIdToCompare = typeof selectedPlaceId === 'number' ? selectedPlaceId : parseInt(selectedPlaceId)

    const filtered = allLoadedRecords.value.filter(
      record => record.objSection === placeIdToCompare
    )
    objectForm.filteredRecordsByPlace = filtered

    const uniqueTypes = [...new Map(
      filtered.map(r => [String(r.objObjectType), r])
    ).values()]

    objectForm.objectTypeOptions = uniqueTypes.map(t => ({
      label: t.nameObjectType,
      value: t.objObjectType
    }))
  } catch (error) {
    notificationStore.showNotification('Ошибка при фильтрации типов инцидентов', 'error')
  } finally {
    objectForm.loadingObjectTypes = false
  }
}

const onObjectTypeChange = (selectedObjectTypeId, index) => {
  const objectForm = form.value.incidents[index];
  objectForm.object = null
  objectForm.objectOptions = []
  objectForm.coordinates = { coordStartKm: null, coordStartPk: null, coordStartZv: null, coordEndKm: null, coordEndPk: null, coordEndZv: null }
  objectForm.objectBounds = null
  objectForm.isInvalidRange = false
  objectForm.isOutOfBounds = false

  if (!selectedObjectTypeId || !objectForm.place) return

  objectForm.loadingObjects = true
  try {
    const objectTypeIdToCompare = typeof selectedObjectTypeId === 'number' ? selectedObjectTypeId : parseInt(selectedObjectTypeId)

    const filtered = objectForm.filteredRecordsByPlace.filter(
      r => r.objObjectType === objectTypeIdToCompare
    )

    objectForm.objectOptions = filtered.map(r => ({
      label: r.nameObject,
      value: r.objObject,
      fullRecord: r
    }))
  } catch (error) {
    notificationStore.showNotification('Ошибка при фильтрации инцидентов', 'error')
  } finally {
    objectForm.loadingObjects = false
  }
}

const onObjectChange = async (selectedObjectId, index) => {
  const objectForm = form.value.incidents[index];
  objectForm.coordinates = { coordStartKm: null, coordStartPk: null, coordStartZv: null, coordEndKm: null, coordEndPk: null, coordEndZv: null }
  objectForm.objectBounds = null
  objectForm.isInvalidRange = false
  objectForm.isOutOfBounds = false

  if (!selectedObjectId) return

  let selectedOption = objectForm.objectOptions.find(
    opt => opt.value == selectedObjectId
  )

  if (!selectedOption) {
    return
  }

  if (!selectedOption || !selectedOption.fullRecord) return
  
  const record = selectedOption.fullRecord;

  objectForm.coordinates = {
    coordStartKm: parseInt(record.StartKm) || 0,
    coordStartPk: parseInt(record.StartPicket) || 0,
    coordStartZv: parseInt(record.StartLink) || 0,
    coordEndKm: parseInt(record.FinishKm) || 0,
    coordEndPk: parseInt(record.FinishPicket) || 0,
    coordEndZv: parseInt(record.FinishLink) || 0,
  }

  objectForm.objectBounds = {
    startAbs: (record.StartKm || 0) * 1000 + (record.StartPicket || 0) * 100 + (record.StartLink || 0) * 25,
    endAbs: (record.FinishKm || 0) * 1000 + (record.FinishPicket || 0) * 100 + (record.FinishLink || 0) * 25,
    StartKm: record.StartKm,
    StartPicket: record.StartPicket,
    StartLink: record.StartLink,
    FinishKm: record.FinishKm,
    FinishPicket: record.FinishPicket,
    FinishLink: record.FinishLink,
  }

}

const addObject = () => {
  const lastIncident = form.value.incidents[form.value.incidents.length - 1];
  
  // Проверяем, что ключевые поля заполнены в последнем инциденте
  if (
    lastIncident.place && lastIncident.objectType && lastIncident.object && 
    lastIncident.coordinates.coordStartKm !== null // Простой признак того, что координаты были введены/заполнены
  ) {
    // Копируем данные для нового инцидента
    const dataToCopy = {
      place: lastIncident.place,
      objectType: lastIncident.objectType,
      object: lastIncident.object,
      coordinates: lastIncident.coordinates,
      objectBounds: lastIncident.objectBounds,
      objectTypeOptions: lastIncident.objectTypeOptions,
      objectOptions: lastIncident.objectOptions,
      filteredRecordsByPlace: lastIncident.filteredRecordsByPlace,
    };
    
    form.value.incidents.push(createNewObjectForm(dataToCopy));
  } else {
    // Если не заполнены, добавляем пустой инцидент
    form.value.incidents.push(createNewObjectForm());
  }
};

const removeObject = (index) => {
  if (form.value.incidents.length > 1) {
    form.value.incidents.splice(index, 1);
  }
};

const validateForm = () => {
  if (!form.value.incidentType || !form.value.incidentType.value) {
    notificationStore.showNotification('Не выбран Тип инцидента', 'error')
    return false
  }

  if (!form.value.applicantName) {
    notificationStore.showNotification('Введите информацию о заявителе', 'error')
    return false
  }

  for (let i = 0; i < form.value.incidents.length; i++) {
    const obj = form.value.incidents[i];
    const objectNum = i + 1;

    if (!obj.place || !obj.place.value) {
      notificationStore.showNotification(`Инцидент #${objectNum}: не выбрано Место`, 'error');
      return false;
    }
    if (!obj.objectType || !obj.objectType.value) {
      notificationStore.showNotification(`Инцидент #${objectNum}: не выбран Тип объекта`, 'error');
      return false;
    }
    if (!obj.object || !obj.object.value) {
      notificationStore.showNotification(`Инцидент #${objectNum}: не выбран Объект`, 'error');
      return false;
    }

    const coords = obj.coordinates;
    if (
      coords.coordStartKm === null || coords.coordStartPk === null || coords.coordStartZv === null ||
      coords.coordEndKm === null || coords.coordEndPk === null || coords.coordEndZv === null
    ) {
      notificationStore.showNotification(`Инцидент #${objectNum}: не заполнены все Координаты`, 'error');
      return false;
    }

    const startAbs = (coords.coordStartKm || 0) * 1000 + (coords.coordStartPk || 0) * 100 + (coords.coordStartZv || 0) * 25;
    const endAbs = (coords.coordEndKm || 0) * 1000 + (coords.coordEndPk || 0) * 100 + (coords.coordEndZv || 0) * 25;

    if (startAbs > endAbs) {
      notificationStore.showNotification(`Инцидент #${objectNum}: Начало не может быть больше конца`, 'error');
      return false;
    }

    if (obj.objectBounds) {
      const objStartAbs = obj.objectBounds.startAbs;
      const objEndAbs = obj.objectBounds.endAbs;
      if (startAbs < objStartAbs || endAbs > objEndAbs) {
        notificationStore.showNotification(`Инцидент #${objectNum}: Координаты выходят за границы объекта`, 'error');
        return false;
      }
    }

    if (obj.isInvalidRange) {
      notificationStore.showNotification(`Инцидент #${objectNum}: Начало не может быть больше конца (проверка координат)`, 'error');
      return false;
    }

    if (obj.isOutOfBounds) {
      notificationStore.showNotification(`Инцидент #${objectNum}: Координаты выходят за границы объекта (проверка координат)`, 'error');
      return false;
    }

    if (!obj.description) {
      notificationStore.showNotification(`Инцидент #${objectNum}: введите описание инцидента`, 'error')
      return false
    }
  }

  return true
}

const saveData = async () => {
  if (!validateForm()) return;

  const selectedEvent = incidentTypeOptions.value.find(opt => opt.value == form.value.incidentType?.value);
  if (!selectedEvent) {
    notificationStore.showNotification('Не удалось найти данные по типу инцидента', 'error');
    return;
  }

  const savePromises = form.value.incidents.map(objectForm => {
    const selectedObjectOption = objectForm.objectOptions.find(opt => opt.value == objectForm.object?.value);
    if (!selectedObjectOption || !selectedObjectOption.fullRecord) {
      return Promise.reject(new Error('Не удалось получить полные данные для сохранения одного из инцидентов'));
    }

    const objectRecord = selectedObjectOption.fullRecord;
    const coordinates = objectForm.coordinates;

    const payloadData = {
      eventName: selectedEvent.label,
      eventId: selectedEvent.id,
      eventPv: selectedEvent.pv,

      criticalityFv: selectedEvent.fvCriticality,
      criticalityPv: selectedEvent.pvCriticality,
      
      objectId: objectRecord.objObject,
      objectPv: objectRecord.pvObject,
      
      StartKm: coordinates.coordStartKm !== null ? parseFloat(coordinates.coordStartKm) : 0.0,
      FinishKm: coordinates.coordEndKm !== null ? parseFloat(coordinates.coordEndKm) : 0.0,
      StartPicket: coordinates.coordStartPk !== null ? parseFloat(coordinates.coordStartPk) : 0.0,
      FinishPicket: coordinates.coordEndPk !== null ? parseFloat(coordinates.coordEndPk) : 0.0,
      Description: objectForm.description,
      InfoApplicant: form.value.applicantName, 
      
      StartLink: coordinates.coordStartZv !== null ? parseFloat(coordinates.coordStartZv) : 0.0,
      FinishLink: coordinates.coordEndZv !== null ? parseFloat(coordinates.coordEndZv) : 0.0,
    };

    return saveIncident(payloadData);
  });
  
  try {
      await Promise.all(savePromises);
      notificationStore.showNotification(`Инцидент(ы) успешно добавлен(ы) (${form.value.incidents.length} шт.)`, 'success')
      emit('update-table')
      closeModal()
  } catch (error) {
      notificationStore.showNotification(error.message || 'Ошибка при сохранении инцидентов', 'error')
  }
}

onMounted(async () => {
  try {
    const [events, _] = await Promise.all([
      loadEvents(),
      loadAllObjects()
    ]);
    incidentTypeOptions.value = events;
  } catch (error) {
    notificationStore.showNotification('Ошибка при загрузке начальных данных', 'error')
  }
})

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

.section-title {
  font-weight: 600;
  color: #2b6cb0;
  font-size: 14px;
  margin-bottom: 8px;
}

.col-span-2 {
  grid-column: span 2;
}

.divider {
  grid-column: span 2;
  height: 1px;
  background-color: #e0e0e0;
  margin: 16px 0;
}

.incident-header {
  position: relative;
}

.remove-object {
  color: red;
  cursor: pointer;
  font-size: 18px;
  position: absolute;
  right: 0;
  top: 0;
  margin-top: 0;
  margin-right: 8px;
  line-height: 1;
  font-weight: normal; 
}
</style>