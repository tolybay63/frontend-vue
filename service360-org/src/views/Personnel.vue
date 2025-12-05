<template>
  <TableWrapper
    ref="tableWrapperRef"
    title="Сотрудники"
    :columns="columns"
    :actions="tableActions"
    :limit="limit"
    :loadFn="loadPersonnel"
    @row-dblclick="handleRowDoubleClick"
  >
  </TableWrapper>

  <ModalAddPersonnel
    v-if="isAddModalOpen"
    @close="closeAddModal"
    @refresh="refreshTable"
  />

  <ModalEditPersonnel
    v-if="isEditModalOpen"
    :personnelData="selectedPersonnel"
    @close="closeEditModal"
    @refresh="refreshTable"
    @deleted="handleDeleted"
  />
</template>

<script setup>
import { ref, computed } from 'vue'
import { usePermissions } from '@/shared/api/auth/usePermissions'
import TableWrapper from '@/app/layouts/Table/TableWrapper.vue'
import ModalAddPersonnel from '@/features/organization/components/ModalAddPersonnel.vue'
import ModalEditPersonnel from '@/features/organization/components/ModalEditPersonnel.vue'
import { loadPersonnel } from '@/shared/api/organization/personnelService'

const { hasPermission } = usePermissions()
const canInsert = computed(() => hasPermission('team:ins'))

const tableWrapperRef = ref(null)
const isAddModalOpen = ref(false)
const isEditModalOpen = ref(false)
const selectedPersonnel = ref(null)

const openAddModal = () => {
  isAddModalOpen.value = true
}

const closeAddModal = () => {
  isAddModalOpen.value = false
}

const openEditModal = (personnelData) => {
  selectedPersonnel.value = personnelData
  isEditModalOpen.value = true
}

const closeEditModal = () => {
  isEditModalOpen.value = false
  selectedPersonnel.value = null
}

const handleRowDoubleClick = (rowData) => {
  openEditModal(rowData)
  console.log('Double click:', rowData)
}

const refreshTable = () => {
  if (tableWrapperRef.value && tableWrapperRef.value.refreshTable) {
    tableWrapperRef.value.refreshTable()
  }
}

const handleDeleted = () => {
  refreshTable()
  closeEditModal()
}

const tableActions = computed(() => [
  {
    label: 'Добавить сотрудника',
    icon: 'Plus',
    onClick: openAddModal,
    show: canInsert.value,
  },
  {
    label: 'Экспорт',
    icon: 'Download',
    onClick: () => console.log('Экспортирование...'),
    show: true,
  },
].filter(action => action.show))

const limit = 10

const columns = [
  { key: 'index', label: '№' },
  { key: 'tabNumber', label: 'Табельный номер' },
  { key: 'fullName', label: 'ФИО' },
  { key: 'position', label: 'Должность' },
  { key: 'location', label: 'Участок' },
]
</script>
