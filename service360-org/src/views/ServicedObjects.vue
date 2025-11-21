<template>
  <TableWrapper
    ref="tableWrapperRef"
    title="Обслуживаемые объекты"
    :columns="columns"
    :actions="tableActions"
    :limit="limit"
    :loadFn="loadObjectServed"
    @row-dblclick="onRowDoubleClick"
  >
    <template #modals="{ selectedRow, showEditModal, closeModals }">
      <ModalUpdateObject
        v-if="showEditModal"
        :rowData="selectedRow"
        @close="closeModals"        
        @save="() => handleTableUpdate(closeModals)"
        @deleted="() => handleTableUpdate(closeModals)"
      />
    </template>
  </TableWrapper>

  <ModalAddObject
    v-if="isAddObjectModalOpen"
    @close="closeModal"
    @update-table="() => handleTableUpdate(closeModal)"
  />
</template>

<script setup>
import { ref, computed } from 'vue'
import { usePermissions } from '@/shared/api/auth/usePermissions';
import TableWrapper from '@/app/layouts/Table/TableWrapper.vue'
import ModalAddObject from '@/features/objects/components/ModalAddObject.vue'
import ModalUpdateObject from '@/features/objects/components/ModalUpdateObject.vue'
import { loadObjectServed } from '@/shared/api/objects/objectService'

const tableWrapperRef = ref(null)
const isAddObjectModalOpen = ref(false)

const { hasPermission } = usePermissions();
const canInsert = computed(() => hasPermission('obj:ins'));

const closeModal = () => {
  isAddObjectModalOpen.value = false
}

const handleTableUpdate = (closeFn) => {
  tableWrapperRef.value?.refreshTable()
  closeFn()
}

const onRowDoubleClick = (row) => {
}

const tableActions = computed(() => [
  {
    label: 'Добавить объект',
    icon: 'Plus',
    onClick: () => {
      isAddObjectModalOpen.value = true
    },
    show: canInsert.value,
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
  { key: 'type', label: 'Вид объекта' },
  { key: 'name', label: 'Наименование объекта' },
  { key: 'coords', label: 'Координаты' },
  { key: 'feature', label: 'Характеристика' },
  { key: 'location', label: 'Сведения о месте' },
  { key: 'replacement', label: 'Периодичность замены (год)' },
  { key: 'number', label: 'Номер объекта' },
  { key: 'installDate', label: 'Дата установки' },
  { key: 'createDate', label: 'Дата создания' },
  { key: 'updateDate', label: 'Дата обновления' },
  { key: 'description', label: 'Описание' }
]
</script>
