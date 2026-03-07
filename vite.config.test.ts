import { defineConfig } from 'vite'

// Simple Vite config for testing
export default defineConfig({
  server: {
    port: 5176,
    open: '/test.html'
  }
})