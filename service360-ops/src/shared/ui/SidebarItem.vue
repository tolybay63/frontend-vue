<template>
  <div class="sidebar-item-wrapper">
    <!-- Родительский элемент (с дочерними или обычная ссылка) -->
    <component
      :is="children ? 'div' : 'router-link'"
      :to="!children ? to : undefined"
      class="sidebar-item"
      :class="{ 
        active: isActive, 
        'is-collapsed': isCollapsed,
        'has-children': children,
        'is-expanded': isExpanded
      }"
      @click="handleClick"
    >
      <UiIcon :name="icon" class="icon" />
      <span class="label">{{ label }}</span>
      <UiIcon 
        v-if="children && !isCollapsed" 
        :name="isExpanded ? 'ChevronDown' : 'ChevronRight'" 
        class="chevron" 
      />
    </component>

    <!-- Дочерние элементы -->
    <transition name="expand">
      <div v-if="children && isExpanded && !isCollapsed" class="children-wrapper">
        <router-link
          v-for="child in children"
          :key="child.path"
          :to="child.path"
          class="sidebar-item child-item"
          :class="{ active: isChildActive(child.path) }"
          @click="handleChildClick"
        >
          <span class="child-label">{{ child.label }}</span>
        </router-link>
      </div>
    </transition>

    <!-- Tooltip для collapsed состояния с дочерними элементами -->
    <div v-if="children && isCollapsed" class="collapsed-tooltip">
      <div class="tooltip-header">{{ label }}</div>
      <router-link
        v-for="child in children"
        :key="child.path"
        :to="child.path"
        class="tooltip-child"
        :class="{ active: isChildActive(child.path) }"
        @click="handleChildClick"
      >
        {{ child.label }}
      </router-link>
    </div>
  </div>
</template>

<script setup>
import UiIcon from '../ui/UiIcon.vue'
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'

const props = defineProps({
  label: String,
  to: String,
  icon: String,
  children: Array,
  isCollapsed: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['clicked']);

const route = useRoute()
const isExpanded = ref(false)

const isActive = computed(() => {
  // Если это обычная ссылка без дочерних элементов
  if (props.to && !props.children) {
    return route.path.startsWith(props.to)
  }
  // Если есть дочерние элементы, родитель не должен быть активным
  return false
})

const isChildActive = (childPath) => {
  return route.path.startsWith(childPath)
}

const handleClick = () => {
  if (props.children) {
    isExpanded.value = !isExpanded.value
  } else {
    emit('clicked')
  }
}

const handleChildClick = () => {
  emit('clicked')
}

// Автоматически раскрываем родительский элемент если активен дочерний
if (props.children && props.children.some(child => route.path.startsWith(child.path))) {
  isExpanded.value = true
}
</script>

<style scoped>
.sidebar-item-wrapper {
  position: relative;
}

.sidebar-item {
  position: relative;
  display: flex;
  align-items: center;
  padding: 12px 16px;
  color: #4a5568;
  text-decoration: none;
  border-radius: 6px;
  transition: background 0.2s, color 0.2s;
  font-size: 14px;
  cursor: pointer;
}

.sidebar-item.has-children {
  cursor: pointer;
}

.sidebar-item .icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  color: #4a5568;
  transition: color 0.2s;
  margin-right: 16px;
}

.sidebar-item .chevron {
  width: 16px;
  height: 16px;
  margin-left: auto;
  color: #4a5568;
  transition: transform 0.2s, color 0.2s;
}

.sidebar-item.is-collapsed .icon {
  margin-right: 0;
}

.sidebar-item.is-collapsed .label {
  position: absolute;
  left: 100%;
  top: 50%;
  transform: translateY(-50%);
  background-color: #ffffff;
  color: #2d3748;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 13px;
  white-space: nowrap;
  margin-left: 12px;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s ease;
  z-index: 100;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.sidebar-item:hover {
  background: #edf2f7;
  color: #2b6cb0;
}

.sidebar-item:hover .icon,
.sidebar-item:hover .chevron {
  color: #2b6cb0;
}

.sidebar-item.is-collapsed:hover .label {
  opacity: 1;
}

.active {
  background: #e6f0fb;
  color: #2b6cb0;
  font-weight: 500;
}

.active .icon,
.active .chevron {
  color: #2b6cb0;
}

/* Дочерние элементы */
.children-wrapper {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.child-item {
  padding: 10px 16px 10px 52px;
  font-size: 13px;
  color: #64748b;
}

.child-item:hover {
  background: #edf2f7;
  color: #2b6cb0;
}

.child-item.active {
  background: #e6f0fb;
  color: #2b6cb0;
  font-weight: 500;
}

.child-label {
  display: block;
}

/* Анимация раскрытия */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}

.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 500px;
}

/* Tooltip для collapsed состояния с дочерними */
.collapsed-tooltip {
  position: absolute;
  left: 100%;
  top: 0;
  background-color: #ffffff;
  border-radius: 4px;
  padding: 8px 0;
  margin-left: 12px;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s ease;
  z-index: 100;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  min-width: 200px;
}

.sidebar-item-wrapper:hover .collapsed-tooltip {
  opacity: 1;
  pointer-events: auto;
}

.tooltip-header {
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 600;
  color: #2d3748;
  border-bottom: 1px solid #e2e8f0;
  margin-bottom: 4px;
}

.tooltip-child {
  display: block;
  padding: 8px 12px;
  font-size: 13px;
  color: #64748b;
  text-decoration: none;
  transition: background 0.2s, color 0.2s;
  white-space: nowrap;
}

.tooltip-child:hover {
  background: #edf2f7;
  color: #2b6cb0;
}

.tooltip-child.active {
  background: #e6f0fb;
  color: #2b6cb0;
  font-weight: 500;
}
</style>