<template>
  <div class="search-box" :class="{ collapsed }">
    <input
      v-if="!collapsed"
      type="text"
      placeholder="Поиск"
      v-model="query"
    />
    <UiIcon name="Search" class="search-icon" />
  </div>
</template>


<script setup>
import UiIcon from '../ui/UiIcon.vue'
import { ref } from 'vue'

defineProps({
  collapsed: Boolean
})

const query = ref('')
</script>

<style scoped>
.search-box {
  display: flex;
  align-items: center;
  background: #f8fafc;
  border-radius: 8px;
  padding: 4px 8px;
  height: 31px;
  width: 320px;
  transition: width 0.3s ease;
  border: 1px solid #e2e8f0;
}

.search-box.collapsed {
  width: 36px;
  justify-content: center;
  padding: 0;
}

.search-box input {
  font-family: 'SF Pro Text';
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  flex: 1;
}

.search-icon {
  width: 20px;
  height: 20px;
  color: #4a5568;
  flex-shrink: 0;
  margin-left: auto; 
}

</style>
