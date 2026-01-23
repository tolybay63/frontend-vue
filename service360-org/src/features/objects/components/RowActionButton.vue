<template>
  <button
    class="row-action-button"
    @click.stop="handleClick"
    title="Паспортные данные"
  >
    <UiIcon name="Book" />
  </button>
</template>

<script setup>
import UiIcon from '@/shared/ui/UiIcon.vue';
import { useRouter } from 'vue-router';

const props = defineProps({
  row: { type: Object, default: null }
});

const router = useRouter();

const handleClick = () => {
  if (props.row?.id) {
    router.push({
      name: 'PassportData',
      params: { id: props.row.id },
      query: { name: props.row.name || '' }
    });
  }
};
</script>

<style scoped>
.row-action-button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.row-action-button:hover {
  background-color: #dbeafe;
}

.row-action-button :deep(.icon) {
  color: #2563eb;
  width: 18px;
  height: 18px;
}
</style>
