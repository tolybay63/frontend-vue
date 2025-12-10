<template>
  <TableWrapper
    ref="tableWrapperRef"
    title="Материалы"
    :columns="columns"
    :actions="tableActions"
    :limit="limit"
    :loadFn="loadMaterials"
    @row-dblclick="handleRowDoubleClick"
  >
  </TableWrapper>

  <ModalAddMaterial
    v-if="isAddModalOpen"
    @close="closeAddModal"
    @refresh="refreshTable"
  />

  <ModalEditMaterial
    v-if="isEditModalOpen"
    :materialData="selectedMaterial"
    @close="closeEditModal"
    @refresh="refreshTable"
  />
</template>

<script setup>
import { ref } from 'vue'
import TableWrapper from '@/app/layouts/Table/TableWrapper.vue'
import ModalAddMaterial from '@/features/resources/components/ModalAddMaterial.vue'
import ModalEditMaterial from '@/features/resources/components/ModalEditMaterial.vue'
import { loadMaterials } from '@/shared/api/resources/resourceService'

const tableWrapperRef = ref(null)
const isAddModalOpen = ref(false)
const isEditModalOpen = ref(false)
const selectedMaterial = ref(null)

const openAddModal = () => {
  isAddModalOpen.value = true
}

const closeAddModal = () => {
  isAddModalOpen.value = false
}

const openEditModal = (materialData) => {
  selectedMaterial.value = materialData
  isEditModalOpen.value = true
}

const closeEditModal = () => {
  isEditModalOpen.value = false
  selectedMaterial.value = null
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
    label: 'Добавить материал',
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
  { key: 'fullName', label: 'Наименование' },
  { key: 'nameMeasure', label: 'Единица измерения' },
]
</script>
