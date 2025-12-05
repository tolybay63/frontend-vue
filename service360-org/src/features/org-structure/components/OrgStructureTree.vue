<template>
  <div class="tree-container">
    <div
      v-for="(node) in data"
      :key="node.id"
      class="tree-node-wrapper"
    >

      <div class="tree-node" :style="{ paddingLeft: `${level * 24}px` }">
        <div class="node-card" :class="{ expanded: isExpanded(node.id) }" @dblclick="handleDoubleClick(node)">

          <div class="node-header" @click="hasChildren(node) && toggleExpand(node.id)">
            
            <div class="header-main-info-mobile">
              <UiIcon
                v-if="hasChildren(node)"
                :name="isExpanded(node.id) ? 'ChevronDown' : 'ChevronRight'"
                class="chevron-icon"
              />
              <span class="node-type-mobile">{{ node.nameCls }}</span>
              <span 
                :class="['status-pill', node.nameIsActive === 'да' ? 'active' : 'inactive', 'status-pill-mobile']"
              >
                {{ node.nameIsActive === 'да' ? 'активен' : 'неактивен' }}
              </span>
            </div>
            <div class="node-creation-date-mobile">{{ node.CreatedAt }}</div>

            <div class="header-desktop">
              <UiIcon
                v-if="hasChildren(node)"
                :name="isExpanded(node.id) ? 'ChevronDown' : 'ChevronRight'"
                class="chevron-icon"
              />
              <span class="node-title">{{ node.name }}</span>
            </div>

          </div>
          
          <div class="node-title-main-mobile">{{ node.name }}</div>

          <div class="node-location-mobile">
            <UiIcon name="MapPin" class="location-icon" />
            <span>{{ node.nameRegion }}</span>
          </div>

          <div class="node-details-desktop">
            <div><span>Тип:</span> {{ node.nameCls }}</div>
            <div><span>Регион:</span> {{ node.nameRegion }}</div>
            <div>
              <span>Статус:</span>
              <span :class="['status-pill', node.nameIsActive === 'да' ? 'active' : 'inactive']">
                {{ node.nameIsActive === 'да' ? 'Активен' : 'Неактивен' }}
              </span>
            </div>
            <div><span>Дата создания:</span> {{ node.CreatedAt }}</div>
          </div>
        </div>
      </div>

      <div
        v-if="isExpanded(node.id) && childrenMap[node.id]"
        class="tree-children"
      >
        <OrgStructureTree
          :data="childrenMap[node.id]"
          :childrenMap="childrenMap"
          :expandedRows="expandedRows"
          :level="level + 1"
          @toggleExpand="toggleExpand"
          @row-dblclick="handleDoubleClick"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import UiIcon from '@/shared/ui/UiIcon.vue'

const props = defineProps({
  data: Array,
  childrenMap: Object,
  expandedRows: Array,
  level: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['toggleExpand', 'row-dblclick'])

const toggleExpand = (id) => emit('toggleExpand', id)
const isExpanded = (id) => props.expandedRows.includes(id)
const hasChildren = (node) => props.childrenMap[node.id]?.length > 0
const handleDoubleClick = (node) => emit('row-dblclick', node)
</script>

<style scoped>
/* ======================================================= */
/* 1. BASE / DESKTOP STYLES (Applies by default) */
/* ======================================================= */

.tree-container {
  display: flex;
  flex-direction: column;
  gap: 4px; /* Desktop gap */
}

.tree-node-wrapper {
  display: flex;
  flex-direction: column;
  position: relative;
}

.tree-node {
  position: relative;
}

/* Tree connection line (Desktop style) */
.tree-children {
  margin-left: 24px;
  padding-left: 12px;
  border-left: 2px solid #e5e7eb;
  margin-top: 8px;
}

.node-card {
  background-color: #fff;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  padding: 16px;
  transition: background-color 0.2s;
}

.node-card.expanded {
  background-color: #f0f8ff;
}

/* DESKTOP HEADER */
.node-header {
  /* Desktop style: Header contains ONLY the chevron and the main node name (.node-title) */
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  font-weight: 600;
  font-size: 16px;
  cursor: pointer;
}

/* HIDE MOBILE ELEMENTS BY DEFAULT (Desktop view) */
.header-main-info-mobile,
.node-creation-date-mobile,
.node-title-main-mobile,
.node-location-mobile {
  display: none;
}

/* SHOW DESKTOP ELEMENTS BY DEFAULT */
.header-desktop {
  display: flex;
  align-items: center;
}
.node-title {
  font-weight: 600;
}
.node-details-desktop {
  /* DESKTOP DETAILS GRID */
  display: grid;
  grid-template-columns: repeat(4, auto);
  gap: 8px 24px;
  font-size: 14px;
  color: #374151;
}

/* Common Styles (Desktop & Mobile) */
.chevron-icon {
  margin-right: 8px;
}
.node-details-desktop span:first-child {
  font-weight: 500;
  margin-right: 4px;
  color: #6b7280;
}
.status-pill {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
}
.status-pill.active {
  background-color: #d1fae5;
  color: #065f46;
}
.status-pill.inactive {
  background-color: #f3f4f6;
  color: #6b7280;
}

/* ======================================================= */
/* 2. MOBILE STYLES (Overrides for screens <= 768px) */
/* ======================================================= */

@media (max-width: 768px) {
  
  /* HIDE DESKTOP ELEMENTS ON MOBILE */
  .header-desktop {
    display: none;
  }
  .node-details-desktop {
    display: none;
  }
  
  /* SHOW MOBILE ELEMENTS ON MOBILE */
  .header-main-info-mobile,
  .node-title-main-mobile,
  .node-location-mobile {
    display: flex;
  }
  .node-header {
    /* Mobile Header: Contains the two elements (main info and date) */
    justify-content: space-between;
    margin-bottom: 8px; /* Reduced margin */
    font-weight: 400;
    font-size: 14px;
    color: #374151;
  }
  .header-main-info-mobile {
    align-items: center;
  }
  .node-creation-date-mobile {
    display: flex;
    font-size: 14px;
    color: #6b7280;
  }

  /* MOBILE NODE CARD STYLES */
  .tree-container {
    gap: 8px; /* Mobile gap */
  }
  .tree-node {
    /* Remove explicit padding on the node itself; indentation will come from the children margin */
    padding-left: 0 !important;
  }
  .tree-children {
    /* Mobile tree connection line style */
    margin-left: 12px;
    padding-left: 12px;
    border-left: 2px solid #e5e7eb;
    margin-top: 0px;
  }

  /* MOBILE CONTENT STYLES */
  .chevron-icon {
    /* Adjust chevron margin for mobile header */
    margin-right: 4px;
    color: #6b7280;
    width: 16px;
    height: 16px;
  }
  .node-type-mobile {
    font-weight: 500;
    margin-right: 8px;
    color: #6b7280;
    font-size: 12px;
  }
  .status-pill-mobile {
    font-size: 12px; /* Smaller font for mobile pill */
    text-transform: lowercase; /* as in the image */
  }

  .node-title-main-mobile {
    font-weight: 600;
    font-size: 15px;
    margin-bottom: 8px;
    color: #1a202c;
  }

  .node-location-mobile {
    align-items: center;
    font-size: 13px;
    color: #6b7280;
  }
  .location-icon {
    margin-right: 4px;
    color: #6b7280;
    width: 14px;
    height: 14px;
  }
}
</style>