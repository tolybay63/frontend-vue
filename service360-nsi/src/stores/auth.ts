/** Файл: src/stores/auth.ts
 *  Назначение: Pinia-стор приложения (аутентификация/пример).
 *  Использование: импортируйте через фичевые фасады или напрямую при инициализации.
 */
import { defineStore } from 'pinia'
import { login as apiLogin, userinfoRpc, type LoginCredentials } from '@shared/api'
import { getCurUserInfo, type CurUser } from '@shared/api'
import { parseTargets, can as canUtil, canAny as canAnyUtil, toNumericOrUndefined } from '@shared/lib'

function sanitizeRedirect(path: unknown): string | null {
  if (typeof path !== 'string') return null
  if (!path.startsWith('/')) return null
  if (path.startsWith('//')) return null
  if (path === '/login') return null
  return path
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as CurUser | null,
    permissions: new Set<string>() as Set<string>,
    isAuthenticating: false,
    error: null as string | null,
    redirectPath: null as string | null,
  }),

  getters: {
    isAuthenticated: (state) => Boolean(state.user),
  },

  actions: {
    setRedirectPath(p: string | null) {
      this.redirectPath = sanitizeRedirect(p)
    },

    consumeRedirectPath() {
      const p = this.redirectPath
      this.redirectPath = null
      return p
    },

    clearError() {
      this.error = null
    },

    async login(dto: LoginCredentials) {
      this.isAuthenticating = true
      this.error = null

      try {
        const payload: LoginCredentials = {
          username: dto.username.trim(),
          password: dto.password,
        }

        await apiLogin(payload)
        await this.fetchMe()
        return { ok: true as const }
      } catch (error: unknown) {
        this.error = error instanceof Error ? error.message : 'Не удалось выполнить вход'
        throw error
      } finally {
        this.isAuthenticating = false
      }
    },

    async fetchMe() {
      const me = await getCurUserInfo()
      this.user = me
      this.permissions = parseTargets(me.target)
      persistLocalUser(me)
      await persistLocalPersonnalInfo(me.id)
    },

    async logout() {
      // ??? ??????? /auth/logout ????? ??? ???
      this.user = null
      this.permissions = new Set<string>()
      this.redirectPath = null
      this.error = null
    },

    can(p: string) {
      return canUtil(this.permissions, p)
    },

    canAny(list: string[]) {
      return canAnyUtil(this.permissions, list)
    },
  },
})

type PersonnalInfoResponse = {
  result?: {
    records?: Array<Record<string, unknown>>
  }
  records?: Array<Record<string, unknown>>
}

function persistToLocalStorage(key: string, value: string) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, value)
}

function toNumeric(value: unknown): number | undefined {
  if (typeof value === 'number' || typeof value === 'string') {
    return toNumericOrUndefined(value)
  }
  return undefined
}

function persistNumber(key: string, value: unknown) {
  const numeric = toNumeric(value)
  if (numeric == null) return
  persistToLocalStorage(key, String(numeric))
}

function extractFirstRecord(response: PersonnalInfoResponse | null): Record<string, unknown> | null {
  const records = response?.records ?? response?.result?.records
  if (!Array.isArray(records) || !records.length) return null
  return records[0] ?? null
}

function ensurePersonnalInfoEnvelope(
  response: PersonnalInfoResponse | null,
): PersonnalInfoResponse | null {
  if (!response) return null
  if (Object.prototype.hasOwnProperty.call(response, 'result')) {
    return response
  }
  if (response.records) {
    return { result: { records: response.records } }
  }
  return { result: {} }
}

function extractRecordValue(record: Record<string, unknown> | null, keys: string[]): unknown {
  if (!record) return undefined
  for (const key of keys) {
    if (key in record) return record[key]
  }
  return undefined
}

function formatCurUserPayload(user: CurUser) {
  return JSON.stringify({ result: user })
}

function formatPersonnalPayload(payload: unknown) {
  return JSON.stringify(payload)
}

function safeStringify(payload: unknown, fallback = ''): string {
  try {
    return formatPersonnalPayload(payload)
  } catch {
    return fallback
  }
}

function safeUserPayload(user: CurUser): string {
  try {
    return formatCurUserPayload(user)
  } catch {
    return ''
  }
}

function persistLocalUser(user: CurUser) {
  persistToLocalStorage('userId', String(user.id))
  const payload = safeUserPayload(user)
  if (payload) {
    persistToLocalStorage('curUser', payload)
  }
}

async function persistLocalPersonnalInfo(id: string | number) {
  const response = await userinfoRpc<PersonnalInfoResponse>('data/getPersonnalInfo', [id])
  const normalized = ensurePersonnalInfoEnvelope(response)
  persistToLocalStorage('personnalInfo', safeStringify(normalized))

  const record = extractFirstRecord(response)
  persistNumber('objLocation', extractRecordValue(record, ['objLocation', 'ObjLocation', 'obj_location']))
  persistNumber('objUser', extractRecordValue(record, ['objUser', 'ObjUser', 'obj_user']))
  persistNumber('pvUser', extractRecordValue(record, ['pvUser', 'PvUser', 'pv_user']))
}
