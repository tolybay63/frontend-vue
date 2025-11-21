<template>
  <div class="pagination">
    <button
      class="page-btn"
      :disabled="page === 1"
      @click="$emit('change-page', page - 1)"
    >
      <UiIcon name="ChevronLeft" />
    </button>

    <button
      v-for="p in visiblePages"
      :key="p"
      class="page-btn"
      :class="{ active: p === page, ellipsis: p === '...'}"
      :disabled="p === '...'"
      @click="typeof p === 'number' && $emit('change-page', p)"
    >
      {{ p }}
    </button>

    <button
      class="page-btn"
      :disabled="page === totalPages"
      @click="$emit('change-page', page + 1)"
    >
      <UiIcon name="ChevronRight" />
    </button>
  </div>
</template>

<script setup>
import UiIcon from '@/shared/ui/UiIcon.vue'
import { computed } from 'vue'

const props = defineProps({
  total: Number,
  page: Number,
  limit: Number
})

const totalPages = computed(() => Math.ceil(props.total / props.limit))

const visiblePages = computed(() => {
  const total = totalPages.value
  const current = props.page

  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1)

  const pages = new Set()

  pages.add(1)

  if (current > 3) pages.add('...')
  if (current > 2) pages.add(current - 1)
  if (current !== 1 && current !== total) pages.add(current)
  if (current < total - 1) pages.add(current + 1)
  if (current < total - 2) pages.add('...')
  pages.add(total)

  return Array.from(pages)
})

</script>

<style scoped>
.pagination {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
  align-items: center;
  padding: 16px;
  font-size: 14px;
}

.page-btn {
  min-width: 32px;
  height: 32px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #4a5568;
  border-radius: 6px;
  cursor: pointer;
  padding: 0 8px;
  transition: background 0.2s;
}

.page-btn:hover:not(:disabled) {
  background: #f1f5f9;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.page-btn.active {
  background: #e6f0fb;
  color: #2b6cb0;
  font-weight: 600;
}

.page-btn.ellipsis {
  cursor: default;
  pointer-events: none;
  border: none;
  background: transparent;
}
</style>
