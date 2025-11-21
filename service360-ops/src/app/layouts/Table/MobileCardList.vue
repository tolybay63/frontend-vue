<template>
  <div class="mobile-card-list">
    <div
      v-for="(row, index) in rows"
      :key="row.id || row.index"
      class="card"
      @click="handleCardClick(row)"
    >
      <div class="card-header">
        <div class="card-title">
          <span class="card-id">№ {{ row.id || row.index || 'б/н' }}</span>
          <span v-if="row.nameLocationClsSection" class="card-section">{{ row.nameLocationClsSection }}</span>
          <span v-else-if="row.name && row.work" class="card-section">{{ row.name }}</span>
        </div>
        <div class="card-date">{{ formatDate(row.planDate || row.date) }}</div>
      </div>

      <div class="card-body">
        <!-- Основная информация -->
        <div v-if="row.nameDefect" class="card-main-work">{{ row.nameDefect }}</div>
        <div v-else-if="row.nameComponentParams" class="card-main-work">{{ row.nameComponentParams }}</div>
        <div v-else-if="row.work" class="card-main-work">{{ row.work }}</div>
        <div v-else-if="row.name" class="card-main-work">{{ row.name }}</div>

        <!-- Дополнительная информация -->
        <div v-if="row.nameDefectsComponent" class="card-full-work">{{ row.nameDefectsComponent }}</div>
        <div v-else-if="row.nameComponent" class="card-full-work">{{ row.nameComponent }}</div>
        <div v-if="row.nameObject" class="card-full-work">{{ row.nameObject }}</div>
        <div v-else-if="row.object" class="card-full-work">{{ row.object }}</div>
        <div v-else-if="row.nameComponent" class="card-full-work">{{ row.nameComponent }}</div>
        <div v-else-if="row.description" class="card-full-work">{{ row.description }}</div>
        <div v-else-if="row.fullNameWork" class="card-full-work">{{ row.fullNameWork }}</div>
      </div>
      
      <div class="card-footer">
        <div class="card-coordinates">
          <UiIcon name="MapPin" class="icon-muted pin-icon" />
          {{ row.coordinates }}
        </div>
        <UiIcon name="ChevronRight" class="icon-arrow" />
      </div>
    </div>
    <div v-if="!rows.length && !loading" class="empty">Нет данных</div>
    <div v-if="loading" class="loading">Загрузка...</div>
  </div>
</template>

<script setup>
import UiIcon from '@/shared/ui/UiIcon.vue' // Assuming UiIcon is available

const props = defineProps({
  rows: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['row-dblclick'])

const handleCardClick = (row) => {
  // Simulating the double-click behavior on a single tap for mobile
  emit('row-dblclick', row) 
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return dateString

  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0') // Месяцы начинаются с 0
  const year = date.getFullYear()
  return `${day}.${month}.${year}`
}
</script>

<style scoped>
.mobile-card-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0 2px; /* Slight padding to avoid edge-to-edge on some devices */
}

.card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0px 1px 4px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: box-shadow 0.2s;
  border: 1px solid #e2e8f0;
}

.card:hover {
  box-shadow: 0px 2px 8px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-id {
  font-size: 16px;
  font-weight: 600;
  color: #1a202c;
}

.card-section {
  background-color: #e6f6ff; /* Light blue background for section name */
  color: #3182ce;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
  /* Стили для обрезки длинного текста */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 150px; /* Ограничиваем максимальную ширину, чтобы не вытеснять дату */
}

.card-date {
  font-size: 14px;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 4px;
}

.card-date::before {
  content: '';
  display: inline-block;
  width: 14px;
  height: 14px;
  background-image: url('data:image/svg+xml;charset=UTF-8,%3Csvg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"%3E%3Cpath fill="%236b7280" d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM5 8V6h14v2H5zm2 4h5v5H7v-5z"/%3E%3C/svg%3E'); /* Calendar icon */
  background-size: cover;
  margin-right: 4px;
}

.card-body {
  margin-bottom: 8px;
}

.card-main-work {
  font-size: 15px;
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 2px;
}

.card-full-work {
  font-size: 12px;
  color: #4a5568;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
}

.card-coordinates {
  font-size: 13px;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 4px;
}

.pin-icon {
  width: 14px;
  height: 14px;
}

.icon-arrow {
  width: 16px;
  height: 16px;
  color: #a0aec0;
}

.empty, .loading {
  text-align: center;
  padding: 20px 0;
  color: #718096;
}
</style>