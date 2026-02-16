<template>
  <div>
    <ExistingDataBlock :existingRecords="existingRecords" dataType="planning" />

    <div class="new-info-content">
      <div class="form-grid-planning">

        <AppDropdown
          label="Задача"
          placeholder="Выберите задачу"
          id="task-dropdown"
          v-model="newRecord.task"
          :options="taskOptions"
          class="col-span-2"
          :required="true" />

        <AppNumberInput
          label="Плановый объем"
          id="planned-volume-input"
          v-model.number="newRecord.plannedVolume"
          placeholder="Введите плановый объем"
          type="number"
          :min="0"
          class="col-span-2"
          :required="true" />

        <AppDatePicker
          label="Дата начала"
          placeholder="Выберите дату начала"
          id="date-start-picker"
          v-model="newRecord.dateStartPlan"
          class="col-span-1"
          :required="true" />

        <AppDatePicker
          label="Дата завершения"
          placeholder="Выберите дату завершения"
          id="date-end-picker"
          v-model="newRecord.dateEndPlan"
          class="col-span-1"
          :required="true" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, defineProps, defineEmits, defineExpose, watch, onMounted } from 'vue';
import AppDatePicker from '@/shared/ui/FormControls/AppDatePicker.vue';
import AppNumberInput from '@/shared/ui/FormControls/AppNumberInput.vue';
import AppDropdown from '@/shared/ui/FormControls/AppDropdown.vue';
import ExistingDataBlock from '@/shared/ui/ExistingDataBlock.vue';

import { useNotificationStore } from '@/app/stores/notificationStore';
import { getUserData } from '@/shared/api/inspections/inspectionsApi';
import { saveTaskLogPlan, loadTaskLogEntriesForWorkPlan } from '@/shared/api/repairs/repairApi';
import { cachedLoadTasks } from '@/shared/offline/referenceDataCache';
import { formatDate, formatDateToISO } from '@/app/stores/date.js';

const props = defineProps({
  record: { type: Object, default: null },
  sectionId: { type: [Number, String], default: null },
  sectionPv: { type: [Number, String], default: null },
});

const emit = defineEmits(['saving', 'saved']);

const notificationStore = useNotificationStore();

const newRecord = ref({
  task: null,
  plannedVolume: null,
  dateStartPlan: null,
  dateEndPlan: null,
});

const taskOptions = ref([]);
const existingRecords = ref([]);

const loadTaskOptions = async () => {
  try {
    taskOptions.value = await cachedLoadTasks(props.record?.objWork || null);
  } catch (error) {
    notificationStore.showNotification('Не удалось загрузить список задач.', 'error');
  }
};

const loadExisting = async () => {
  const record = props.record;
  if (!record || !record.id || !record.pv) {
    existingRecords.value = [];
    return;
  }
  try {
    const data = await loadTaskLogEntriesForWorkPlan(record.id, record.pv);
    existingRecords.value = data.map(item => ({
      id: item.id,
      task: item.fullNameTask || item.nameTask || '—',
      volumePlan: item.Value !== null && item.Value !== undefined ? `${item.Value}` : '—',
      startDatePlan: item.PlanDateStart ? formatDate(item.PlanDateStart) : '—',
      endDatePlan: item.PlanDateEnd ? formatDate(item.PlanDateEnd) : '—',
      coordinates: '—'
    }));
  } catch (error) {
    console.error('Ошибка загрузки данных:', error);
    notificationStore.showNotification('Не удалось загрузить ранее внесенные записи.', 'error');
    existingRecords.value = [];
  }
};

