import { defineStore } from 'pinia'

export const useNavigationStore = defineStore('navigation', {
  state: () => ({
    dataAccessGranted: false,
  }),
  actions: {
    allowDataAccess() {
      this.dataAccessGranted = true
    },
    consumeDataAccess() {
      const allowed = this.dataAccessGranted
      this.dataAccessGranted = false
      return allowed
    },
    resetDataAccess() {
      this.dataAccessGranted = false
    },
  },
})
