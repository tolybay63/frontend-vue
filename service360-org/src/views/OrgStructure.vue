<template>
  <div class="org-structure-container">
    <div class="org-structure-header">
      <h2 class="org-structure-title" :class="{ 'mobile-title': isMobile }">{{ title }}</h2>
      <TableActions :actions="tableActions" :isMobile="isMobile" />
    </div>

    <div class="org-structure-content">
      <OrgStructureTree
        v-if="organizationData.length > 0"
        :data="organizationData"
        :childrenMap="childrenMap"
        :expandedRows="expandedRows"
        @toggleExpand="toggleRowExpand"
        @row-dblclick="handleRowDoubleClick"
      />
    </div>

    <ModalOrgStructure v-if="isCreateModalOpen" @close="closeCreateModal" @update-table="fetchData" />
    <ModalEditOrgStructure
      v-if="isEditModalOpen"
      :locationData="selectedLocation"
      @close="closeEditModal"
      @update-table="fetchData"
      @deleted="handleDeleted"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { usePermissions } from '@/shared/api/auth/usePermissions'
import TableActions from '@/app/layouts/Table/TableActions.vue'
import ModalOrgStructure from '@/features/org-structure/components/ModalOrgStructure.vue'
import ModalEditOrgStructure from '@/features/org-structure/components/ModalEditOrgStructure.vue'
import OrgStructureTree from '@/features/org-structure/components/OrgStructureTree.vue'
import { loadLocation } from '@/shared/api/locations/locationService'

const title = 'Организационная структура'
const organizationData = ref([])
const expandedRows = ref([])
const childrenMap = ref({})
const isCreateModalOpen = ref(false)
const isEditModalOpen = ref(false)
const selectedLocation = ref(null)

const isMobile = ref(window.innerWidth <= 768)
const updateIsMobile = () => {
  isMobile.value = window.innerWidth <= 768
}

onMounted(() => window.addEventListener('resize', updateIsMobile))
onUnmounted(() => window.removeEventListener('resize', updateIsMobile))

const { hasPermission } = usePermissions()
const canInsert = computed(() => hasPermission('org:ins'))

const openCreateModal = () => {
  isCreateModalOpen.value = true
}

const closeCreateModal = () => {
  isCreateModalOpen.value = false
}

const openEditModal = (locationData) => {
  selectedLocation.value = locationData
  isEditModalOpen.value = true
}

const closeEditModal = () => {
  isEditModalOpen.value = false
  selectedLocation.value = null
}

const handleRowDoubleClick = (rowData) => {
  openEditModal(rowData)
  console.log('Double click:', rowData)
}

const handleDeleted = () => {
  fetchData()
  closeEditModal()
}

const toggleRowExpand = (id) => {
  const i = expandedRows.value.indexOf(id)
  if (i === -1) {
    expandedRows.value.push(id)
  } else {
    expandedRows.value.splice(i, 1)
  }
}

const tableActions = computed(() => [
  {
    label: 'Добавить структуру',
    icon: 'Plus',
    onClick: openCreateModal,
    show: canInsert.value,
  },
].filter(action => action.show))

const fetchData = async () => {
  try {
    const response = await loadLocation()

    if (response?.result?.records) {
      const records = response.result.records.map(item => {
        const originalType = item.nameObjectTypeMulti || ''
        const typeWords = originalType.split(' ')
        const shortType = typeWords.length > 4
          ? typeWords.slice(0, 4).join(' ') + '...'
          : originalType

        return {
          ...item,
          nameObjectTypeMulti: shortType
        }
      })

      const tree = buildTree(records)
      const flatWithIndexes = assignIndexes(tree)
      childrenMap.value = buildChildrenMap(flatWithIndexes)
      organizationData.value = tree
    }
  } catch (e) {
    console.error('❌ Ошибка при загрузке данных структуры:', e)
  }
}

function buildTree(data) {
  const map = {}
  const result = []

  data.forEach(item => {
    map[item.id] = { ...item, children: [] }
  })

  data.forEach(item => {
    if (item.parent && map[item.parent]) {
      map[item.parent].children.push(map[item.id])
    } else {
      result.push(map[item.id])
    }
  })

  return result
}

function assignIndexes(tree, prefix = '') {
  const flat = []
  tree.forEach((node, i) => {
    const currentIndex = prefix ? `${prefix}.${i + 1}` : `${i + 1}`
    node.index = currentIndex
    flat.push(node)

    if (node.children.length) {
      flat.push(...assignIndexes(node.children, currentIndex))
    }
  })
  return flat
}

function buildChildrenMap(records) {
  const map = {}
  records.forEach(row => {
    if (row.parent != null) {
      if (!map[row.parent]) map[row.parent] = []
      map[row.parent].push(row)
    }
  })
  return map
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.org-structure-container {
  margin: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
}

.org-structure-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.org-structure-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a202c;
}

.org-structure-content {
  flex: 1;
  overflow-y: auto;
  max-height: 70vh;
  padding-right: 8px;
}

@media (max-width: 768px) {
  .org-structure-container {
    margin: 16px;
  }
  .org-structure-header {
    flex-direction: row; /* Keep it row for mobile title/actions */
  }
  .mobile-title {
    font-size: 20px;
  }
}
</style>
