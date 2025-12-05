<template>
  <TableWrapper
    ref="tableWrapperRef"
    title="Техника"
    :columns="columns"
    :actions="tableActions"
    :limit="limit"
    :loadFn="loadEquipment"
    @row-dblclick="handleRowDoubleClick"
  >
  </TableWrapper>

  <ModalAddEquipment
    v-if="isAddModalOpen"
    @close="closeAddModal"
    @refresh="refreshTable"
  />

  <ModalEditEquipment
    v-if="isEditModalOpen"
    :equipmentData="selectedEquipment"
    @close="closeEditModal"
    @refresh="refreshTable"
  />
</template>

<script setup>
import { ref } from 'vue'
import TableWrapper from '@/app/layouts/Table/TableWrapper.vue'
import ModalAddEquipment from '@/features/resources/components/ModalAddEquipment.vue'
import ModalEditEquipment from '@/features/resources/components/ModalEditEquipment.vue'
import { loadEquipment } from '@/shared/api/resources/resourceService'

const tableWrapperRef = ref(null)
const isAddModalOpen = ref(false)
const isEditModalOpen = ref(false)
const selectedEquipment = ref(null)

const openAddModal = () => {
  isAddModalOpen.value = true
}

const closeAddModal = () => {
  isAddModalOpen.value = false
}

const openEditModal = (equipmentData) => {
  selectedEquipment.value = equipmentData
  isEditModalOpen.value = true
}

const closeEditModal = () => {
  isEditModalOpen.value = false
  selectedEquipment.value = null
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
    label: 'Добавить технику',
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
  { key: 'nameTypEquipment', label: 'Тип техники' },
  { key: 'nameLocationClsSection', label: 'Участок' },
]
</script>
