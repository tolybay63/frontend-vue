<template>
  <div>
    <ExistingDataBlock :existingRecords="existingRecords" dataType="equipment" />

    <div class="new-info-content">
      <div v-for="(equipment, index) in records" :key="index" class="resource-record-block">
        <div class="resource-record-header">
          <span v-if="index > 0" class="remove-object" @click="removeRecord(index)">×</span>
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
            label="минут"
            :id="`equipment-hours-input-${index}`"
            v-model.number="equipment.hours"
            placeholder="Введите минуты"
            type="number"
            :min="0"
            :required="true" />
        </div>
      </div>

      <div class="col-span-2 add-object-btn-wrapper">
        <UiButton text="Добавить еще Технику" icon="Plus" @click="addRecord" />
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
  saveResourceEquipment,
  loadResourceEquipmentForTaskLog,
} from '@/shared/api/repairs/repairApi';
import { cachedLoadEquipmentTypes } from '@/shared/offline/referenceDataCache';
import { formatDateToISO } from '@/app/stores/date.js';

const props = defineProps({
  savedTaskLogId: { type: [Number, String], default: null },
  savedTaskLogCls: { type: [Number, String], default: null },
  record: { type: Object, default: null },
});

const emit = defineEmits(['saving']);

const notificationStore = useNotificationStore();

const createNewObject = () => ({ equipmentType: null, count: null, hours: null });

const records = ref([createNewObject()]);
const equipmentTypeOptions = ref([]);
const existingRecords = ref([]);

const addRecord = () => { records.value.push(createNewObject()); };
const removeRecord = (index) => { if (records.value.length > 1) records.value.splice(index, 1); };

const loadExisting = async (taskLogId) => {
  const id = taskLogId || props.savedTaskLogId;
  if (!id) { existingRecords.value = []; return; }
  try {
    const data = await loadResourceEquipmentForTaskLog(id);
    existingRecords.value = data.map(item => ({
      id: item.id,
      equipmentType: item.nameTypEquipment || '—',
      count: item.Quantity !== null && item.Quantity !== undefined ? `${item.Quantity}` : '—',
      hours: item.Value !== null && item.Value !== undefined ? `${item.Value}` : '—',
    }));
  } catch (error) {
    console.error('Ошибка загрузки техники:', error);
    notificationStore.showNotification('Не удалось загрузить ранее внесенную технику.', 'error');
    existingRecords.value = [];
  }
};

const save = async () => {
  const validRecords = records.value.filter(e => e.equipmentType && e.count != null && e.count > 0);

  if (validRecords.length === 0) {
    notificationStore.showNotification('Нет данных для сохранения. Заполните обязательные поля (Тип Техники, Количество) хотя бы для одной записи.', 'error');
    return;
  }

  if (validRecords.some(e => e.count < 0 || (e.hours !== null && e.hours < 0))) {
    notificationStore.showNotification('Количество техники и минут не могут быть отрицательными.', 'error');
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

    const savePromises = validRecords.map(async (equipment) => {
      const payload = {
        name: `${props.record.id}-${today}`,
        fvTypEquipment: equipment.equipmentType.value,
        pvTypEquipment: equipment.equipmentType.pv,
        Quantity: Number(equipment.count),
        Value: equipment.hours ? Number(equipment.hours) : 0,
        objTaskLog: props.savedTaskLogId,
        linkCls: props.savedTaskLogCls,
        CreatedAt: today,
        UpdatedAt: today,
        objUser: user.id,
        pvUser: user.pv,
      };
      return saveResourceEquipment(payload);
    });

    const results = await Promise.allSettled(savePromises);
    const successfulSaves = results.filter(r => r.status === 'fulfilled' && !r.value.error).length;
    const failedSaves = results.length - successfulSaves;

    if (failedSaves > 0) {
      console.error('Не удалось сохранить следующую технику:', results.filter(r => r.status === 'rejected' || r.value.error));
      notificationStore.showNotification(`Не удалось сохранить ${failedSaves} из ${results.length} записей техники. Успешно: ${successfulSaves}.`, 'warning');
    } else {
      notificationStore.showNotification(`Успешно сохранено ${successfulSaves} записей техники!`, 'success');
    }

    if (successfulSaves > 0) {
      records.value = [createNewObject()];
      await loadExisting();
    }
  } catch (error) {
    let errorMessage = 'Не удалось сохранить информацию по технике.';
    if (error.response?.data?.error?.message) {
      errorMessage = error.response.data.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    } else if (error.response?.status === 500) {
      errorMessage = 'Ошибка сервера. Попробуйте еще раз.';
    }
    console.error('Ошибка сохранения техники:', error);
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
  try { equipmentTypeOptions.value = await cachedLoadEquipmentTypes(); } catch { notificationStore.showNotification('Не удалось загрузить список типов техники.', 'error'); }
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

.form-line-equipment {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 16px;
}

@media (max-width: 768px) {
  .form-line-equipment { grid-template-columns: 1fr; }
  .remove-object { right: auto; left: 0; }
}
</style>
