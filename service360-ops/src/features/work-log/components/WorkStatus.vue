<template>
  <div class="status-wrapper">
    <UiIcon v-if="showCheck" name="Check" class="icon-check" title="Работа выполнена" />
    <UiIcon v-if="showMinus" name="Minus" class="icon-minus" title="Работа не выполнена" />
    <UiIcon v-if="showHammer" name="Hammer" class="icon-hammer" title="Зарегистрированы неисправности" />
    <UiIcon v-if="showRuler" name="Ruler" class="icon-ruler" title="Зарегистрированы параметры" />
  </div>
</template>

<script setup>
import UiIcon from '@/shared/ui/UiIcon.vue';

const props = defineProps({
  showCheck: {
    type: Boolean,
    default: false,
  },
  showMinus: {
    type: Boolean,
    default: false,
  },
  showHammer: {
    type: Boolean,
    default: false,
  },
  showRuler: {
    type: Boolean,
    default: false,
  },
});
</script>

<style scoped>
.status-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-wrapper :deep(.icon) {
  margin-right: 0;
  width: 18px;
  height: 18px;
}

.icon-check {
  color: #22c55e; /* Зеленый */
}

.icon-minus {
  color: #f97316; /* Оранжевый */
}

.icon-hammer {
  color: #ef4444; /* Красный */
}

.icon-ruler {
  color: #3b82f6; /* Синий */
}
</style>