import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueDevTools from 'vite-plugin-vue-devtools';

export default defineConfig(() => {
  return {
    plugins: [
      vue(),
      vueDevTools(),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      },
    },
    // Base path for production deployment
    base: '/dtj/org/',

    server: {
      host: process.env.VITE_DEV_SERVER_HOST || '0.0.0.0',
      port: parseInt(process.env.VITE_DEV_SERVER_PORT) || 3000,
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
  };
});