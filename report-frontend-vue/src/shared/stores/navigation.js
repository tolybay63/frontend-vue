import { defineStore } from 'pinia'

const ADVANCED_MODE_KEY = 'report-advanced-mode'
const CONSTRUCTOR_ROLES = Object.freeze({
  viewCreator: { id: 'viewCreator', label: 'создатель представлений' },
  dataAdmin: { id: 'dataAdmin', label: 'админ данных' },
  architect: { id: 'architect', label: 'архитектор' },
})

function loadAdvancedMode() {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(ADVANCED_MODE_KEY) === 'true'
  } catch (err) {
    console.warn('Failed to load advanced mode', err)
    return false
  }
}

function persistAdvancedMode(value) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(ADVANCED_MODE_KEY, value ? 'true' : 'false')
  } catch (err) {
    console.warn('Failed to persist advanced mode', err)
  }
}

export const useNavigationStore = defineStore('navigation', {
  state: () => ({
    dataAccessGranted: false,
    isAdvancedMode: loadAdvancedMode(),
    constructorRoles: CONSTRUCTOR_ROLES,
    viewCreationStartedAt: null,
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
    setAdvancedMode(value) {
      this.isAdvancedMode = Boolean(value)
      persistAdvancedMode(this.isAdvancedMode)
    },
    toggleAdvancedMode() {
      this.setAdvancedMode(!this.isAdvancedMode)
    },
    startViewCreation() {
      this.viewCreationStartedAt = Date.now()
    },
    finishViewCreation() {
      if (!this.viewCreationStartedAt) return null
      const duration = Date.now() - this.viewCreationStartedAt
      this.viewCreationStartedAt = null
      return duration
    },
  },
})
