<template>
  <TableWrapper
    ref="tableWrapperRef"
    title="Участки"
    :columns="columns"
    :actions="tableActions"
    :limit="limit"
    :loadFn="loadSection"
    @row-dblclick="onRowDoubleClick"
  >
  </TableWrapper>

  <ModalAddSection
    v-if="isAddModalOpen"
    @close="closeAddModal"
    @refresh="handleRefresh"
  />
</template>

<script setup>
import { ref, computed } from 'vue'
import TableWrapper from '@/app/layouts/Table/TableWrapper.vue'
import ModalAddSection from '@/features/sections/components/ModalAddSection.vue'
import { loadSection } from '@/shared/api/sections/sectionService'

const tableWrapperRef = ref(null)
const isAddModalOpen = ref(false)

const openAddModal = () => {
  isAddModalOpen.value = true
}

const closeAddModal = () => {
  isAddModalOpen.value = false
}

const handleRefresh = () => {
  tableWrapperRef.value?.refreshTable()
}

const onRowDoubleClick = (row) => {
  // Пока пустая функция, модалки редактирования добавим позже
}

const tableActions = computed(() => [
  {
    label: 'Добавить участок',
    icon: 'Plus',
    onClick: openAddModal,
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
  { key: 'nameClient', label: 'Клиент' },
  { key: 'coords', label: 'Координаты' },
  { key: 'StageLength', label: 'Протяженность' }
]
</script>
