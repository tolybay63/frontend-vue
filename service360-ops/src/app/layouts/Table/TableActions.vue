<template>
  <div class="actions">
    <button
      v-for="(action, index) in actions"
      :key="index"
      class="action-btn"
      :class="{ 'mobile-icon-only': isMobile }"
      @click="action.onClick"
    >
      <UiIcon :name="action.icon" />
      <span v-if="!isMobile">{{ action.label }}</span>
    </button>
  </div>
</template>

<script setup>
import UiIcon from '@/shared/ui/UiIcon.vue'

const props = defineProps({
  actions: {
    type: Array,
    required: true
  },
  isMobile: {
    type: Boolean,
    default: false
  }
})
</script>

<style scoped>
.actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 14px;
  color: #1a202c;
  cursor: pointer;
  transition: background 0.2s;
}

.action-btn:hover {
  background: #edf2f7;
}

/* Mobile styles for action buttons to match the screenshot */
.action-btn.mobile-icon-only {
  background: #3182ce;
  border: none;
  color: #fff;
  border-radius: 50%;
  padding: 12px;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 6px rgba(50, 50, 93, 0.11), 0 1px 3px rgba(0, 0, 0, 0.08);
}

.action-btn.mobile-icon-only:nth-child(2) {
  /* Style for the print icon to match the screenshot (white background) */
  background: #fff;
  border: 1px solid #e2e8f0;
  color: #1a202c;
}

.action-btn.mobile-icon-only:first-child :deep(.icon) {
  /* Explicitly set the icon color to white for the primary action button */
  color: #fff;
}

.action-btn.mobile-icon-only :deep(.icon) {
  width: 24px;
  height: 24px;
}
</style>