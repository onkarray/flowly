import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/fetch': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        configure: (_proxy, _options) => {
          // Start a lightweight local proxy server for dev
          import('./dev-proxy.js').catch(() => {})
        },
      },
    },
  },
})
