<template>
  <div class="header-content">
    <div class="title-and-select">
      <div class="farm-select-wrapper">
        <div 
          ref="farmSelectRef"
          class="farm-select" 
          :aria-expanded="isFarmDropdownOpen"
          @click="toggleFarmMenu"
        >
          {{ selectedFarm }}
          <UiIcon :name="isFarmDropdownOpen ? 'ChevronUp' : 'ChevronDown'" color="#4a5568" class="icon" />
          <div v-if="isFarmDropdownOpen" class="farm-dropdown">
            <div
              v-for="farm in farms"
              :key="farm"
              class="farm-option"
              @click.stop="selectFarm(farm)"
            >
              {{ farm }}
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="action-buttons">
      <button
        class="action-button"
        :class="{
          'active': isRailwayStatusOpen && railwayViewMode === 'status',
          'expanded': expandedButton === 'status' || pinnedButton === 'status'
        }"
        @click="handleStatusClick"
        @mouseenter="expandedButton = 'status'"
        @mouseleave="handleMouseLeave('status')"
      >
        <UiIcon name="Route" :color="isRailwayStatusOpen && railwayViewMode === 'status' ? '#3b82f6' : '#4a5568'" style="width: 16px; height: 16px; flex-shrink: 0;" />
        <span class="button-label">Оценка состояния пути</span>
      </button>
      <button
        class="action-button"
        :class="{
          'active': isRailwayStatusOpen && railwayViewMode === 'width',
          'expanded': expandedButton === 'width' || pinnedButton === 'width'
        }"
        @click="handleWidthClick"
        @mouseenter="expandedButton = 'width'"
        @mouseleave="handleMouseLeave('width')"
      >
        <UiIcon name="Ruler" :color="isRailwayStatusOpen && railwayViewMode === 'width' ? '#3b82f6' : '#4a5568'" style="width: 16px; height: 16px; flex-shrink: 0;" />
        <span class="button-label">Отклонения по ширине колеи</span>
      </button>
      <button
        class="action-button"
        :class="{
          'active': isRailwayStatusOpen && railwayViewMode === 'skew',
          'expanded': expandedButton === 'skew' || pinnedButton === 'skew'
        }"
        @click="handleSkewClick"
        @mouseenter="expandedButton = 'skew'"
        @mouseleave="handleMouseLeave('skew')"
      >
        <UiIcon name="Activity" :color="isRailwayStatusOpen && railwayViewMode === 'skew' ? '#3b82f6' : '#4a5568'" style="width: 16px; height: 16px; flex-shrink: 0;" />
        <span class="button-label">Перекосы и другие отклонения</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import UiIcon from '@/shared/ui/UiIcon.vue';

const props = defineProps({
  selectedFarm: String,
  farms: Array,
  isRailwayStatusOpen: Boolean,
  railwayViewMode: {
    type: String,
    default: 'status'
  }
});

const emit = defineEmits(['selectFarm', 'toggleRailwayStatus', 'switchToWidth', 'switchToStatus', 'switchToSkew']);

const isFarmDropdownOpen = ref(false);
const farmSelectRef = ref(null);
const expandedButton = ref(null);
const pinnedButton = ref(null);

// Функция для закрытия меню по клику вне элемента
const closeFarmMenuOnOutsideClick = (event) => {
  // Проверяем, не является ли целью клика сам элемент выпадающего списка или его потомок
  if (farmSelectRef.value && !farmSelectRef.value.contains(event.target)) {
    isFarmDropdownOpen.value = false;
    // Важно: Удаляем слушатель после закрытия
    document.removeEventListener('click', closeFarmMenuOnOutsideClick);
  }
};

const toggleFarmMenu = () => {
  if (isFarmDropdownOpen.value) {
    // Если меню открыто, закрываем его и удаляем слушатель
    isFarmDropdownOpen.value = false;
    document.removeEventListener('click', closeFarmMenuOnOutsideClick);
  } else {
    // Если меню закрыто, открываем его и добавляем слушатель
    isFarmDropdownOpen.value = true;
    // Добавляем слушатель, чтобы закрыть меню при следующем клике вне него
    // Используем setTimeout, чтобы клик, который открывает меню, не закрыл его сразу же
    setTimeout(() => {
        document.addEventListener('click', closeFarmMenuOnOutsideClick);
    }, 0);
  }
};

const selectFarm = (farm) => {
  emit('selectFarm', farm);
  isFarmDropdownOpen.value = false;
  // Важно: Удаляем слушатель после выбора
  document.removeEventListener('click', closeFarmMenuOnOutsideClick);
};

const toggleRailwayStatus = () => {
  emit('toggleRailwayStatus');
};

const handleWidthClick = () => {
  // Всегда фиксируем новую кнопку
  pinnedButton.value = 'width';
  expandedButton.value = 'width';
  emit('switchToWidth');
};

const handleStatusClick = () => {
  // Всегда фиксируем новую кнопку
  pinnedButton.value = 'status';
  expandedButton.value = 'status';
  emit('switchToStatus');
};

const handleSkewClick = () => {
  // Всегда фиксируем новую кнопку
  pinnedButton.value = 'skew';
  expandedButton.value = 'skew';
  emit('switchToSkew');
};

const handleMouseLeave = (buttonName) => {
  // Сворачиваем кнопку только если она не зафиксирована
  // Активная (зафиксированная) кнопка остаётся развёрнутой
  if (pinnedButton.value !== buttonName) {
    expandedButton.value = null;
  }
};

// Дополнительный хук для очистки слушателя, если компонент будет уничтожен
import { onUnmounted } from 'vue';
onUnmounted(() => {
  document.removeEventListener('click', closeFarmMenuOnOutsideClick);
});

</script>

<style scoped>
.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.title-and-select {
  display: flex;
  align-items: center;
  gap: 16px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #1a202c;
  margin: 0;
}

.farm-select-wrapper {
  position: relative;
}

.farm-select {
  font-family: 'SF Pro Text', sans-serif;
  display: flex;
  align-items: center;
  font-size: 14px;
  color: #4a5568;
  cursor: pointer;
  position: relative;
  user-select: none;
  font-weight: 500;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.15s;
}

.farm-select:hover {
  background-color: #f7fafc;
}

.farm-select .icon {
  width: 14px;
  height: 14px;
  margin-left: 4px;
  color: #4a5568;
  transition: transform 0.2s;
}

.farm-select[aria-expanded="true"] .icon {
  transform: rotate(180deg);
}

.farm-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  z-index: 20;
  min-width: 250px;
  padding: 4px 0;
}

.farm-option {
  padding: 8px 16px;
  font-size: 14px;
  color: #4a5568;
  cursor: pointer;
  white-space: nowrap;
}

.farm-option:hover {
  background-color: #f7fafc;
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 12px;
}

.action-button {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  width: 40px;
  height: 40px;
  padding: 0 10px;
  background: white;
  border: 2px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0,0,0,0.04);
  overflow: hidden;
}

.action-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.08);
}

.action-button.expanded {
  width: auto;
  min-width: 40px;
}

.action-button.active {
  border-color: #3b82f6;
  background: #eff6ff;
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.2);
}

.button-label {
  font-size: 14px;
  color: #4a5568;
  white-space: nowrap;
  font-weight: 500;
  max-width: 0;
  opacity: 0;
  transition: max-width 0.3s ease, opacity 0.3s ease;
  overflow: hidden;
}

.action-button.expanded .button-label {
  max-width: 300px;
  opacity: 1;
}

.action-button.active .button-label {
  color: #3b82f6;
}
</style>