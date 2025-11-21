<template>
  <div class="quick-actions">
    <h2 class="section-title">Быстрые действия</h2>
    <div class="actions-container">
      <DashboardButton 
        label="Добавить инцидент" 
        iconName="BookOpen" 
        iconColor="#2B6CB0"
        @click="$emit('addIncident')" 
      />
      <DashboardButton 
        label="Запланировать работу" 
        iconName="Calendar" 
        iconColor="#2B6CB0"
        @click="$emit('planWork')" 
      />
      <DashboardButton 
        label="Журнал осмотров" 
        iconName="ClipboardList" 
        iconColor="#2B6CB0"
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
  font-size: 18px;
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 16px;
}

.actions-container {
  display: flex;
  gap: 16px;
}
</style>