import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/events':         'http://127.0.0.1:3333',
      '/api':            'http://127.0.0.1:3333'
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        dashboard: resolve(__dirname, 'dashboard.html'),
        overlay:   resolve(__dirname, 'overlay.html'),
        control:   resolve(__dirname, 'control.html')
      }
    }
  }
})
