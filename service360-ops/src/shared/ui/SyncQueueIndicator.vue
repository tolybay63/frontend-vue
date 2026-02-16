<template>
  <div v-if="pendingCount > 0" class="sync-indicator" @click="showDetails = !showDetails">
    <UiIcon name="CloudUpload" :size="16" />
    <span class="sync-count">{{ pendingCount }}</span>

    <transition name="fade">
      <div v-if="showDetails" class="sync-details" @click.stop>
        <div class="sync-header">Ожидают отправки</div>
        <div v-for="item in queuedItems" :key="item.id" class="sync-item">
          <span class="sync-method">{{ formatMethod(item.rpcMethod) }}</span>
          <span class="sync-time">{{ formatTime(item.createdAt) }}</span>
        </div>
        <div v-if="queuedItems.length === 0" class="sync-empty">Загрузка...</div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import UiIcon from '@/shared/ui/UiIcon.vue';
import { pendingCount, getPendingRequests } from '@/shared/offline/syncQueue';

const showDetails = ref(false);
const queuedItems = ref([]);

const METHOD_LABELS = {
  'data/saveTaskLog': 'Журнал работ',
  'data/saveTaskLogPlan': 'План задачи',
  'data/saveResourceMaterial': 'Материал',
  'data/saveResourcePersonnel': 'Исполнитель',
  'data/saveResourceEquipment': 'Техника',
  'data/saveResourceTool': 'Инструмент',
  'data/saveResourceTpService': 'Услуга',
  'data/saveResourceFact': 'Факт ресурса',
};

const formatMethod = (rpcMethod) => {
  return METHOD_LABELS[rpcMethod] || rpcMethod?.replace('data/', '') || 'Запрос';
};

const formatTime = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
};

watch(showDetails, async (opened) => {
  if (opened) {
    queuedItems.value = await getPendingRequests();
  }
});
</script>

<style scoped>
.sync-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: #EFF6FF;
  border: 1px solid #BFDBFE;
  border-radius: 6px;
  color: #2563EB;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  position: relative;
  white-space: nowrap;
  transition: background 0.2s;
}

.sync-indicator:hover {
  background: #DBEAFE;
}

.sync-count {
  min-width: 16px;
  text-align: center;
}

.sync-details {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: white;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  min-width: 220px;
  max-height: 240px;
  overflow-y: auto;
  z-index: 200;
}

.sync-header {
  padding: 10px 12px;
  font-size: 13px;
  font-weight: 600;
  color: #1E293B;
  border-bottom: 1px solid #E2E8F0;
}

.sync-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  font-size: 12px;
  border-bottom: 1px solid #F1F5F9;
}

.sync-item:last-child {
  border-bottom: none;
}

.sync-method {
  color: #334155;
}

.sync-time {
  color: #94A3B8;
  font-size: 11px;
}

.sync-empty {
  padding: 12px;
  text-align: center;
  color: #94A3B8;
  font-size: 12px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
