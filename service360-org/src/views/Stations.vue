<template>
  <TableWrapper
    ref="tableWrapperRef"
    title="Раздельные пункты"
    :columns="columns"
    :actions="tableActions"
    :limit="limit"
    :loadFn="loadStation"
    @row-dblclick="onRowDoubleClick"
  >
  </TableWrapper>
</template>

<script setup>
import { ref, computed } from 'vue'
import TableWrapper from '@/app/layouts/Table/TableWrapper.vue'
import { loadStation } from '@/shared/api/sections/sectionService'

const tableWrapperRef = ref(null)

const onRowDoubleClick = (row) => {
  // Пока пустая функция, модалки добавим позже
}

const tableActions = computed(() => [
  {
    label: 'Добавить раздельный пункт',
    icon: 'Plus',
    onClick: () => console.log('Добавление раздельного пункта...'),
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
  { key: 'coords', label: 'Координаты' }
]
</script>