const save = async () => {
  if (!newRecord.value.task || !newRecord.value.dateStartPlan || !newRecord.value.dateEndPlan) {
    notificationStore.showNotification('Пожалуйста, заполните все обязательные поля (Задача, Дата начала, Дата завершения).', 'error');
    return;
  }

  if (newRecord.value.plannedVolume !== null && newRecord.value.plannedVolume <= 0) {
    notificationStore.showNotification('Плановый объем должен быть больше нуля.', 'error');
    return;
  }

  emit('saving', true);
  try {
    const user = await getUserData();
    const today = formatDateToISO(new Date());

    const dataToSave = {
      name: `${props.record.id}-${today}`,
      objWorkPlan: props.record.id,
      pvWorkPlan: props.record.pv,
      objTask: newRecord.value.task.value,
      pvTask: newRecord.value.task.pv,
      objUser: user.id,
      pvUser: user.pv,
      Value: newRecord.value.plannedVolume ? Number(newRecord.value.plannedVolume) : null,
      PlanDateStart: newRecord.value.dateStartPlan ? formatDateToISO(newRecord.value.dateStartPlan) : null,
      PlanDateEnd: newRecord.value.dateEndPlan ? formatDateToISO(newRecord.value.dateEndPlan) : null,
      CreatedAt: today,
      UpdatedAt: today,
      objLocationClsSection: (props.record.objLocationClsSection !== null && props.record.objLocationClsSection !== undefined) ? props.record.objLocationClsSection : props.sectionId,
      pvLocationClsSection: (props.record.pvLocationClsSection !== null && props.record.pvLocationClsSection !== undefined) ? parseInt(props.record.pvLocationClsSection) : parseInt(props.sectionPv),
    };

    const response = await saveTaskLogPlan(dataToSave);

    if (response.error) {
      throw new Error(response.error.message || JSON.stringify(response.error));
    }

    const resultRecord = response?.result?.store?.records?.[0];
    let taskLogId = null;
    let taskLogCls = null;

    if (resultRecord?.id) {
      taskLogId = resultRecord.id;
      taskLogCls = resultRecord.cls || resultRecord.linkCls;
    } else {
      console.error("Не удалось получить ID и CLS из ответа:", response);
    }

    notificationStore.showNotification('Запись в план успешно добавлена!', 'success');

    await loadExisting();

    newRecord.value.task = null;
    newRecord.value.plannedVolume = null;
    newRecord.value.dateStartPlan = null;
    newRecord.value.dateEndPlan = null;

    emit('saved', { taskLogId, taskLogCls });
  } catch (error) {
    let errorMessage = 'Не удалось сохранить информацию по работе.';
    if (error.response?.data?.error?.message) {
      errorMessage = error.response.data.error.message;
    } else if (error.response?.status === 500) {
      errorMessage = 'Ошибка сервера. Попробуйте еще раз.';
    }
    console.error('Ошибка сохранения:', error);
    notificationStore.showNotification(errorMessage, 'error');
  } finally {
    emit('saving', false);
  }
};

const reset = () => {
  newRecord.value.task = null;
  newRecord.value.plannedVolume = null;
  newRecord.value.dateStartPlan = null;
  newRecord.value.dateEndPlan = null;
  existingRecords.value = [];
};

watch(() => props.record, (newRecordData) => {
  if (newRecordData) {
    reset();
    loadExisting();
    loadTaskOptions();
  }
}, { immediate: true });

const getSelectedTask = () => newRecord.value.task;

const getPlannedVolume = () => newRecord.value.plannedVolume;

const getFormData = () => ({
  task: newRecord.value.task,
  plannedVolume: newRecord.value.plannedVolume,
  dateStartPlan: newRecord.value.dateStartPlan,
  dateEndPlan: newRecord.value.dateEndPlan,
});

const isFormValid = () => {
  return !!(newRecord.value.task && newRecord.value.dateStartPlan && newRecord.value.dateEndPlan);
};

defineExpose({ save, reset, loadExisting, getSelectedTask, getPlannedVolume, getFormData, isFormValid });
</script>

<style scoped>
.new-info-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-grid-planning {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.col-span-1 {
  grid-column: span 1 / span 1;
}

.col-span-2 {
  grid-column: span 2 / span 2;
}

@media (max-width: 768px) {
  .form-grid-planning {
    grid-template-columns: 1fr;
  }
  .col-span-1,
  .col-span-2 {
    grid-column: span 1 / span 1;
  }
}
</style>
