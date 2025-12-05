import { ref } from 'vue'

const userPermissions = ref(new Set())

function parsePermissions() {
  const curUserString = localStorage.getItem('curUser')
  if (!curUserString) {
    userPermissions.value = new Set()
    return
  }
  try {
    const curUser = JSON.parse(curUserString)
    const target = curUser?.result?.target || ''
    userPermissions.value = new Set(target.split(','))
  } catch (e) {
    console.error('Ошибка парсинга прав пользователя:', e)
    userPermissions.value = new Set()
  }
}

export function usePermissions() {
  parsePermissions()
  const hasPermission = (permission) => userPermissions.value.has(permission)
  return { hasPermission }
}

