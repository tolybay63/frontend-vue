import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useTableRefreshStore = defineStore('tableRefresh', () => {
  const refreshEvents = ref(new Map())

  const registerTable = (tableId, refreshCallback) => {
    refreshEvents.value.set(tableId, refreshCallback)
    console.log(`📋 Таблица "${tableId}" зарегистрирована для обновлений`)
  }

  const unregisterTable = (tableId) => {
    refreshEvents.value.delete(tableId)
    console.log(`📋 Таблица "${tableId}" отменила регистрацию`)
  }

  const refreshTable = async (tableId) => {
    const refreshCallback = refreshEvents.value.get(tableId)
    if (refreshCallback) {
      try {
        await refreshCallback()
      } catch (error) {
        console.error(`❌ Ошибка обновления таблицы "${tableId}":`, error)
      }
    } else {
    }
  }

  const refreshAllTables = async () => {
    console.log(`🔄 Обновление всех таблиц (${refreshEvents.value.size})`)
    const promises = Array.from(refreshEvents.value.entries()).map(async ([tableId, refreshCallback]) => {
      try {
        await refreshCallback()
      } catch (error) {
        console.error(`Ошибка обновления таблицы "${tableId}":`, error)
      }
    })
    await Promise.all(promises)
  }

  const refreshTablesByType = async (type) => {
    console.log(`🔄 Обновление таблиц типа "${type}"`)
    const promises = Array.from(refreshEvents.value.entries())
      .filter(([tableId]) => tableId.includes(type))
      .map(async ([tableId, refreshCallback]) => {
        try {
          await refreshCallback()
        } catch (error) {
          console.error(`Ошибка обновления таблицы "${tableId}":`, error)
        }
      })
    await Promise.all(promises)
  }

  return {
    registerTable,
    unregisterTable,
    refreshTable,
    refreshAllTables,
    refreshTablesByType
  }
})