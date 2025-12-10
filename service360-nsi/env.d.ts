/// <reference types="vite-plugin-pwa/client" />
/// <reference types="vite/client" />

/// <reference types="msw" />

interface ImportMetaEnv {
  readonly VITE_BASE_PATH?: string
  readonly VITE_PROXY_TARGET?: string
  readonly VITE_API_BASE?: string
  readonly VITE_API_DEV_PROXY_BASE?: string
  readonly VITE_RPC_PATH?: string
  readonly VITE_AUTH_LOGIN_PATH?: string
  readonly VITE_META_API_BASE?: string
  readonly VITE_META_DEV_PROXY_BASE?: string
  readonly VITE_RESOURCE_API_BASE?: string
  readonly VITE_RESOURCE_DEV_PROXY_BASE?: string
  readonly VITE_OBJECTS_API_BASE?: string
  readonly VITE_OBJECTS_DEV_PROXY_BASE?: string
  readonly VITE_PERSONNAL_API_BASE?: string
  readonly VITE_PERSONNAL_DEV_PROXY_BASE?: string
  readonly VITE_ORGSTRUCTURE_API_BASE?: string
  readonly VITE_ORGSTRUCTURE_DEV_PROXY_BASE?: string
  readonly VITE_REPORT_API_BASE?: string
  readonly VITE_REPORT_DEV_PROXY_BASE?: string
  readonly VITE_REPORT_LOAD_BASE?: string
  readonly VITE_REPORT_LOAD_DEV_PROXY_BASE?: string
  readonly VITE_KM_CHART_API_BASE?: string
  readonly VITE_KM_CHART_DEV_PROXY_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
