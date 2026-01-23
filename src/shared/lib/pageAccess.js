export function toNumericId(value) {
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

export function matchUserAccess(currentObjUser, currentPvUser, targetObjUser, targetPvUser) {
  const currentObj = toNumericId(currentObjUser)
  const currentPv = toNumericId(currentPvUser)
  const targetObj = toNumericId(targetObjUser)
  const targetPv = toNumericId(targetPvUser)
  if (
    currentObj === null ||
    currentPv === null ||
    targetObj === null ||
    targetPv === null
  ) {
    return false
  }
  return currentObj === targetObj && currentPv === targetPv
}

export function isPagePrivate(page) {
  if (!page) return false
  if (typeof page.isPrivate !== 'undefined') {
    return Boolean(page.isPrivate)
  }
  if (page.privacy && typeof page.privacy.isPrivate !== 'undefined') {
    return Boolean(page.privacy.isPrivate)
  }
  return false
}

export function canUserAccessPage(page, userMeta) {
  if (!page) return false
  if (!isPagePrivate(page)) return true
  const objUser = toNumericId(userMeta?.objUser)
  const pvUser = toNumericId(userMeta?.pvUser)
  if (objUser === null || pvUser === null) return false
  if (matchUserAccess(objUser, pvUser, page?.objUser, page?.pvUser)) {
    return true
  }
  const whitelist = Array.isArray(page?.privacy?.users)
    ? page.privacy.users
    : []
  return whitelist.some((entry) =>
    matchUserAccess(objUser, pvUser, entry?.id ?? entry?.objUser, entry?.pv ?? entry?.pvUser),
  )
}

export function resolveUserMeta(source) {
  if (!source) return null
  const objUser = toNumericId(source.objUser)
  const pvUser = toNumericId(source.pvUser)
  if (objUser === null || pvUser === null) return null
  return { objUser, pvUser }
}

export function readStoredUserValue(key) {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const num = Number(parsed)
    return Number.isFinite(num) ? num : null
  } catch {
    return null
  }
}

export function readStoredUserMeta() {
  const objUser = readStoredUserValue('objUser')
  const pvUser = readStoredUserValue('pvUser')
  if (objUser === null || pvUser === null) return null
  return { objUser, pvUser }
}
