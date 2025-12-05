<template>
  <div class="table-container">
    <table class="styled-table" :class="tableWidthClass">
      <thead>
        <tr>
          <th 
            v-for="col in columns" 
            :key="col.key" 
            class="header-cell-container"
            :style="{ cursor: 'default' }"
            >
            <div class="header-cell">
              <span>{{ col.label }}</span>
              <div class="sort-filter-controls">
                <button 
                  v-if="showFilters"
                  @click.stop="$emit('toggle-filter', col.key)" 
                  :class="['filter-button', { active: activeFilters[col.key] }]"
                  title="Фильтр"
                >
                  <UiIcon name="Funnel" class="icon-muted" />
                </button>
              </div>
            </div>
            <slot
              name="filter"
              :column="col"
            />
          </th>
        </tr>
      </thead>
      <tbody>
        <TableRow
          v-for="row in rows"
          :key="row.id || row.index"
          :row="row"
          :columns="columns"
          :expandedRows="expandedRows"
          :toggleRowExpand="toggleRowExpand"
          :childrenMap="childrenMap"
          :getRowClassFn="getRowClassFn"
          @dblclick="$emit('row-dblclick', $event)"
        />
        <tr v-if="!rows.length && !loading">
          <td :colspan="columns.length" class="empty">Нет данных</td>
        </tr>
        <tr v-if="loading">
          <td :colspan="columns.length" class="loading">Загрузка...</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import TableRow from './TableRow.vue'
import UiIcon from '@/shared/ui/UiIcon.vue'

const props = defineProps({
  columns: Array,
  rows: Array,
  loading: Boolean,
  expandedRows: Array,
  toggleRowExpand: Function,
  childrenMap: Object,
  activeFilters: Object,
  showFilters: { 
    type: Boolean,
    default: true
  },
  sortKey: String,
  sortDirection: String,
  // НОВЫЙ ПРОПС
  getRowClassFn: {
    type: Function,
    default: () => ({}),
  }
})

const emit = defineEmits(['row-dblclick', 'toggle-filter', 'sort'])

// Уменьшаем условие для wide-table и дефолтное значение
const tableWidthClass = computed(() => {
  return props.columns && props.columns.length >= 5 ? 'wide-table' : 'default-table';
});
</script>

<style scoped>
.table-container {
  overflow-x: auto;
  overflow-y: auto;
  /* Reduced max-height slightly for better fit on various screens */
  max-height: 65vh; 
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.styled-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  color: #2d3748;
}

/* ИЗМЕНЕНИЕ: Сильно уменьшена минимальная ширина */
.styled-table.default-table {
  min-width: 900px; 
}

/* ИЗМЕНЕНИЕ: Сильно уменьшена минимальная ширина */
.styled-table.wide-table {
  min-width: 1500px;
}

th, td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid #edf2f7;
}

.header-cell-container {
  position: sticky;
  top: 0;
  background: #f9fafb;
  font-size: 13px;
  color: #718096;
  font-weight: 500;
  padding: 14px 16px;
  border-bottom: 1px solid #e2e8f0;
  text-transform: uppercase;
  z-index: 20;
  cursor: default; 
}

.header-cell {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px; 
}

.sort-filter-controls {
  display: flex;
  align-items: center;
  gap: 8px; 
}

.sort-icon {
  width: 12px;
  height: 12px;
  color: #718096;
}

.filter-button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}

.filter-button:hover {
  background-color: #edf2f7;
}

.filter-button.active {
  background-color: #3182ce;
}

.filter-button.active .icon-muted {
  color: #fff;
}

.icon-muted {
  color: #a0aec0;
  width: 16px;
  height: 16px;
  transition: color 0.2s;
}

.filter-button :deep(.icon) {
  margin-right: 0;
}

.empty, .loading {
  text-align: center;
  padding: 20px 0;
  color: #718096;
}

.styled-table :deep(.label-strong) {
  font-weight: 600;
  color: #374151;
}
</style>