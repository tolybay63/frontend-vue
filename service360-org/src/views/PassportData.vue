<template>
  <div class="passport-data-page">
    <div class="header">
      <BackButton @click="goBack" />
      <h1>Паспортные данные: {{ objectName }}</h1>
    </div>

    <div class="table-section">
      <div class="table-header">
        <h2>Список паспортных данных</h2>
        <div class="table-actions">
          <button
            v-for="action in tableActions"
            :key="action.label"
            class="action-btn"
            @click="action.onClick"
          >
            <UiIcon :name="action.icon" />
            {{ action.label }}
          </button>
        </div>
      </div>
      <BaseTable
        :columns="columns"
        :rows="tableData"
        :loading="isLoading"
        :expanded-rows="[]"
        :toggle-row-expand="() => {}"
        :children-map="{}"
        :active-filters="{}"
        :showFilters="false"
        @row-dblclick="handleRowDoubleClick"
      />
    </div>

    <ModalEditPassportData
      v-if="isEditModalVisible"
      :rowData="selectedRowData"
      @close="closeEditModal"
      @save="handleSaveEdit"
      @deleted="handleDeleted"
    />

    <ModalPassportData
      v-if="isAddModalVisible"
      :rowData="{ id: objectId }"
      @close="closeAddModal"
      @save="handleSaveAdd"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useNotificationStore } from '@/app/stores/notificationStore'
import BaseTable from '@/app/layouts/Table/BaseTable.vue'
import BackButton from '@/shared/ui/BackButton.vue'
import UiIcon from '@/shared/ui/UiIcon.vue'
import { loadComplexObjectPassport } from '@/shared/api/objects/objectService'
import ModalEditPassportData from '@/features/objects/components/ModalEditPassportData.vue'
import ModalPassportData from '@/features/objects/components/ModalPassportData.vue'
import { usePermissions } from '@/shared/api/auth/usePermissions'

const { hasPermission } = usePermissions()

const router = useRouter()
const route = useRoute()
const notificationStore = useNotificationStore()

const isLoading = ref(false)
const tableData = ref([])
const objectName = ref('')
const isEditModalVisible = ref(false)
const isAddModalVisible = ref(false)
const selectedRowData = ref(null)

const objectId = computed(() => route.params.id)

const columns = [
  { key: 'nameComponent', label: 'Компонент' },
  { key: 'namePassportComponentParams', label: 'Параметр' },
  { key: 'signs', label: 'Признаки' },
  { key: 'namePassportMeasure', label: 'Единица измерения' },
  { key: 'PassportVal', label: 'Значение' },
]

const mapRecordToTableRow = (record) => ({
  id: record.id,
  idPassportComplex: record.idPassportComplex,
  PassportComplex: record.PassportComplex,
  idPassportComponentParams: record.idPassportComponentParams,
  relobjPassportComponentParams: record.relobjPassportComponentParams,
  pvPassportComponentParams: record.pvPassportComponentParams,
  namePassportComponentParams: record.namePassportComponentParams || '',
  objComponent: record.objComponent,
  nameComponent: record.nameComponent || '',
  idPassportMeasure: record.idPassportMeasure,
  meaPassportMeasure: record.meaPassportMeasure,
  pvPassportMeasure: record.pvPassportMeasure,
  namePassportMeasure: record.namePassportMeasure || '',
  idPassportVal: record.idPassportVal,
  PassportVal: record.PassportVal,
  objPassportSignMulti: record.objPassportSignMulti || [],
  signs: record.objPassportSignMulti?.map(s => s.name).join(', ') || ''
})

const goBack = () => {
  router.push({ name: 'ServicedObjects' })
}

const loadData = async () => {
  if (!objectId.value) {
    notificationStore.showNotification('ID объекта не указан', 'error')
    return
  }

  isLoading.value = true
  try {
    const records = await loadComplexObjectPassport(objectId.value)
    tableData.value = records.map(mapRecordToTableRow)

    if (route.query.name) {
      objectName.value = route.query.name
    }
  } catch (error) {
    notificationStore.showNotification('Ошибка при загрузке паспортных данных', 'error')
    tableData.value = []
  } finally {
    isLoading.value = false
  }
}

const handleRowDoubleClick = (row) => {
  selectedRowData.value = { ...row, objectId: objectId.value }
  isEditModalVisible.value = true
}

const closeEditModal = () => {
  isEditModalVisible.value = false
  selectedRowData.value = null
}

const handleSaveEdit = () => {
  closeEditModal()
  loadData()
}

const openAddModal = () => {
  isAddModalVisible.value = true
}

const closeAddModal = () => {
  isAddModalVisible.value = false
}

const handleSaveAdd = () => {
  closeAddModal()
  loadData()
}

const handleDeleted = () => {
  closeEditModal()
  loadData()
}

const tableActions = computed(() => [
  {
    label: 'Добавить данные',
    icon: 'Plus',
    onClick: openAddModal,
    hidden: !hasPermission('obj:ins'),
  },
].filter(action => !action.hidden))

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.passport-data-page {
  padding: 24px;
  background: #f7fafc;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
  font-family: system-ui;
}

.header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  flex-shrink: 0;
}

.header h1 {
  font-size: 20px;
  font-weight: 600;
  color: #1a202c;
}

.table-section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  min-height: 0;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 24px;
  flex-shrink: 0;
}

.table-header h2 {
  font-size: 18px;
  font-weight: 600;
  color: #1a202c;
}

.table-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: transparent;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  color: #1a202c;
  cursor: pointer;
  transition: background 0.2s;
}

.action-btn:hover {
  background: #edf2f7;
}

@media (max-width: 1024px) {
  .passport-data-page {
    padding: 16px;
  }

  .header h1 {
    font-size: 18px;
  }

  .table-section {
    padding: 20px;
  }

  .table-header h2 {
    font-size: 16px;
  }
}

@media (max-width: 640px) {
  .passport-data-page {
    padding: 12px;
  }

  .header {
    gap: 12px;
    margin-bottom: 16px;
  }

  .header h1 {
    font-size: 16px;
  }

  .table-section {
    padding: 16px;
    overflow-x: auto;
  }

  .table-header {
    margin-bottom: 16px;
  }

  .table-header h2 {
    font-size: 15px;
  }
}
</style>
