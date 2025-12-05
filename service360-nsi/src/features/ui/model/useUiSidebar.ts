import { storeToRefs } from 'pinia'
import { useUiStore as useUiPiniaStore } from '@/stores/ui'

export function useUiSidebar() {
  const store = useUiPiniaStore()
  const { isSidebarCollapsed } = storeToRefs(store)

  return {
    isSidebarCollapsed,
    hydrateSidebarCollapsed: () => store.hydrateSidebarCollapsed(),
    setSidebarCollapsed: (value: boolean, options?: { persist?: boolean }) =>
      store.setSidebarCollapsed(value, options),
    toggleSidebar: () => store.toggleSidebar(),
  }
}
