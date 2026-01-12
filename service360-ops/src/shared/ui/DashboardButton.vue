<template>
  <button class="action-button" @click="$emit('click')">
    <div class="action-icon-container">
      <UiIcon :name="iconName" class="icon-color" />
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
  }
});

defineEmits(['click']);
</script>

<style scoped>
.action-button {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: white;
  border: 1px solid transparent;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: system-ui;
  flex-grow: 1;
  min-width: 0;
  text-align: left;
}

.action-button:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
  border-color: #cbd5e0;
}

.action-icon-container {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  background-color: #edf2f7;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #3182ce;
}

.action-label {
  font-size: 15px;
  font-weight: 600;
  color: #2d3748;
  line-height: 1.4;
  flex: 1;
  min-width: 0;
}

.icon-color {
  width: 24px;
  height: 24px;
}

@media (max-width: 768px) {
  .action-button {
    padding: 16px;
  }

  .action-icon-container {
    width: 40px;
    height: 40px;
  }

  .icon-color {
    width: 20px;
    height: 20px;
  }

  .action-label {
    font-size: 14px;
  }
}
</style>