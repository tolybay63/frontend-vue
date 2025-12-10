/** Файл: vite.config.ts
 *  Назначение: конфигурация Vite с dev-прокси и алиасами слоёв приложения.
 *  Использование: считывается сборщиком при запуске dev/production серверов.
 */
import { fileURLToPath, URL } from 'node:url'
import { promises as fs } from 'node:fs'
import path from 'node:path'

import { defineConfig, loadEnv, type PluginOption, type ProxyOptions } from 'vite'
import type { Server as ProxyServer } from 'http-proxy'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

const ABSOLUTE_URL_PATTERN = /^([a-z][a-z\d+\-.]*:)?\/\//i

function escapeForRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalizeProxyBase(value: string | undefined): string {
  if (!value) {
    return '/api'
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return '/api'
  }

  const withLeading = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  const withoutTrailing = withLeading.replace(/\/+$/, '')
  return withoutTrailing || '/'
}

function normalizeRewriteBase(pathname: string): string {
  if (!pathname) {
    return '/'
  }

  const withoutTrailing = pathname.replace(/\/+$/, '')
  return withoutTrailing || '/'
}

function normalizeBasePath(value: string | undefined): string {
  if (!value) {
    return '/'
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return '/'
  }

  const withLeading = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  return withLeading.endsWith('/') ? withLeading : `${withLeading}/`
}

function withMetaProxyGuards(options: ProxyOptions): ProxyOptions {
  const originalConfigure = options.configure

  return {
    ...options,
    configure(proxyServer: ProxyServer, proxyOptions) {
      proxyServer.on('proxyReq', (proxyReq) => {
        if (typeof proxyReq.removeHeader === 'function') {
          proxyReq.removeHeader('cookie')
        } else if (typeof proxyReq.setHeader === 'function') {
          proxyReq.setHeader('cookie', '')
        }
      })

      proxyServer.on('proxyRes', (proxyRes) => {
        if (proxyRes.headers['set-cookie']) {
          delete proxyRes.headers['set-cookie']
        }
      })

      if (typeof originalConfigure === 'function') {
        originalConfigure(proxyServer, proxyOptions)
      }
    },
  }
}

function resolveProxyRewriteConfig(
  rawBase: string | undefined,
  fallbackRewrite: string,
  defaultTarget: string,
): { target: string; rewriteBase: string } {
  const trimmed = rawBase?.trim()
  if (trimmed && ABSOLUTE_URL_PATTERN.test(trimmed)) {
    try {
      const parsed = new URL(trimmed)
      return {
        target: `${parsed.protocol}//${parsed.host}`,
        rewriteBase: normalizeRewriteBase(parsed.pathname),
      }
    } catch {
      // fall through to default
    }
  }

  if (trimmed) {
    return {
      target: defaultTarget,
      rewriteBase: normalizeRewriteBase(trimmed),
    }
  }

  return {
    target: defaultTarget,
    rewriteBase: normalizeRewriteBase(fallbackRewrite),
  }
}

const REPORTS_DATA_ROUTE = '/dev-reports'
const projectRoot = fileURLToPath(new URL('.', import.meta.url))

function createProxyConfig(env: Record<string, string>, proxyTarget: string): Record<string, ProxyOptions> {
  const proxies: Record<string, ProxyOptions> = {}

  const configureProxy = (
    proxyBaseRaw: string | undefined,
    serviceBaseRaw: string | undefined,
    fallbackProxyBase: string,
    fallbackRewriteBase: string,
    guard?: (options: ProxyOptions) => ProxyOptions,
  ) => {
    const proxyBaseCandidate =
      proxyBaseRaw ?? (serviceBaseRaw && !ABSOLUTE_URL_PATTERN.test(serviceBaseRaw) ? serviceBaseRaw : undefined)
    const proxyBase = normalizeProxyBase(proxyBaseCandidate ?? fallbackProxyBase)
    const { target, rewriteBase } = resolveProxyRewriteConfig(
      serviceBaseRaw,
      fallbackRewriteBase,
      proxyTarget,
    )
    const pattern = new RegExp(`^${escapeForRegex(proxyBase)}`)
    const baseOptions: ProxyOptions = {
      target,
      changeOrigin: true,
      rewrite: (path) => path.replace(pattern, rewriteBase),
    }
    proxies[proxyBase] = typeof guard === 'function' ? guard(baseOptions) : baseOptions
  }

  // 1) Основной API (NSI)
  configureProxy(
    env.VITE_API_DEV_PROXY_BASE,
    env.VITE_API_BASE,
    '/api',
    '/dtj/ind/api',
  )

  // 2) Meta API
  configureProxy(
    env.VITE_META_DEV_PROXY_BASE,
    env.VITE_META_API_BASE,
    '/meta-api',
    '/dtj/meta/api',
    withMetaProxyGuards,
  )

  // 3) Resource API
  configureProxy(
    env.VITE_RESOURCE_DEV_PROXY_BASE,
    env.VITE_RESOURCE_API_BASE,
    '/resource-api',
    '/dtj/api/resource',
  )

  // 4) Objects API
  configureProxy(
    env.VITE_OBJECTS_DEV_PROXY_BASE,
    env.VITE_OBJECTS_API_BASE,
    '/objects-api',
    '/dtj/api/objects',
  )

  // 5) Personnal API
  configureProxy(
    env.VITE_PERSONNAL_DEV_PROXY_BASE,
    env.VITE_PERSONNAL_API_BASE,
    '/personnal-api',
    '/dtj/api/personnal',
  )

  // 6) OrgStructure API
  configureProxy(
    env.VITE_ORGSTRUCTURE_DEV_PROXY_BASE,
    env.VITE_ORGSTRUCTURE_API_BASE,
    '/orgstructure-api',
    '/dtj/api/orgstructure',
  )

  // 7) Report API
  configureProxy(
    env.VITE_REPORT_DEV_PROXY_BASE,
    env.VITE_REPORT_API_BASE,
    '/report-api',
    '/dtj/api/report',
  )

  // 8) Report load endpoint
  configureProxy(
    env.VITE_REPORT_LOAD_DEV_PROXY_BASE,
    env.VITE_REPORT_LOAD_BASE,
    '/load-report',
    '/loadReport',
  )

  // 9) KM-chart widget API (/dtj-api → /dtj/api/inspections)
  configureProxy(
    env.VITE_KM_CHART_DEV_PROXY_BASE,
    env.VITE_KM_CHART_API_BASE,
    '/dtj-api',
    '/dtj/api/inspections',
  )

  return proxies
}

