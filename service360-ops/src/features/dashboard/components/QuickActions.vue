<template>
  <div class="quick-actions">
    <h2 class="section-title">Быстрые действия</h2>
    <div class="actions-container">
      <DashboardButton
        label="Добавить инцидент"
        iconName="BookOpen"
        @click="$emit('addIncident')"
      />
      <DashboardButton
        label="Запланировать работу"
        iconName="Calendar"
        @click="$emit('planWork')"
      />
      <DashboardButton
        label="Журнал осмотров"
        iconName="ClipboardList"
        @click="$emit('goToInspections')"
      />
    </div>
  </div>
</template>

<script setup>
import DashboardButton from '@/shared/ui/DashboardButton.vue';

defineEmits(['addIncident', 'planWork', 'goToInspections']);
</script>

<style scoped>
.quick-actions {
  margin-bottom: 32px;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 20px;
}

.actions-container {
  display: flex;
  gap: 24px;
}

@media (max-width: 768px) {
  .actions-container {
    flex-direction: column;
    gap: 12px;
  }

  .section-title {
    font-size: 18px;
    margin-bottom: 16px;
  }
}
</style>