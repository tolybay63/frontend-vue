<template>
  <tr 
    class="data-row" 
    :class="getRowClassFn(row)"
    @dblclick="$emit('dblclick', row)"
  >
    <td
      v-for="(col, i) in columns"
      :key="col.key"
      class="cell"
      :class="{
        'date-overdue': isFactDateOverdue(col.key),
        'date-ontime': isFactDateOnTime(col.key),
        // ДОБАВЛЕНЫ: 'dateInfo', 'volumeInfo'
        'multiline-cell': ['generalInfo', 'taskInfo', 'materials', 'services', 'tools', 'equipment', 'performers', 'dateInfo', 'volumeInfo'].includes(col.key)
      }"
    >
      <template v-if="col.component">
        <component :is="col.component" v-bind="row[col.key]" :row="row" />
      </template>
      <template v-else-if="i === 0">
        <span class="index-icon-wrap">
          <span class="row-index">{{ fullIndex }}</span>
          <span
            v-if="hasChildren"
            @click.stop="toggleExpand"
            class="expand-icon"
          >
            <UiIcon :name="isExpanded ? 'ChevronDown' : 'ChevronRight'" />
          </span>
        </span>
        <span class="cell-content" v-if="row[col.key] != fullIndex">
          {{ formatValue(row[col.key]) }}
        </span>
      </template>
      <template v-else-if="['generalInfo', 'dateRange', 'taskInfo', 'materials', 'services', 'tools', 'equipment', 'performers', 'dateInfo', 'volumeInfo'].includes(col.key)">
        <div 
          class="cell-content preserve-newlines" 
          v-html="formatValue(row[col.key])"
        ></div>
      </template>
      <template v-else>
        <span class="cell-content">{{ formatValue(row[col.key]) }}</span>
      </template>
    </td>
  </tr>

  <template v-if="isExpanded && hasChildren">
    <TableRow
      v-for="(child, i) in children"
      :key="child.id"
      :row="child"
      :columns="columns"
      :childrenMap="childrenMap"
      :expandedRows="expandedRows"
      :toggleRowExpand="toggleRowExpand"
      :parentIndex="`${fullIndex}.${i + 1}`"
      :getRowClassFn="getRowClassFn"
      @dblclick="$emit('dblclick', $event)"
    />
  </template>
</template>

<script setup>
import { computed } from 'vue';
import UiIcon from '@/shared/ui/UiIcon.vue';
import TableRow from './TableRow.vue';

const props = defineProps({
  row: Object,
  columns: Array,
  expandedRows: Array,
  toggleRowExpand: Function,
  childrenMap: Object,
  parentIndex: {
    type: String,
    default: '',
  },
  getRowClassFn: {
    type: Function,
    default: () => ({}),
  }
});

const children = computed(() => props.childrenMap?.[props.row.id] || []);
const hasChildren = computed(() => children.value.length > 0);
const isExpanded = computed(() => props.expandedRows.includes(props.row.id));

const emits = defineEmits(['dblclick']);

const toggleExpand = () => {
  props.toggleRowExpand(props.row.id);
};

const fullIndex = computed(() => {
  if (props.parentIndex) return props.parentIndex;
  return props.row.index?.toString() || '';
});

const formatValue = (value) => {
  if (typeof value !== 'string') {
    return value;
  }

  // Форматирование даты YYYY-MM-DD -> DD.MM.YYYY
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-');
    return `${day}.${month}.${year}`;
  }

  // Форматирование времени HH:mm:ss.sss -> HH:mm:ss
  if (/^\d{2}:\d{2}:\d{2}\.\d+$/.test(value)) {
    return value.substring(0, 8);
  }

  return value;
};

const isFactDateOverdue = (key) => {
  if (key !== 'factDate') return false;
  
  const factDateStr = props.row.factDate;
  const planDateStr = props.row.planDate;
  
  if (!factDateStr || !planDateStr) return false;

  const factDate = new Date(factDateStr + 'T00:00:00Z');
  const planDate = new Date(planDateStr + 'T00:00:00Z');

  return factDate > planDate;
};

const isFactDateOnTime = (key) => {
  if (key !== 'factDate') return false;
  
  const factDateStr = props.row.factDate;
  const planDateStr = props.row.planDate;
  
  if (!factDateStr) return false;
  if (!planDateStr) return true;

  const factDate = new Date(factDateStr + 'T00:00:00Z');
  const planDate = new Date(planDateStr + 'T00:00:00Z');
  
  return factDate <= planDate;
};
</script>

<style scoped>
.index-icon-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.data-row {
  transition: background 0.2s;
  cursor: pointer;
}
.data-row:hover {
  background-color: #f9fafb;
}
.cell {
  padding: 14px 16px;
  font-size: 14px;
  color: #1a202c;
  vertical-align: top;
}

.index-icon-wrap {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.row-index {
  font-weight: 500;
}
.expand-icon {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
}

.cell.date-overdue {
  color: #e53e3e;
}

.cell.date-ontime {
  color: #38a169;
}

.data-row.row-has-defects {
  background-color: #FFF5F5;
}
.data-row.row-has-defects:hover {
  background-color: #ffe6e6;
}

.data-row.row-has-deviation {
  background-color: #FFF5F5;
}
.data-row.row-has-deviation:hover {
  background-color: #ffe6e6;
}

.cell-content.preserve-newlines {
  white-space: pre-line;
  line-height: 1.5; /* Немного уменьшено для более компактного вида */
}
</style>