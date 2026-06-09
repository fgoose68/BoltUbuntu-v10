import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3050,
    allowedHosts: true,
    proxy: {
      '/api': {
        // Inside Docker: use 'backend' (container name)
        // Outside Docker (local dev): use 'localhost:8001'
        target: process.env.VITE_PROXY_TARGET || 'http://backend:8001',
        changeOrigin: true,
      }
    }
  }
})
