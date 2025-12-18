<template>
  <TableWrapper
    ref="tableWrapperRef"
    title="Перегоны"
    :columns="columns"
    :actions="tableActions"
    :limit="limit"
    :loadFn="loadStage"
    :initial-sort-key="null"
    @row-dblclick="onRowDoubleClick"
  >
  </TableWrapper>

  <ModalAddStage
    v-if="isAddModalOpen"
    @close="closeAddModal"
    @refresh="handleRefresh"
  />

  <ModalEditStage
    v-if="isEditModalOpen"
    :stageData="selectedStage"
    @close="closeEditModal"
    @refresh="handleRefresh"
  />
</template>

<script setup>
import { ref, computed } from 'vue'
import TableWrapper from '@/app/layouts/Table/TableWrapper.vue'
import ModalAddStage from '@/features/sections/components/ModalAddStage.vue'
import ModalEditStage from '@/features/sections/components/ModalEditStage.vue'
import { loadStage } from '@/shared/api/sections/sectionService'

const tableWrapperRef = ref(null)
const isAddModalOpen = ref(false)
const isEditModalOpen = ref(false)
const selectedStage = ref(null)

const openAddModal = () => {
  isAddModalOpen.value = true
}

const closeAddModal = () => {
  isAddModalOpen.value = false
}

const openEditModal = (stageData) => {
  selectedStage.value = stageData
  isEditModalOpen.value = true
}

const closeEditModal = () => {
  isEditModalOpen.value = false
  selectedStage.value = null
}

const handleRefresh = () => {
  tableWrapperRef.value?.refreshTable()
}

const onRowDoubleClick = (row) => {
  openEditModal(row)
}

const tableActions = computed(() => [
  {
    label: 'Добавить перегон',
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
  { key: 'sections', label: 'Участки ЖД пути' },
  { key: 'coords', label: 'Координаты' },
  { key: 'StageLength', label: 'Протяженность' }
]
</script>
