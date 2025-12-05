<template>
  <tr>
    <th v-for="col in columns" :key="col.key" class="th">
      <div class="header-cell">
        <span>{{ col.label }}</span>
      </div>
    </th>
  </tr>
</template>

<script setup>
const props = defineProps({ 
  columns: Array 
})
</script>

<style scoped>
.th {
  position: sticky;
  top: 0;
  z-index: 20;
  vertical-align: top;
  font-size: 13px;
  color: #718096;
  font-weight: 500;
  padding: 14px 16px;
  background: #f9fafb;
  border-bottom: 1px solid #e2e8f0;
  text-transform: uppercase;
}

.header-cell {
  display: flex;
  align-items: center;
  gap: 4px;
}
</style>