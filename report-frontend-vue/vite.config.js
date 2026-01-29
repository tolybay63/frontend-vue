/* eslint-env node */
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

const proxyPaths = ['/api', '/auth', '/userapi', '/dtj', '/userinfo', '/batch']

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.VITE_PROXY_TARGET || 'http://localhost:8080'
  const reportTarget =
    env.VITE_REPORT_BACKEND_TARGET || 'http://127.0.0.1:8000'
  const basePath = env.VITE_BASE_PATH || '/'

  const serverProxy = {
    '/api/report-fast': {
      target: reportTarget,
      changeOrigin: true,
      secure: false,
      rewrite: (path) => path.replace(/^\/api\/report-fast/, ''),
    },
    ...proxyPaths.reduce((acc, prefix) => {
      acc[prefix] = {
        target,
        changeOrigin: true,
        secure: false,
      }
      return acc
    }, {}),
  }

  return {
    base: basePath,
    plugins: [vue()],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return

            if (id.includes('node_modules/vue-router/')) return 'vue-router'
            if (id.includes('node_modules/pinia/')) return 'pinia'
            if (
              id.includes('node_modules/vue/') ||
              id.includes('node_modules/@vue/')
            ) {
              return 'vue-core'
            }
            if (id.includes('node_modules/naive-ui/')) return 'naive-ui'
            if (
              id.includes('node_modules/chart.js/') ||
              id.includes('node_modules/vue-chartjs/')
            ) {
              return 'charts'
            }
            if (id.includes('node_modules/axios/')) return 'axios'

            return 'vendor'
          },
        },
      },
    },
    server: {
      port: 5173,
      host: true,
      proxy: serverProxy,
    },
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
  }
})
