import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

// Fixed Vite config - clean and simple
export default defineConfig({
  define: {
    global: 'globalThis',
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5182,
    open: '/index-fix.html'
  }
})
