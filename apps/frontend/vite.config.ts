import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Forward all /api requests in dev mode to the Hono backend on 3002
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
    },
  },
})