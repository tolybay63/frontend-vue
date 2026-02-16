<template>
  <div>
    <ExistingDataBlock :existingRecords="existingRecords" dataType="externalServices" />

    <div class="new-info-content">
      <div v-for="(service, index) in records" :key="index" class="resource-record-block">
        <div class="resource-record-header">
          <span v-if="index > 0" class="remove-object" @click="removeRecord(index)">×</span>
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
        <UiButton text="Добавить услугу" icon="Plus" @click="addRecord" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, defineProps, defineEmits, defineExpose, onMounted } from 'vue';
import AppNumberInput from '@/shared/ui/FormControls/AppNumberInput.vue';
import AppDropdown from '@/shared/ui/FormControls/AppDropdown.vue';
import ExistingDataBlock from '@/shared/ui/ExistingDataBlock.vue';
import UiButton from '@/shared/ui/UiButton.vue';

import { useNotificationStore } from '@/app/stores/notificationStore';
import { getUserData } from '@/shared/api/inspections/inspectionsApi';
import {
  saveResourceExternalService,
  loadResourceExternalServicesForTaskLog,
} from '@/shared/api/repairs/repairApi';
import { cachedLoadExternalServices } from '@/shared/offline/referenceDataCache';
import { formatDateToISO } from '@/app/stores/date.js';

const props = defineProps({
  savedTaskLogId: { type: [Number, String], default: null },
  savedTaskLogCls: { type: [Number, String], default: null },
  record: { type: Object, default: null },
});

const emit = defineEmits(['saving']);

const notificationStore = useNotificationStore();

const createNewObject = () => ({ service: null, volume: null });

const records = ref([createNewObject()]);
const serviceOptions = ref([]);
const existingRecords = ref([]);

const addRecord = () => { records.value.push(createNewObject()); };
const removeRecord = (index) => { if (records.value.length > 1) records.value.splice(index, 1); };

const loadExisting = async (taskLogId) => {
  const id = taskLogId || props.savedTaskLogId;
  if (!id) { existingRecords.value = []; return; }
  try {
    const data = await loadResourceExternalServicesForTaskLog(id);
    existingRecords.value = data.map(item => ({
      id: item.id,
      service: item.nameTpService || item.name || '—',
      volume: item.Value !== null && item.Value !== undefined ? `${item.Value}` : '—',
    }));
  } catch (error) {
    console.error('Ошибка загрузки услуг:', error);
    notificationStore.showNotification('Не удалось загрузить ранее внесенные услуги.', 'error');
    existingRecords.value = [];
  }
};

const save = async () => {
  const validRecords = records.value.filter(s => s.service && s.volume != null && s.volume > 0);

  if (validRecords.length === 0) {
    notificationStore.showNotification('Нет данных для сохранения. Заполните обязательные поля (Сервис, Объем) хотя бы для одной записи.', 'error');
    return;
  }

  if (validRecords.some(s => s.volume < 0)) {
    notificationStore.showNotification('Объем услуги не может быть отрицательным.', 'error');
    return;
  }

  if (!props.savedTaskLogId || !props.savedTaskLogCls) {
    notificationStore.showNotification('Не найден ID или CLS родительской задачи. Пожалуйста, пересохраните информацию по задаче.', 'error');
    return;
  }

  emit('saving', true);
  try {
    const user = await getUserData();
    const today = formatDateToISO(new Date());

    const savePromises = validRecords.map(async (service) => {
      const payload = {
        name: `${props.savedTaskLogId}-${today}`,
        objTpService: service.service.value,
        pvTpService: service.service.pv,
        Value: Number(service.volume),
        objTaskLog: props.savedTaskLogId,
        linkCls: props.savedTaskLogCls,
        CreatedAt: today,
        UpdatedAt: today,
        objUser: user.id,
        pvUser: user.pv,
      };
      return saveResourceExternalService(payload);
    });

    const results = await Promise.allSettled(savePromises);
    const successfulSaves = results.filter(r => r.status === 'fulfilled' && !r.value.error).length;
    const failedSaves = results.length - successfulSaves;

    if (failedSaves > 0) {
      console.error('Не удалось сохранить следующие услуги:', results.filter(r => r.status === 'rejected' || r.value.error));
      notificationStore.showNotification(`Не удалось сохранить ${failedSaves} из ${results.length} услуг. Успешно: ${successfulSaves}.`, 'warning');
    } else {
      notificationStore.showNotification(`Успешно сохранено ${successfulSaves} записей услуг!`, 'success');
    }

    if (successfulSaves > 0) {
      records.value = [createNewObject()];
      await loadExisting();
    }
  } catch (error) {
    let errorMessage = 'Не удалось сохранить информацию по услугам.';
    if (error.response?.data?.error?.message) {
      errorMessage = error.response.data.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    } else if (error.response?.status === 500) {
      errorMessage = 'Ошибка сервера. Попробуйте еще раз.';
    }
    console.error('Ошибка сохранения услуг:', error);
    notificationStore.showNotification(errorMessage, 'error');
  } finally {
    emit('saving', false);
  }
};

const reset = () => {
  records.value = [createNewObject()];
  existingRecords.value = [];
};

onMounted(async () => {
  try { serviceOptions.value = await cachedLoadExternalServices(); } catch { notificationStore.showNotification('Не удалось загрузить список услуг.', 'error'); }
});

defineExpose({ save, reset, loadExisting });
</script>

<style scoped>
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
.resource-record-block:last-child { border-bottom: none; padding-bottom: 0; }
.resource-record-header { height: 20px; }
.remove-object {
  position: absolute; top: 0; right: 0;
  font-size: 1.5rem; font-weight: bold;
  cursor: pointer; color: #ff4d4f;
  line-height: 1; padding: 0 4px;
  transition: color 0.2s;
}
.remove-object:hover { color: #ff7875; }

.add-object-btn-wrapper {
  display: flex;
  justify-content: flex-start;
  margin-top: 8px;
}

.form-line-services {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 16px;
}

@media (max-width: 768px) {
  .form-line-services { grid-template-columns: 1fr; }
  .remove-object { right: auto; left: 0; }
}
</style>
