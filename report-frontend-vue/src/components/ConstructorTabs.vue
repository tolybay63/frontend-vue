<template>
  <nav class="constructor-tabs">
    <RouterLink
      to="/templates"
      class="constructor-tab"
      exact-active-class="is-active"
    >
      Представления
    </RouterLink>
    <RouterLink
      to="/data-sources"
      class="constructor-tab"
      exact-active-class="is-active"
    >
      Источники данных
    </RouterLink>
    <RouterLink
      to="/data-configurations"
      class="constructor-tab"
      exact-active-class="is-active"
    >
      Конфигурации данных
    </RouterLink>
  </nav>
</template>

<script setup>
import { RouterLink } from 'vue-router'
</script>

<style scoped>
.constructor-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.constructor-tab {
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid #e5e7eb;
  color: #1f2937;
  text-decoration: none;
  font-size: 13px;
  background: #fff;
  transition: border-color 0.2s ease, background 0.2s ease;
}
.constructor-tab:hover {
  border-color: #bfdbfe;
  background: #eff6ff;
}
.constructor-tab.is-active {
  border-color: #93c5fd;
  background: #dbeafe;
  color: #1d4ed8;
}
</style>
