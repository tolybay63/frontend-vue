<template>
  <TableWrapper
    ref="tableWrapperRef"
    title="Инструменты"
    :columns="columns"
    :actions="tableActions"
    :limit="limit"
    :loadFn="loadTools"
    @row-dblclick="handleRowDoubleClick"
  >
  </TableWrapper>

  <ModalAddTool
    v-if="isAddModalOpen"
    @close="closeAddModal"
    @refresh="refreshTable"
  />

  <ModalEditTool
    v-if="isEditModalOpen"
    :toolData="selectedTool"
    @close="closeEditModal"
    @refresh="refreshTable"
  />
</template>

<script setup>
import { ref } from 'vue'
import TableWrapper from '@/app/layouts/Table/TableWrapper.vue'
import ModalAddTool from '@/features/resources/components/ModalAddTool.vue'
import ModalEditTool from '@/features/resources/components/ModalEditTool.vue'
import { loadTools } from '@/shared/api/resources/resourceService'

const tableWrapperRef = ref(null)
const isAddModalOpen = ref(false)
const isEditModalOpen = ref(false)
const selectedTool = ref(null)

const openAddModal = () => {
  isAddModalOpen.value = true
}

const closeAddModal = () => {
  isAddModalOpen.value = false
}

const openEditModal = (toolData) => {
  selectedTool.value = toolData
  isEditModalOpen.value = true
}

const closeEditModal = () => {
  isEditModalOpen.value = false
  selectedTool.value = null
}

const handleRowDoubleClick = (rowData) => {
  openEditModal(rowData)
}

const refreshTable = () => {
  if (tableWrapperRef.value && tableWrapperRef.value.refreshTable) {
    tableWrapperRef.value.refreshTable()
  }
}

const tableActions = [
  {
    label: 'Добавить инструмент',
    icon: 'Plus',
    onClick: openAddModal,
  },
  {
    label: 'Экспорт',
    icon: 'Download',
    onClick: () => console.log('Экспортирование...'),
  },
];

const limit = 10

const columns = [
  { key: 'index', label: '№' },
  { key: 'number', label: 'Инвентарный номер' },
  { key: 'name', label: 'Наименование' },
  { key: 'nameTypTool', label: 'Тип инструмента' },
  { key: 'nameLocationClsSection', label: 'Участок' },
]
</script>
