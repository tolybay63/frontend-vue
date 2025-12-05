/** Файл: src/stores/counter.ts
 *  Назначение: Pinia-стор приложения (аутентификация/пример).
 *  Использование: импортируйте через фичевые фасады или напрямую при инициализации.
 */
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const useCounterStore = defineStore('counter', () => {
  const count = ref(0)
  const doubleCount = computed(() => count.value * 2)
  function increment() {
    count.value++
  }

  return { count, doubleCount, increment }
})
