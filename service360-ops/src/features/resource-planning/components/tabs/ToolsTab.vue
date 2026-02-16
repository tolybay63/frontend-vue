<template>
  <div>
    <ExistingDataBlock :existingRecords="existingRecords" dataType="tools" />

    <div class="new-info-content">
      <div v-for="(tool, index) in records" :key="index" class="resource-record-block">
        <div class="resource-record-header">
          <span v-if="index > 0" class="remove-object" @click="removeRecord(index)">×</span>
        </div>

        <div class="form-line-tools">
          <AppDropdown
            label="Инструмент"
            placeholder="Выберите инструмент"
            :id="`tool-type-dropdown-${index}`"
            v-model="tool.toolType"
            :options="toolTypeOptions"
            :required="true" />

          <AppNumberInput
            label="Количество"
            :id="`tool-count-input-${index}`"
            v-model.number="tool.count"
            placeholder="Кол-во"
            type="number"
            :min="0"
            :required="true" />
        </div>
      </div>

      <div class="col-span-2 add-object-btn-wrapper">
        <UiButton text="Добавить инструмент" icon="Plus" @click="addRecord" />
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
  saveResourceTool,
  loadResourceToolsForTaskLog,
} from '@/shared/api/repairs/repairApi';
import { cachedLoadToolTypes } from '@/shared/offline/referenceDataCache';
import { formatDateToISO } from '@/app/stores/date.js';

const props = defineProps({
  savedTaskLogId: { type: [Number, String], default: null },
  savedTaskLogCls: { type: [Number, String], default: null },
  record: { type: Object, default: null },
});

const emit = defineEmits(['saving']);

const notificationStore = useNotificationStore();

const createNewObject = () => ({ toolType: null, count: null });

const records = ref([createNewObject()]);
const toolTypeOptions = ref([]);
const existingRecords = ref([]);

const addRecord = () => { records.value.push(createNewObject()); };
const removeRecord = (index) => { if (records.value.length > 1) records.value.splice(index, 1); };

const loadExisting = async (taskLogId) => {
  const id = taskLogId || props.savedTaskLogId;
  if (!id) { existingRecords.value = []; return; }
  try {
    const data = await loadResourceToolsForTaskLog(id);
    existingRecords.value = data.map(item => ({
      id: item.id,
      toolType: item.nameTypTool || '—',
      count: item.Quantity !== null && item.Quantity !== undefined ? `${item.Quantity}` : '—',
      hours: '—',
    }));
  } catch (error) {
    console.error('Ошибка загрузки инструментов:', error);
    notificationStore.showNotification('Не удалось загрузить ранее внесенные инструменты.', 'error');
    existingRecords.value = [];
  }
};

const save = async () => {
  const validRecords = records.value.filter(t => t.toolType && t.count != null && t.count > 0);

  if (validRecords.length === 0) {
    notificationStore.showNotification('Нет данных для сохранения. Заполните обязательные поля (Инструмент, Количество) хотя бы для одной записи.', 'error');
    return;
  }

  if (validRecords.some(t => t.count < 0 || (t.hours !== null && t.hours < 0))) {
    notificationStore.showNotification('Количество инструментов и минут не могут быть отрицательными.', 'error');
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

    const savePromises = validRecords.map(async (tool) => {
      const payload = {
        name: `${props.record.id}-${today}`,
        fvTypTool: tool.toolType.value,
        pvTypTool: tool.toolType.pv,
        Value: Number(tool.count),
        objTaskLog: props.savedTaskLogId,
        linkCls: props.savedTaskLogCls,
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
      records.value = [createNewObject()];
      await loadExisting();
    }
    if (results.length > successfulSaves) {
      notificationStore.showNotification(`Не удалось сохранить ${results.length - successfulSaves} записей.`, 'warning');
    }
  } catch (error) {
    const errorMessage = error.message || 'Не удалось сохранить информацию по инструментам.';
    console.error('Ошибка сохранения инструментов:', error);
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
  try { toolTypeOptions.value = await cachedLoadToolTypes(); } catch { notificationStore.showNotification('Не удалось загрузить список инструментов.', 'error'); }
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

.form-line-tools {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 16px;
}

@media (max-width: 768px) {
  .form-line-tools { grid-template-columns: 1fr; }
  .remove-object { right: auto; left: 0; }
}
</style>
