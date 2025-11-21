<template>
  <div class="resource-card" :class="{ active: isActive }">
    <div class="card-header">
      <div class="card-icon" :class="{ active: isActive }">
        <component :is="iconComponent" :size="20" :stroke-width="2" />
      </div>
      <h3 class="card-title">{{ title }}</h3>
    </div>
    
    <div class="card-stats">
      <div class="stat-item">
        <span class="stat-label">Позиций:</span>
        <span class="stat-value">{{ isPerformer ? items.length : items.length }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Всего плановых:</span>
        <span class="stat-value">{{ isPerformer ? `${totalPerformers} чел` : totalQuantity }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { 
  Package, 
  Briefcase, 
  Wrench, 
  Truck, 
  Users 
} from 'lucide-vue-next';

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    default: 'package'
  },
  items: {
    type: Array,
    default: () => []
  },
  isPerformer: {
    type: Boolean,
    default: false
  },
  isTool: {
    type: Boolean,
    default: false
  },
  isEquipment: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: false
  }
});

const iconComponent = computed(() => {
  const icons = {
    package: Package,
    briefcase: Briefcase,
    wrench: Wrench,
    truck: Truck,
    users: Users
  };
  return icons[props.icon] || Package;
});

const totalPerformers = computed(() => {
  if (!props.isPerformer) return 0;
  return props.items.reduce((sum, item) => sum + (item.plan || 0), 0);
});

const totalQuantity = computed(() => {
  if (props.isPerformer) return 0;

  // Для инструментов и техники используем planCount
  if (props.isTool || props.isEquipment) {
    return props.items.reduce((sum, item) => sum + (item.planCount || 0), 0);
  }

  // Для материалов и услуг используем plan
  return props.items.reduce((sum, item) => sum + (item.plan || 0), 0);
});
</script>

<style scoped>
.resource-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #e2e8f0;
  transition: all 0.2s;
  cursor: pointer;
  flex: 1 1 0;
  min-width: 0;
}

.resource-card:hover {
  border-color: #cbd5e0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.resource-card.active {
  border-color: #3b82f6;
  background: #eff6ff;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.card-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  background: #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  flex-shrink: 0;
  transition: all 0.2s;
}

.card-icon.active {
  background: #3b82f6;
  color: white;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.card-stats {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-label {
  font-size: 13px;
  color: #64748b;
}

.stat-value {
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
}

@media (max-width: 1024px) {
  .resource-card {
    min-width: 150px;
  }
}

@media (max-width: 768px) {
  .resource-card {
    min-width: 100%;
  }
  
  .card-icon {
    width: 40px;
    height: 40px;
  }
  
  .card-title {
    font-size: 14px;
  }
}
</style>