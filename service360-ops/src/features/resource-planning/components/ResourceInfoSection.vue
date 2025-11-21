<template>
  <div class="info-section">
    <div class="info-block work-details">
      <p class="info-item">
        <span class="label-strong">Задача:</span>
        {{ recordData.taskName }}
      </p>
      <p class="info-item">
        <span class="label-strong">Работа:</span>
        {{ recordData.workName }}
      </p>
      <p class="info-item">
        <span class="label-strong">Участок:</span>
        {{ recordData.section }}
      </p>
      <p class="info-item">
        <span class="label-strong">Место:</span>
        {{ recordData.place }}
      </p>
      <p class="info-item">
        <span class="label-strong">Объект:</span>
        {{ recordData.objectName }}
      </p>
      <p class="info-item">
        <span class="label-strong">Координаты:</span>
        {{ recordData.coordinates }}
      </p>
    </div>

    <div class="info-block plan-fact-container">
      <div class="plan-fact-group volume-group">
        <div class="group-header">
          <span class="group-title">Объем:</span>
          <span class="volume-short-fact">План: {{ recordData.volume || '-' }} / Факт: {{ recordData.volumeFact || '-' }}</span>
        </div>
      </div>

      <hr class="divider" />

      <div class="dates-section-like-image">
        <div class="date-column start-date-column">
          <span class="date-header">Начало:</span>
          <div class="date-details-row">
            <span class="date-label">План:</span>
            <span class="date-value">{{ recordData.startDate || '-' }}</span>
          </div>
          <div class="date-details-row">
            <span class="date-label">Факт:</span>
            <span class="date-value">{{ recordData.startDateFact || '-' }}</span>
          </div>
        </div>
        
        <hr class="vertical-divider" />

        <div class="date-column end-date-column">
          <span class="date-header">Конец:</span>
          <div class="date-details-row">
            <span class="date-label">План:</span>
            <span class="date-value">{{ recordData.endDate || '-' }}</span>
          </div>
          <div class="date-details-row">
            <span class="date-label">Факт:</span>
            <span class="date-value">{{ recordData.endDateFact || '-' }}</span>
          </div>
        </div>
      </div>

      <button
        class="task-action-button"
        :class="{
          'start-task-button': buttonState.actionType === 'start',
          'complete-task-button': buttonState.actionType === 'complete'
        }"
        :disabled="buttonState.disabled"
        @click="handleButtonClick"
      >
        {{ buttonState.text }}
      </button>
    </div>
  </div>

  <CompleteTaskModal
    :isOpen="isModalOpen"
    :maxVolume="recordData.volume"
    @close="isModalOpen = false"
    @confirm="handleCompleteTask"
  />
</template>

<script setup>
import { computed, ref } from 'vue';
import { saveTaskLogFact } from '@/shared/api/execution/executionApi'; 
import CompleteTaskModal from '@/features/work-log/components/CompleteTaskModal.vue';
import { useNotificationStore } from '@/app/stores/notificationStore'; 

const notificationStore = useNotificationStore(); 

const props = defineProps({
  recordData: {
    type: Object,
    required: true,
  },
  taskLogId: {
    type: [Number, String],
    required: true,
  },
  onTaskUpdated: {
    type: Function,
    required: true,
  }
});

const isModalOpen = ref(false);

const getFormattedDate = (date = new Date()) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const buttonState = computed(() => {
  const hasFactStart = props.recordData.startDateFact && props.recordData.startDateFact !== '-';
  const hasFactEnd = props.recordData.endDateFact && props.recordData.endDateFact !== '-';

  // Логика:
  // 1. Если FactDateStart отсутствует -> Начать задачу
  if (!hasFactStart) {
    return {
      text: 'Начать задачу',
      disabled: false,
      actionType: 'start'
    };
  // 2. Если FactDateEnd отсутствует (а FactDateStart есть) -> Завершить задачу
  } else if (!hasFactEnd) {
    return {
      text: 'Завершить задачу',
      disabled: false,
      actionType: 'complete'
    };
  // 3. Если есть оба -> Задача завершена (disabled)
  } else {
    return {
      text: 'Задача завершена',
      disabled: true,
      actionType: 'finished'
    };
  }
});

