<template>
  <div class="normative-view">
    <button class="back-btn" @click="$emit('back')">
      <UiIcon name="ArrowLeft" :size="16" />
      <span>Назад</span>
    </button>

    <h3 class="summary-title">Нормативные ресурсы</h3>
    <p class="description">Нормативы для выбранной задачи</p>

    <div v-if="loading" class="loading-state">Загрузка...</div>

    <div v-else-if="!hasData" class="empty-state">Нормативы не найдены</div>

    <div v-else class="resources-summary">
      <!-- Материалы -->
      <div v-if="normative.material && normative.material.length > 0" class="resource-section">
        <div class="section-header">Материалы</div>
        <div class="resource-table">
          <div v-for="item in normative.material" :key="item.id" class="table-row">
            <span class="table-cell">{{ item.nameMaterial }}, {{ item.nameMeasure }}</span>
            <div class="table-cell value">
              <AppNumberInput v-model.number="item.Value" :min="0" class="inline-input" />
            </div>
          </div>
        </div>
      </div>

      <!-- Исполнители -->
      <div v-if="normative.personnel && normative.personnel.length > 0" class="resource-section">
        <div class="section-header">Исполнители</div>
        <div class="resource-table">
          <div v-for="item in normative.personnel" :key="item.id" class="table-row">
            <span class="table-cell">{{ item.namePosition }}</span>
            <div class="table-cell value">
              <AppNumberInput v-model.number="item.Quantity" :min="0" class="inline-input" />
              <span class="unit-label">чел.</span>
              <span class="separator">/</span>
              <AppNumberInput v-model.number="item.Value" :min="0" class="inline-input" />
              <span class="unit-label">мин</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Техника -->
      <div v-if="normative.equipment && normative.equipment.length > 0" class="resource-section">
        <div class="section-header">Техника</div>
        <div class="resource-table">
          <div v-for="item in normative.equipment" :key="item.id" class="table-row">
            <span class="table-cell">{{ item.nameTypEquipment }}</span>
            <div class="table-cell value">
              <AppNumberInput v-model.number="item.Quantity" :min="0" class="inline-input" />
              <span class="unit-label">шт.</span>
              <span class="separator">/</span>
              <AppNumberInput v-model.number="item.Value" :min="0" class="inline-input" />
              <span class="unit-label">мин</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Инструменты -->
      <div v-if="normative.tool && normative.tool.length > 0" class="resource-section">
        <div class="section-header">Инструменты</div>
        <div class="resource-table">
          <div v-for="item in normative.tool" :key="item.id" class="table-row">
            <span class="table-cell">{{ item.nameTypTool }}</span>
            <div class="table-cell value">
              <AppNumberInput v-model.number="item.Quantity" :min="0" class="inline-input" />
              <span class="unit-label">шт.</span>
              <span class="separator">/</span>
              <AppNumberInput v-model.number="item.Value" :min="0" class="inline-input" />
              <span class="unit-label">мин</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Услуги сторонних организаций -->
      <div v-if="normative.service && normative.service.length > 0" class="resource-section">
        <div class="section-header">Услуги сторонних организаций</div>
        <div class="resource-table">
          <div v-for="item in normative.service" :key="item.id" class="table-row">
            <span class="table-cell">{{ item.nameTpService }}</span>
            <div class="table-cell value">
              <AppNumberInput v-model.number="item.Value" :min="0" class="inline-input" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="norma-actions">
      <button class="cancel-btn" @click="$emit('back')">Отмена</button>
      <MainButton label="Применить" @click="apply" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, defineProps, defineEmits, onMounted } from 'vue';
import UiIcon from '@/shared/ui/UiIcon.vue';
import MainButton from '@/shared/ui/MainButton.vue';
import AppNumberInput from '@/shared/ui/FormControls/AppNumberInput.vue';
import { useNotificationStore } from '@/app/stores/notificationStore';
import { loadResourceNormative } from '@/shared/api/repairs/repairApi';

const props = defineProps({
  objWork: { type: [Number, String], required: true },
  objTask: { type: [Number, String], required: true },
  plannedVolume: { type: Number, default: null },
});

const emit = defineEmits(['back', 'apply']);

const apply = () => {
  emit('apply', normative.value);
};

const notificationStore = useNotificationStore();
const loading = ref(false);
const normative = ref({});

const hasData = computed(() => {
  return (
    (normative.value.material && normative.value.material.length > 0) ||
    (normative.value.personnel && normative.value.personnel.length > 0) ||
    (normative.value.equipment && normative.value.equipment.length > 0) ||
    (normative.value.tool && normative.value.tool.length > 0) ||
    (normative.value.service && normative.value.service.length > 0)
  );
});

onMounted(async () => {
  loading.value = true;
  try {
    const result = await loadResourceNormative(props.objWork, props.objTask, props.plannedVolume);
    normative.value = result[0] || {};
  } catch (error) {
    console.error('Ошибка загрузки нормативов:', error);
    notificationStore.showNotification('Не удалось загрузить нормативы.', 'error');
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.normative-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: #3b82f6;
  font-size: 14px;
  cursor: pointer;
  padding: 4px 0;
  align-self: flex-start;
  transition: color 0.2s;
}

.back-btn:hover {
  color: #2563eb;
}

.summary-title {
  font-size: 16px;
  font-weight: 600;
  color: #2d3748;
  margin: 0;
}

.description {
  margin: 0;
  color: #4a5568;
  font-size: 14px;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 32px 16px;
  color: #94a3b8;
  font-size: 14px;
}

.resources-summary {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.resource-section {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
}

.section-header {
  font-size: 14px;
  font-weight: 600;
  color: #2d3748;
  background: #f7fafc;
  padding: 12px 16px;
  border-bottom: 1px solid #e2e8f0;
}

.resource-table {
  display: flex;
  flex-direction: column;
}

.table-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e2e8f0;
  font-size: 14px;
}

.table-row:last-child {
  border-bottom: none;
}

.table-row:hover {
  background: #f7fafc;
}

.table-cell {
  color: #4a5568;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.table-cell.value {
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  flex: 0 0 auto;
  margin-left: 16px;
}

.inline-input {
  width: 120px;
}

.inline-input :deep(label) {
  display: none;
}

.inline-input :deep(.form-group) {
  margin: 0;
}

.inline-input :deep(input) {
  padding: 6px 8px;
  font-size: 14px;
  text-align: center;
  font-weight: 600;
  color: #2d3748;
}

.unit-label {
  color: #64748b;
  font-size: 13px;
  font-weight: 400;
}

.separator {
  color: #94a3b8;
  font-size: 13px;
}

.norma-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
}

.cancel-btn {
  padding: 10px 20px;
  background: white;
  color: #64748b;
  font-size: 16px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  cursor: pointer;
  transition: all 0.3s;
}

.cancel-btn:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.norma-actions :deep(.main-button) {
  width: auto;
  padding: 10px 20px;
}

@media (max-width: 640px) {
  .section-header {
    font-size: 13px;
    padding: 10px 12px;
  }

  .table-row {
    flex-direction: column;
    align-items: flex-start;
    padding: 10px 12px;
    gap: 8px;
  }

  .table-cell.value {
    margin-left: 0;
    flex-wrap: wrap;
  }
}
</style>
