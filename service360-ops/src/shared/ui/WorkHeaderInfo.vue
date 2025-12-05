<template>
  <div class="header-info-block">
    <div class="info-row main-info">
      <div class="info-item work-name">
        <span class="label">Наименование работы</span>
        <span class="value">{{ record?.work || record?.name || 'Нет данных' }}</span>
      </div>
    </div>
    <div class="info-row secondary-info">
      <div class="info-item">
        <span class="label">Участок</span>
        <span class="value">{{ section || 'Нет данных' }}</span>
      </div>
      <div class="info-item">
        <span class="label">Место</span>
        <span class="value">{{ record?.location || record?.place || 'Нет данных' }}</span>
      </div>
      <div class="info-item">
        <span class="label">Дата</span>
        <span class="value">{{ formattedDate(date || record?.factDate) || 'Нет данных' }}</span>
      </div>
    </div>
    <div class="info-row tertiary-info">
      <div class="info-item">
        <span class="label">Тип объектов</span>
        <span class="value">{{ record?.objectType || 'Нет данных' }}</span>
      </div>
      <div class="info-item">
        <span class="label">Координаты</span>
        <span class="value">{{ record?.coordinates || 'Нет данных' }}</span>
      </div>
    </div>
    <div class="info-item">
      <span class="label">Объект</span>
      <span class="value">{{ record?.object || 'Нет данных' }}</span>
    </div>
  </div>
</template>

<script setup>
import { defineProps } from 'vue';

const props = defineProps({
  record: {
    type: Object,
    default: null,
  },
  section: {
    type: String,
    default: null,
  },
  date: {
    type: String,
    default: null,
  },
});

const formattedDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};
</script>

<style scoped>
.header-info-block {
  padding: 16px;
  background-color: #f7f9fc;
  border: 1px solid #e0e6ed;
  border-radius: 8px;
  margin-bottom: 24px;
}

.info-row {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  margin-bottom: 12px;
}

.info-row:last-child {
  margin-bottom: 0;
}

.info-row.main-info {
  margin-bottom: 16px;
}

.info-row.secondary-info {
  display: grid;
  grid-template-columns: 1fr 1fr 200px;
  gap: 24px;
  margin-bottom: 12px;
}

.info-row.tertiary-info {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 24px;
}

.info-item {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.label {
  font-size: 12px;
  color: #718096;
  text-transform: uppercase;
  font-weight: 500;
  margin-bottom: 4px;
}

.value {
  font-size: 14px;
  font-weight: 600;
  color: #2d3748;
  word-wrap: break-word;
}

@media (max-width: 768px) {
  .info-row.secondary-info,
  .info-row.tertiary-info {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}
</style>