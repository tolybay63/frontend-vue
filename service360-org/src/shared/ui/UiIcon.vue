<template>
  <component :is="iconComponent" :style="iconStyle" class="icon" />
</template>

<script setup>
import * as icons from 'lucide-vue-next'
import { computed } from 'vue'

const props = defineProps({
  name: String,
  color: String, // Добавлено свойство color
})

const iconComponent = computed(() => icons[props.name] || icons['AlertCircle'])

// Добавлено вычисляемое свойство для inline-стиля цвета
const iconStyle = computed(() => (props.color ? { color: props.color } : {}))
</script>

<style scoped>
.icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  color: #4a5568; /* Цвет по умолчанию теперь в CSS, но может быть переопределен через props */
}
</style>