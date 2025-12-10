<template>
  <TableWrapper
    ref="tableWrapperRef"
    title="Перегоны"
    :columns="columns"
    :actions="tableActions"
    :limit="limit"
    :loadFn="loadStage"
    @row-dblclick="onRowDoubleClick"
  >
  </TableWrapper>
</template>

<script setup>
import { ref, computed } from 'vue'
import TableWrapper from '@/app/layouts/Table/TableWrapper.vue'
import { loadStage } from '@/shared/api/sections/sectionService'

const tableWrapperRef = ref(null)

const onRowDoubleClick = (row) => {
  // Пока пустая функция, модалки добавим позже
}

const tableActions = computed(() => [
  {
    label: 'Добавить перегон',
    icon: 'Plus',
    onClick: () => console.log('Добавление перегона...'),
    show: true,
  },
  {
    label: 'Экспорт',
    icon: 'Download',
    onClick: () => console.log('Экспортирование...'),
    show: true,
  },
].filter(action => action.show));

const limit = 10

const columns = [
  { key: 'index', label: '№' },
  { key: 'name', label: 'Наименование' },
  { key: 'sections', label: 'Участки ЖД пути' },
  { key: 'coords', label: 'Координаты' },
  { key: 'StageLength', label: 'Протяженность' }
]
</script>
