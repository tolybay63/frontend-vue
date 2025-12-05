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

const REPORTS_DATA_ROUTE = '/dev-reports'
const projectRoot = fileURLToPath(new URL('.', import.meta.url))

function createProxyConfig(env: Record<string, string>): Record<string, ProxyOptions> {
  const proxies: Record<string, ProxyOptions> = {}

  // 1) Основной API (NSI)
  const apiProxyBase = normalizeProxyBase(env.VITE_API_DEV_PROXY_BASE)
  const rawApiBase = env.VITE_API_BASE?.trim()

  if (rawApiBase && ABSOLUTE_URL_PATTERN.test(rawApiBase)) {
    try {
      const apiURL = new URL(rawApiBase)
      const target = `${apiURL.protocol}//${apiURL.host}`
      const rewriteBase = normalizeRewriteBase(apiURL.pathname)
      const pattern = new RegExp(`^${escapeForRegex(apiProxyBase)}`)

      proxies[apiProxyBase] = {
        target,
        changeOrigin: true,
        rewrite: (path) => path.replace(pattern, rewriteBase),
      }
    } catch {
      // Ignore parse failures and fall back to the default proxy below
    }
  }

  if (!proxies[apiProxyBase]) {
    const pattern = new RegExp(`^${escapeForRegex(apiProxyBase)}`)
    proxies[apiProxyBase] = {
      target: 'http://45.8.116.32',
      changeOrigin: true,
      rewrite: (path) => path.replace(pattern, '/dtj/ind/api'),
    }
  }

  // 2) Meta API
  const metaProxyBase = normalizeProxyBase(env.VITE_META_DEV_PROXY_BASE || '/meta-api')
  const rawMetaBase = env.VITE_META_API_BASE?.trim()

  if (rawMetaBase && ABSOLUTE_URL_PATTERN.test(rawMetaBase)) {
    try {
      const metaURL = new URL(rawMetaBase)
      const target = `${metaURL.protocol}//${metaURL.host}`
      const rewriteBase = normalizeRewriteBase(metaURL.pathname)
      const pattern = new RegExp(`^${escapeForRegex(metaProxyBase)}`)

      proxies[metaProxyBase] = withMetaProxyGuards({
        target,
        changeOrigin: true,
        rewrite: (path) => path.replace(pattern, rewriteBase),
      })
    } catch {
      // Ignore
    }
  }

  if (!proxies[metaProxyBase]) {
    const pattern = new RegExp(`^${escapeForRegex(metaProxyBase)}`)
    proxies[metaProxyBase] = withMetaProxyGuards({
      target: 'http://45.8.116.32',
      changeOrigin: true,
      rewrite: (path) => path.replace(pattern, '/dtj/meta/api'),
    })
  }

  // 3) Resource API
  const resourceProxyBase = normalizeProxyBase(env.VITE_RESOURCE_DEV_PROXY_BASE || '/resource-api')
  const rawResourceBase = env.VITE_RESOURCE_API_BASE?.trim()

  if (rawResourceBase && ABSOLUTE_URL_PATTERN.test(rawResourceBase)) {
    try {
      const resourceURL = new URL(rawResourceBase)
      const target = `${resourceURL.protocol}//${resourceURL.host}`
      const rewriteBase = normalizeRewriteBase(resourceURL.pathname)
      const pattern = new RegExp(`^${escapeForRegex(resourceProxyBase)}`)

      proxies[resourceProxyBase] = {
        target,
        changeOrigin: true,
        rewrite: (path) => path.replace(pattern, rewriteBase),
      }
    } catch {
      // Ignore
    }
  }

  if (!proxies[resourceProxyBase]) {
    const pattern = new RegExp(`^${escapeForRegex(resourceProxyBase)}`)
    proxies[resourceProxyBase] = {
      target: 'http://45.8.116.32',
      changeOrigin: true,
      rewrite: (path) => path.replace(pattern, '/dtj/api/resource'),
    }
  }

  // 4) Objects API
  const objectsProxyBase = normalizeProxyBase(env.VITE_OBJECTS_DEV_PROXY_BASE || '/objects-api')
  const rawObjectsBase = env.VITE_OBJECTS_API_BASE?.trim()

  if (rawObjectsBase && ABSOLUTE_URL_PATTERN.test(rawObjectsBase)) {
    try {
      const objectsURL = new URL(rawObjectsBase)
      const target = `${objectsURL.protocol}//${objectsURL.host}`
      const rewriteBase = normalizeRewriteBase(objectsURL.pathname)
      const pattern = new RegExp(`^${escapeForRegex(objectsProxyBase)}`)

      proxies[objectsProxyBase] = {
        target,
        changeOrigin: true,
        rewrite: (path) => path.replace(pattern, rewriteBase),
      }
    } catch {
      // Ignore
    }
  }

  if (!proxies[objectsProxyBase]) {
    const pattern = new RegExp(`^${escapeForRegex(objectsProxyBase)}`)
    proxies[objectsProxyBase] = {
      target: 'http://45.8.116.32',
      changeOrigin: true,
      rewrite: (path) => path.replace(pattern, '/dtj/api/objects'),
    }
  }

  // 5) Personnal API
  const personnalProxyBase = normalizeProxyBase(
    env.VITE_PERSONNAL_DEV_PROXY_BASE || '/personnal-api',
  )
  const rawPersonnalBase = env.VITE_PERSONNAL_API_BASE?.trim()

  if (rawPersonnalBase && ABSOLUTE_URL_PATTERN.test(rawPersonnalBase)) {
    try {
      const personnalURL = new URL(rawPersonnalBase)
      const target = `${personnalURL.protocol}//${personnalURL.host}`
      const rewriteBase = normalizeRewriteBase(personnalURL.pathname)
      const pattern = new RegExp(`^${escapeForRegex(personnalProxyBase)}`)

      proxies[personnalProxyBase] = {
        target,
        changeOrigin: true,
        rewrite: (path) => path.replace(pattern, rewriteBase),
      }
    } catch {
      // Ignore
    }
  }

  if (!proxies[personnalProxyBase]) {
    const pattern = new RegExp(`^${escapeForRegex(personnalProxyBase)}`)
    proxies[personnalProxyBase] = {
      target: 'http://45.8.116.32',
      changeOrigin: true,
      rewrite: (path) => path.replace(pattern, '/dtj/api/personnal'),
    }
  }

  // 6) OrgStructure API
  const orgStructureProxyBase = normalizeProxyBase(
    env.VITE_ORGSTRUCTURE_DEV_PROXY_BASE || '/orgstructure-api',
  )
  const rawOrgStructureBase = env.VITE_ORGSTRUCTURE_API_BASE?.trim()

  if (rawOrgStructureBase && ABSOLUTE_URL_PATTERN.test(rawOrgStructureBase)) {
    try {
      const orgStructureURL = new URL(rawOrgStructureBase)
      const target = `${orgStructureURL.protocol}//${orgStructureURL.host}`
      const rewriteBase = normalizeRewriteBase(orgStructureURL.pathname)
      const pattern = new RegExp(`^${escapeForRegex(orgStructureProxyBase)}`)

      proxies[orgStructureProxyBase] = {
        target,
        changeOrigin: true,
        rewrite: (path) => path.replace(pattern, rewriteBase),
      }
    } catch {
      // Ignore
    }
  }

  if (!proxies[orgStructureProxyBase]) {
    const pattern = new RegExp(`^${escapeForRegex(orgStructureProxyBase)}`)
    proxies[orgStructureProxyBase] = {
      target: 'http://45.8.116.32',
      changeOrigin: true,
      rewrite: (path) => path.replace(pattern, '/dtj/api/orgstructure'),
    }
  }

  // 7) Report API
  const reportProxyBase = normalizeProxyBase(env.VITE_REPORT_DEV_PROXY_BASE || '/report-api')
  const rawReportBase = env.VITE_REPORT_API_BASE?.trim()

  if (rawReportBase && ABSOLUTE_URL_PATTERN.test(rawReportBase)) {
    try {
      const reportURL = new URL(rawReportBase)
      const target = `${reportURL.protocol}//${reportURL.host}`
      const rewriteBase = normalizeRewriteBase(reportURL.pathname)
      const pattern = new RegExp(`^${escapeForRegex(reportProxyBase)}`)

      proxies[reportProxyBase] = {
        target,
        changeOrigin: true,
        rewrite: (path) => path.replace(pattern, rewriteBase),
      }
    } catch {
      // Ignore
    }
  }

  if (!proxies[reportProxyBase]) {
    const pattern = new RegExp(`^${escapeForRegex(reportProxyBase)}`)
    proxies[reportProxyBase] = {
      target: 'http://45.8.116.32',
      changeOrigin: true,
      rewrite: (path) => path.replace(pattern, '/dtj/api/report'),
    }
  }

  // 8) Report load endpoint
  const reportLoadProxyBase = normalizeProxyBase(env.VITE_REPORT_LOAD_DEV_PROXY_BASE || '/load-report')
  const rawReportLoadBase = env.VITE_REPORT_LOAD_BASE?.trim()

  if (rawReportLoadBase && ABSOLUTE_URL_PATTERN.test(rawReportLoadBase)) {
    try {
      const reportLoadURL = new URL(rawReportLoadBase)
      const target = `${reportLoadURL.protocol}//${reportLoadURL.host}`
      const rewriteBase = normalizeRewriteBase(reportLoadURL.pathname)
      const pattern = new RegExp(`^${escapeForRegex(reportLoadProxyBase)}`)

      proxies[reportLoadProxyBase] = {
        target,
        changeOrigin: true,
        rewrite: (path) => path.replace(pattern, rewriteBase),
      }
    } catch {
      // Ignore
    }
  }

  if (!proxies[reportLoadProxyBase]) {
    const pattern = new RegExp(`^${escapeForRegex(reportLoadProxyBase)}`)
    proxies[reportLoadProxyBase] = {
      target: 'http://45.8.116.32',
      changeOrigin: true,
      rewrite: (path) => path.replace(pattern, '/loadReport'),
    }
  }

  // 9) KM-chart widget API (/dtj-api → http://45.8.116.32/dtj/api/inspections)
  const kmChartProxyBase = normalizeProxyBase(env.VITE_KM_CHART_DEV_PROXY_BASE || '/dtj-api')
  const rawKmChartBase = env.VITE_KM_CHART_API_BASE?.trim()

  if (rawKmChartBase && ABSOLUTE_URL_PATTERN.test(rawKmChartBase)) {
    try {
      const kmChartURL = new URL(rawKmChartBase)
      const target = `${kmChartURL.protocol}//${kmChartURL.host}`
      const rewriteBase = normalizeRewriteBase(kmChartURL.pathname || '/dtj/api/inspections')
      const pattern = new RegExp(`^${escapeForRegex(kmChartProxyBase)}`)

      proxies[kmChartProxyBase] = {
        target,
        changeOrigin: true,
        rewrite: (path) => path.replace(pattern, rewriteBase),
      }
    } catch {
      // Ignore
    }
  }

  if (!proxies[kmChartProxyBase]) {
    const pattern = new RegExp(`^${escapeForRegex(kmChartProxyBase)}`)
    proxies[kmChartProxyBase] = {
      target: 'http://45.8.116.32',
      changeOrigin: true,
      rewrite: (path) => path.replace(pattern, '/dtj/api/inspections'),
    }
  }

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

async function resolvePwaPlugin(): Promise<PluginOption | null> {
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
        start_url: '/dtj/ind/',
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
  const pwaPlugin = await resolvePwaPlugin()

  const plugins: PluginOption[] = [vue(), vueDevTools(), reportsDataPlugin()]
  if (pwaPlugin) plugins.push(pwaPlugin)

  return {
    plugins,
    base: '/dtj/ind/',
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
      proxy: createProxyConfig(env),
    },
  }
})
