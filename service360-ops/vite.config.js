import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueDevTools from 'vite-plugin-vue-devtools';
import { VitePWA } from 'vite-plugin-pwa';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig(() => {
  return {
    plugins: [
      vue(),
      vueDevTools(),
      // basicSsl(), // Disabled for HTTP testing
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        includeAssets: ['favicon.ico', 'apple-touch-icon.jpg', 'icon-192x192.png', 'icon-512x512.png'],
        manifest: {
          id: '/dtj/ops/',
          name: 'Service 360 Operations',
          short_name: 'Service 360',
          description: 'Service 360 Operations - система управления заявками и ресурсами',
          theme_color: '#2b6cb0',
          background_color: '#f7fafc',
          display: 'standalone',
          display_override: ['window-controls-overlay', 'standalone'],
          orientation: 'portrait',
          scope: '/dtj/ops/',
          start_url: '/dtj/ops/?source=pwa',
          categories: ['business', 'productivity'],
          prefer_related_applications: false,
          iarc_rating_id: 'e84b072d-71b3-4d3e-86ae-31a8ce4e53b7',
          launch_handler: {
            client_mode: 'navigate-existing'
          },
          shortcuts: [
            {
              name: 'Открыть приложение',
              short_name: 'Главная',
              description: 'Открыть главную страницу',
              url: '/dtj/ops/',
              icons: [{ src: '/dtj/ops/icon-192x192.png', sizes: '192x192' }]
            }
          ],
          icons: [
            {
              src: '/dtj/ops/icon-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/dtj/ops/icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/dtj/ops/icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,jpg,jpeg,ttf}'],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
          navigateFallback: null,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /^https:\/\/api\.openweathermap\.org\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'weather-api-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 10 // 10 minutes
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ]
        },
        devOptions: {
          enabled: true,
          type: 'module',
          navigateFallback: 'index.html'
        }
      })
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      },
    },
    // Base path for production deployment
    base: '/dtj/ops/',

    server: {
      host: process.env.VITE_DEV_SERVER_HOST || '0.0.0.0',
      port: parseInt(process.env.VITE_DEV_SERVER_PORT) || 3000,
      https: false, // Back to HTTP
      proxy: {
        '/auth': {
          target: `http://${process.env.VITE_LOCAL_HOST || '192.168.1.20'}:9180`,
          changeOrigin: true,
          secure: false,
        },

        '/userapi': {
          target: `http://${process.env.VITE_LOCAL_HOST || '192.168.1.20'}:9180/api`,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/userapi/, ''),
          secure: false,
        },

        '/userinfo': {
          target: `http://${process.env.VITE_LOCAL_HOST || '192.168.1.20'}:9179/api`,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/userinfo/, ''),
          secure: false,
        },
      },
    },

    build: {
      outDir: 'dist',
      assetsDir: 'assets',
    },

    preview: {
      host: process.env.VITE_DEV_SERVER_HOST || '0.0.0.0',
      port: parseInt(process.env.VITE_PREVIEW_PORT) || 4173,
      https: false, // Back to HTTP
    },
  };
});
