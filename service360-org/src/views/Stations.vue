<template>
  <TableWrapper
    ref="tableWrapperRef"
    title="Раздельные пункты"
    :columns="columns"
    :actions="tableActions"
    :limit="limit"
    :loadFn="loadStation"
    :initial-sort-key="null"
    @row-dblclick="onRowDoubleClick"
  >
  </TableWrapper>

  <ModalAddStation
    v-if="isAddModalOpen"
    @close="closeAddModal"
    @refresh="handleRefresh"
  />

  <ModalEditStation
    v-if="isEditModalOpen"
    :stationData="selectedStation"
    @close="closeEditModal"
    @refresh="handleRefresh"
  />
</template>

<script setup>
import { ref, computed } from 'vue'
import TableWrapper from '@/app/layouts/Table/TableWrapper.vue'
import ModalAddStation from '@/features/sections/components/ModalAddStation.vue'
import ModalEditStation from '@/features/sections/components/ModalEditStation.vue'
import { loadStation } from '@/shared/api/sections/sectionService'

const tableWrapperRef = ref(null)
const isAddModalOpen = ref(false)
const isEditModalOpen = ref(false)
const selectedStation = ref(null)

const openAddModal = () => {
  isAddModalOpen.value = true
}

const closeAddModal = () => {
  isAddModalOpen.value = false
}

const openEditModal = (stationData) => {
  selectedStation.value = stationData
  isEditModalOpen.value = true
}

const closeEditModal = () => {
  isEditModalOpen.value = false
  selectedStation.value = null
}

const handleRefresh = () => {
  tableWrapperRef.value?.refreshTable()
}

const onRowDoubleClick = (row) => {
  openEditModal(row)
}

const tableActions = computed(() => [
  {
    label: 'Добавить раздельный пункт',
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
  { key: 'coords', label: 'Координаты' }
]
</script>