function reportsDataPlugin(): PluginOption {
  const reportsFilePath = path.resolve(projectRoot, 'src/data/reportTemplates.json')
  return {
    name: 'reports-data-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith(REPORTS_DATA_ROUTE)) return next()

        if (req.method === 'GET') {
          try {
            const data = await fs.readFile(reportsFilePath, 'utf-8')
            res.setHeader('Content-Type', 'application/json')
            res.end(data)
          } catch (error) {
            res.statusCode = 500
            res.end(String(error))
          }
          return
        }

        if (req.method === 'PUT') {
          try {
            const chunks: Buffer[] = []
            for await (const chunk of req) {
              chunks.push(Buffer.from(chunk))
            }
            const body = Buffer.concat(chunks).toString('utf-8')
            const parsed = JSON.parse(body)
            if (!Array.isArray(parsed)) {
              res.statusCode = 400
              res.end('Payload must be an array')
              return
            }
            await fs.writeFile(reportsFilePath, JSON.stringify(parsed, null, 2) + '\n', 'utf-8')
            res.statusCode = 204
            res.end()
          } catch (error) {
            res.statusCode = 500
            res.end(String(error))
          }
          return
        }

        res.statusCode = 405
        res.end('Method Not Allowed')
      })
    },
  }
}

async function resolvePwaPlugin(basePath: string): Promise<PluginOption | null> {
  try {
    const mod = await import('vite-plugin-pwa')
    if (typeof mod?.VitePWA !== 'function') return null
    return mod.VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false, // у тебя своя регистрация через pwa.ts — норм
      devOptions: { enabled: false }, // <— ДОБАВЬ ЭТО
      includeAssets: ['favicon.png'],
      manifest: {
        name: 'NSI',
        short_name: 'NSI',
        start_url: basePath,
        scope: basePath,
        display: 'standalone',
        background_color: '#006d77',
        theme_color: '#006d77',
        icons: [
          { src: '/icons/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,ico,png,svg}'] },
    })
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    console.warn(`[vite-config] vite-plugin-pwa unavailable: ${reason}`)
    return null
  }
}

// https://vite.dev/config/

export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const basePath = normalizeBasePath(env.VITE_BASE_PATH)
  const proxyTarget = env.VITE_PROXY_TARGET?.trim()
  const pwaPlugin = await resolvePwaPlugin(basePath)
  const proxyConfig = proxyTarget ? createProxyConfig(env, proxyTarget) : undefined

  const plugins: PluginOption[] = [vue(), vueDevTools(), reportsDataPlugin()]
  if (pwaPlugin) plugins.push(pwaPlugin)

  return {
    plugins,
    base: basePath,
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@app': fileURLToPath(new URL('./src/app', import.meta.url)),
        '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
        '@entities': fileURLToPath(new URL('./src/entities', import.meta.url)),
        '@features': fileURLToPath(new URL('./src/features', import.meta.url)),
        '@widgets': fileURLToPath(new URL('./src/widgets', import.meta.url)),
        '@pages': fileURLToPath(new URL('./src/pages', import.meta.url)),
        '@layouts': fileURLToPath(new URL('./src/layouts', import.meta.url)),
      },
    },
    server: {
      proxy: proxyConfig,
    },
  }
})
