import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSidebarStore = defineStore('sidebar', () => {
  const collapsed = ref(false);
  const mobileOpen = ref(false);

  const toggle = () => {
    collapsed.value = !collapsed.value;
  }

  const toggleMobile = () => {
    mobileOpen.value = !mobileOpen.value;
  }

  const setCollapsed = (value) => {
    collapsed.value = value;
  }

  return { collapsed, mobileOpen, toggle, toggleMobile, setCollapsed }
}, {
  persist: true
})