const handleStartTask = async () => {
  try {
    const payload = {
      id: props.taskLogId,
      FactDateStart: getFormattedDate(),
    };
    
    await saveTaskLogFact(payload);
    notificationStore.showNotification('Задача успешно начата!', 'success');
    props.onTaskUpdated(); // Обновление компонента WorkLogForm
  } catch (error) {
    console.error('Ошибка при запуске задачи:', error);
    notificationStore.showNotification('Не удалось начать задачу.', 'error');
  }
};

const handleCompleteTask = async (actualVolume) => {
  try {
    const payload = {
      id: props.taskLogId,
      Value: actualVolume, // Фактический объем из модального окна
      FactDateEnd: getFormattedDate(),
    };
    
    await saveTaskLogFact(payload);
    isModalOpen.value = false;
    notificationStore.showNotification('Задача успешно завершена!', 'success');
    props.onTaskUpdated(); // Обновление компонента WorkLogForm
  } catch (error) {
    console.error('Ошибка при завершении задачи:', error);
    notificationStore.showNotification('Не удалось завершить задачу.', 'error');
  }
};

const handleButtonClick = () => {
  if (buttonState.value.actionType === 'start') {
    handleStartTask();
  } else if (buttonState.value.actionType === 'complete') {
    isModalOpen.value = true;
  }
};
</script>

<style scoped>
/* Ваши стили... */
.info-section {
  display: grid;
  grid-template-columns: minmax(300px, 1fr) minmax(300px, 0.7fr);
  gap: 48px;
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
}
.info-block {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.work-details .info-item {
  font-size: 14px;
  color: #4a5568;
  line-height: 1.6;
  margin: 0;
  display: flex;
  align-items: center;
}
.label-strong {
  font-weight: 600;
  color: #2d3748;
  min-width: 100px;
}
.plan-fact-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  border-left: 1px solid #e2e8f0;
  padding-left: 24px;
}
.volume-group {
    margin-bottom: 0; 
}
.plan-fact-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #2d3748;
  font-size: 14px;
  justify-content: space-between; 
}
.group-title {
  font-weight: 600;
  color: #2d3748;
}
.volume-short-fact {
    font-size: 14px;
    font-weight: normal;
    color: #2d3748;
}
.dates-section-like-image {
    display: flex;
    justify-content: space-between;
    align-items: flex-start; 
    gap: 24px;
    margin-top: 16px;
    font-size: 14px;
    color: #4a5568;
}
.date-column {
    display: flex;
    flex-direction: column;
    flex: 1;
    gap: 4px;
}
.date-header {
    font-weight: 600;
    color: #2d3748;
    margin-bottom: 4px;
}
.date-details-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    line-height: 1.4;
}
.date-label {
    font-weight: normal;
    color: #4a5568;
    margin-right: 12px;
}
.date-value {
    font-weight: 600; 
    color: #2d3748;
    white-space: nowrap; 
}
.vertical-divider {
    border: none;
    border-left: 1px solid #e2e8f0;
    height: 100px; 
    margin: 0 12px;
    align-self: stretch; 
}
.divider {
  border: none;
  border-top: 1px solid #e2e8f0;
  margin: 0 -24px;
}
/* Обновленные стили для кнопки */
.task-action-button {
  width: 100%;
  padding: 11px 16px; 
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}
.start-task-button {
  background-color: #eff6ff; 
  color: #3b82f6; 
  border: 1px solid #3b82f6;
}
.start-task-button:hover:not(:disabled) {
  background-color: #dbeafe; 
  border-color: #2563eb;
}
.complete-task-button {
  background-color: #f0fff4; 
  color: #38a169; 
  border: 1px solid #38a169;
}
.complete-task-button:hover:not(:disabled) {
  background-color: #c6f6d5; 
  border-color: #2f855a;
}
.task-action-button:disabled {
  background-color: #e2e8f0;
  color: #a0aec0;
  cursor: not-allowed;
}

@media (max-width: 900px) {
  .info-section {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  .plan-fact-container {
    border-left: none;
    border-top: 1px solid #e2e8f0;
    padding-left: 0;
    padding-top: 24px;
    margin-top: 24px;
    gap: 16px;
  }
  .divider {
    margin: 0 -16px;
  }
  .dates-section-like-image {
    flex-direction: column;
    gap: 24px;
    margin-top: 16px;
  }
  .vertical-divider {
      display: block; 
      border-left: none;
      border-top: 1px solid #e2e8f0;
      height: auto;
      width: 100%;
      margin: 0;
  }
}
</style>