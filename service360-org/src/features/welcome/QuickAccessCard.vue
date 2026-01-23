<template>
  <div class="quick-access-card" @click="$emit('click')">
    <div class="card-icon">
      <UiIcon :name="icon" />
    </div>
    <div class="card-content">
      <h3 class="card-title">{{ title }}</h3>
      <p class="card-description">{{ description }}</p>
    </div>
    <div class="card-arrow">
      <UiIcon name="ChevronRight" />
    </div>
  </div>
</template>

<script setup>
import UiIcon from '@/shared/ui/UiIcon.vue'

defineProps({
  icon: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  path: {
    type: String,
    required: true
  }
})

defineEmits(['click'])
</script>

<style scoped>
.quick-access-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 16px;
  border: 1px solid transparent;
}

.quick-access-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
  border-color: #cbd5e0;
}

.card-icon {
  width: 48px;
  height: 48px;
  background: #edf2f7;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #3182ce;
}

.card-icon :deep(svg) {
  width: 24px;
  height: 24px;
}

.card-content {
  flex: 1;
  min-width: 0;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 4px;
}

.card-description {
  font-size: 13px;
  color: #718096;
  line-height: 1.4;
}

.card-arrow {
  color: #cbd5e0;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.card-arrow :deep(svg) {
  width: 20px;
  height: 20px;
}

.quick-access-card:hover .card-arrow {
  transform: translateX(4px);
  color: #3182ce;
}

@media (max-width: 768px) {
  .quick-access-card {
    padding: 16px;
  }

  .card-icon {
    width: 40px;
    height: 40px;
  }

  .card-icon :deep(svg) {
    width: 20px;
    height: 20px;
  }

  .card-title {
    font-size: 14px;
  }

  .card-description {
    font-size: 12px;
  }
}
</style>
