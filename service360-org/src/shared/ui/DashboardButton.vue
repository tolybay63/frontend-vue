<template>
  <button class="action-button" @click="$emit('click')">
    <div class="action-icon-container">
      <UiIcon :name="iconName" :color="iconColor" class="icon-color" />
    </div>
    <span class="action-label">{{ label }}</span>
  </button>
</template>

<script setup>
import UiIcon from '@/shared/ui/UiIcon.vue';

defineProps({
  label: {
    type: String,
    required: true,
  },
  iconName: {
    type: String,
    required: true,
  },
  iconColor: {
    type: String,
    default: '#2b6cb0', 
  }
});

defineEmits(['click']);
</script>

<style scoped>
.action-button {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 24px;
  background: white;
  border: 1px solid #e6f0fb; 
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); 
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: system-ui, sans-serif;
  font-weight: 300;
  flex-grow: 1;
  min-width: 0;
  text-align: left;
}

.action-button:hover {
  background: #edf2f7; 
  box-shadow: 0 6px 10px rgba(0, 0, 0, 0.1);
}

.action-icon-container {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  background-color: #e6f0fb; 
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}

.action-button:hover .action-icon-container {
    background-color: #c3dafe; 
}

.action-label {
  font-size: 16px;
  font-weight: 500;
  color: #2b6cb0; 
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.2s;
}

.action-button:hover .action-label {
  color: #2b6cb0; 
}

.icon-color {
  width: 24px;
  height: 24px;
}
</style>