<template>
  <TableWrapper
    ref="tableWrapperRef"
    title="Участки"
    :columns="columns"
    :actions="tableActions"
    :limit="limit"
    :loadFn="loadSection"
    :initial-sort-key="null"
    @row-dblclick="onRowDoubleClick"
  >
  </TableWrapper>

  <ModalAddSection
    v-if="isAddModalOpen"
    @close="closeAddModal"
    @refresh="handleRefresh"
  />

  <ModalEditSection
    v-if="isEditModalOpen"
    :sectionData="selectedSection"
    @close="closeEditModal"
    @refresh="handleRefresh"
  />
</template>

<script setup>
import { ref, computed } from 'vue'
import TableWrapper from '@/app/layouts/Table/TableWrapper.vue'
import ModalAddSection from '@/features/sections/components/ModalAddSection.vue'
import ModalEditSection from '@/features/sections/components/ModalEditSection.vue'
import { loadSection } from '@/shared/api/sections/sectionService'

const tableWrapperRef = ref(null)
const isAddModalOpen = ref(false)
const isEditModalOpen = ref(false)
const selectedSection = ref(null)

const openAddModal = () => {
  isAddModalOpen.value = true
}

const closeAddModal = () => {
  isAddModalOpen.value = false
}

const openEditModal = (sectionData) => {
  selectedSection.value = sectionData
  isEditModalOpen.value = true
}

const closeEditModal = () => {
  isEditModalOpen.value = false
  selectedSection.value = null
}

const handleRefresh = () => {
  tableWrapperRef.value?.refreshTable()
}

const onRowDoubleClick = (row) => {
  openEditModal(row)
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
