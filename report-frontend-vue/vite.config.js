/* eslint-env node */
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

const proxyPaths = ['/api', '/auth', '/userapi', '/dtj', '/userinfo']

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.VITE_PROXY_TARGET || 'http://localhost:8080'
  const basePath = env.VITE_BASE_PATH || '/'

  const serverProxy = proxyPaths.reduce((acc, prefix) => {
    acc[prefix] = {
      target,
      changeOrigin: true,
      secure: false,
    }
    return acc
  }, {})

  return {
    base: basePath,
    plugins: [vue()],
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
