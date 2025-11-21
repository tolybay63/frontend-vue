<template>
  <div class="incident-header-info">
    <div class="info-grid">
      <div class="info-item col-span-2">
        <span class="info-label">Источник:</span>
        <span class="info-value">{{ incident?.nameCls || '-' }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Статус:</span>
        <span class="info-value">{{ incident?.statusName || '-' }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Дата и время регистрации:</span>
        <span class="info-value">{{ incident?.date || '-' }}</span>
      </div>
      <div class="info-item col-span-2">
        <span class="info-label">Объект:</span>
        <span class="info-value">{{ incident?.object || '-' }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Координаты:</span>
        <span class="info-value">{{ incident?.coordinates || '-' }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Информация о заявителе:</span>
        <span class="info-value">{{ incident?.rawData?.InfoApplicant || '-' }}</span>
      </div>
      <div class="info-item col-span-2">
        <span class="info-label">Описание:</span>
        <span class="info-value description-value">{{ incident?.description || '-' }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  incident: {
    type: Object,
    default: null
  }
});
</script>

<style scoped>
.incident-header-info {
  background-color: #eef2f7;
  padding: 16px;
  border-radius: 8px;
  margin-top: 16px;
  border: 1px solid #d1d5db;
}
.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  font-size: 14px;
}
.info-item {
  display: flex;
  flex-direction: column;
}
.info-label {
  font-weight: 600;
  color: #4a5568;
  margin-bottom: 4px;
}
.info-value {
  color: #2d3748;
}
.description-value {
  white-space: pre-wrap;
  word-break: break-word;
}
.col-span-2 {
  grid-column: span 2;
}
</style>