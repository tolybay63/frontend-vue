<template>
  <div>
    <ExistingDataBlock :existingRecords="existingRecords" dataType="personnel" />

    <div class="new-info-content">
      <div v-for="(personnel, index) in records" :key="index" class="resource-record-block">
        <div class="resource-record-header">
          <span v-if="index > 0" class="remove-object" @click="removeRecord(index)">×</span>
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
            label="минут"
            :id="`personnel-hours-input-${index}`"
            v-model.number="personnel.hours"
            placeholder="Введите минуты"
            type="number"
            :min="0"
            :required="true" />
        </div>
      </div>

      <div class="col-span-2 add-object-btn-wrapper">
        <UiButton text="Добавить еще Должность" icon="Plus" @click="addRecord" />
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
  saveResourcePersonnel,
  loadResourcePersonnelForTaskLog,
} from '@/shared/api/repairs/repairApi';
import { cachedLoadPositions } from '@/shared/offline/referenceDataCache';
import { formatDateToISO } from '@/app/stores/date.js';

const props = defineProps({
  savedTaskLogId: { type: [Number, String], default: null },
  savedTaskLogCls: { type: [Number, String], default: null },
  record: { type: Object, default: null },
});

const emit = defineEmits(['saving']);

const notificationStore = useNotificationStore();

const createNewObject = () => ({ position: null, count: null, hours: null });

const records = ref([createNewObject()]);
const positionOptions = ref([]);
const existingRecords = ref([]);

const addRecord = () => { records.value.push(createNewObject()); };
const removeRecord = (index) => { if (records.value.length > 1) records.value.splice(index, 1); };

const loadExisting = async (taskLogId) => {
  const id = taskLogId || props.savedTaskLogId;
  if (!id) { existingRecords.value = []; return; }
  try {
    const data = await loadResourcePersonnelForTaskLog(id);
    existingRecords.value = data.map(item => ({
      id: item.id,
      position: item.namePosition || '—',
      count: item.Quantity !== null && item.Quantity !== undefined ? `${item.Quantity}` : '—',
      hours: item.Value !== null && item.Value !== undefined ? `${item.Value}` : '—',
    }));
  } catch (error) {
    console.error('Ошибка загрузки исполнителей:', error);
    notificationStore.showNotification('Не удалось загрузить ранее внесенных исполнителей.', 'error');
    existingRecords.value = [];
  }
};

const save = async () => {
  const validRecords = records.value.filter(p => p.position && p.count != null && p.count > 0);

  if (validRecords.length === 0) {
    notificationStore.showNotification('Нет данных для сохранения. Заполните обязательные поля (Должность, Количество человек) хотя бы для одной записи.', 'error');
    return;
  }

  if (validRecords.some(p => p.count < 0 || (p.hours !== null && p.hours < 0))) {
    notificationStore.showNotification('Количество человек и минут не могут быть отрицательными.', 'error');
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

    const savePromises = validRecords.map(async (personnel) => {
      const payload = {
        name: `${props.record.id}-${today}`,
        fvPosition: personnel.position.value,
        pvPosition: personnel.position.pv,
        Quantity: Number(personnel.count),
        Value: personnel.hours ? Number(personnel.hours) : 0,
        objTaskLog: props.savedTaskLogId,
        linkCls: props.savedTaskLogCls,
        CreatedAt: today,
        UpdatedAt: today,
        objUser: user.id,
        pvUser: user.pv,
      };
      return saveResourcePersonnel(payload);
    });

    const results = await Promise.allSettled(savePromises);
    const successfulSaves = results.filter(r => r.status === 'fulfilled' && !r.value.error).length;
    const failedSaves = results.length - successfulSaves;

    if (failedSaves > 0) {
      console.error('Не удалось сохранить следующих исполнителей:', results.filter(r => r.status === 'rejected' || r.value.error));
      notificationStore.showNotification(`Не удалось сохранить ${failedSaves} из ${results.length} исполнителей. Успешно: ${successfulSaves}.`, 'warning');
    } else {
      notificationStore.showNotification(`Успешно сохранено ${successfulSaves} записей исполнителей!`, 'success');
    }

    if (successfulSaves > 0) {
      records.value = [createNewObject()];
      await loadExisting();
    }
  } catch (error) {
    let errorMessage = 'Не удалось сохранить информацию по исполнителям.';
    if (error.response?.data?.error?.message) {
      errorMessage = error.response.data.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    } else if (error.response?.status === 500) {
      errorMessage = 'Ошибка сервера. Попробуйте еще раз.';
    }
    console.error('Ошибка сохранения исполнителей:', error);
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
  try { positionOptions.value = await cachedLoadPositions(); } catch { notificationStore.showNotification('Не удалось загрузить список должностей.', 'error'); }
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

.form-line-personnel {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 16px;
}

@media (max-width: 768px) {
  .form-line-personnel { grid-template-columns: 1fr; }
  .remove-object { right: auto; left: 0; }
}
</style>
