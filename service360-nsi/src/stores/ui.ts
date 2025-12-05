import { defineStore } from 'pinia'

const STORAGE_KEY = 'ui.sidebarCollapsed'

interface UiState {
  isSidebarCollapsed: boolean
}

interface SetSidebarCollapsedOptions {
  persist?: boolean
}

export const useUiStore = defineStore('ui', {
  state: (): UiState => ({
    isSidebarCollapsed: false,
  }),
  actions: {
    hydrateSidebarCollapsed() {
      if (typeof window === 'undefined') return
      const stored = window.localStorage.getItem(STORAGE_KEY)
      this.isSidebarCollapsed = stored === '1'
    },
    setSidebarCollapsed(value: boolean, options?: SetSidebarCollapsedOptions) {
      this.isSidebarCollapsed = value
      if (options?.persist === false) return
      if (typeof window === 'undefined') return
      window.localStorage.setItem(STORAGE_KEY, value ? '1' : '0')
    },
    toggleSidebar() {
      this.setSidebarCollapsed(!this.isSidebarCollapsed)
    },
  },
})
