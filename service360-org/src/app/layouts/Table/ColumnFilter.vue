<template>
  <div class="column-filter">
    <input
      v-model="searchValue"
      :placeholder="`Фильтр по ${columnLabel}...`"
      class="filter-input"
      @input="onInput"
      @click.stop
      ref="inputRef"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'

const props = defineProps({
  columnKey: {
    type: String,
    required: true
  },
  columnLabel: {
    type: String,
    required: true
  },
  initialValue: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['filter', 'close'])

const searchValue = ref(props.initialValue)
const inputRef = ref(null)

const onInput = () => {
  emit('filter', {
    columnKey: props.columnKey,
    value: searchValue.value
  })
}

onMounted(() => {
  if (inputRef.value) {
    inputRef.value.focus()
  }
})

watch(() => props.initialValue, (newValue) => {
  searchValue.value = newValue
})
</script>

<style scoped>
.column-filter {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 100;
  min-width: 200px;
  padding: 8px;
}

.filter-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #cbd5e0;
  border-radius: 4px;
  font-size: 14px;
  outline: none;
  box-sizing: border-box;
}

.filter-input:focus {
  border-color: #3182ce;
  box-shadow: 0 0 0 3px rgba(49, 130, 206, 0.1);
}
</style>