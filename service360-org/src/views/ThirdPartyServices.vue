<template>
  <TableWrapper
    ref="tableWrapperRef"
    title="Услуги сторонних организаций"
    :columns="columns"
    :actions="tableActions"
    :limit="limit"
    :loadFn="loadTpServices"
    @row-dblclick="handleRowDoubleClick"
  >
  </TableWrapper>

  <ModalAddTpService
    v-if="isAddModalOpen"
    @close="closeAddModal"
    @refresh="refreshTable"
  />

  <ModalEditTpService
    v-if="isEditModalOpen"
    :serviceData="selectedService"
    @close="closeEditModal"
    @refresh="refreshTable"
  />
</template>

<script setup>
import { ref } from 'vue'
import TableWrapper from '@/app/layouts/Table/TableWrapper.vue'
import ModalAddTpService from '@/features/resources/components/ModalAddTpService.vue'
import ModalEditTpService from '@/features/resources/components/ModalEditTpService.vue'
import { loadTpServices } from '@/shared/api/resources/resourceService'

const tableWrapperRef = ref(null)
const isAddModalOpen = ref(false)
const isEditModalOpen = ref(false)
const selectedService = ref(null)

const openAddModal = () => {
  isAddModalOpen.value = true
}

const closeAddModal = () => {
  isAddModalOpen.value = false
}

const openEditModal = (serviceData) => {
  selectedService.value = serviceData
  isEditModalOpen.value = true
}

const closeEditModal = () => {
  isEditModalOpen.value = false
  selectedService.value = null
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
    label: 'Добавить услугу',
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
  { key: 'name', label: 'Полное наименование' },
  { key: 'nameMeasure', label: 'Ед. измерения' },
]
</script>
