import { defineConfig } from 'vite'

// Basic Vite config for testing
export default defineConfig({
  server: {
    port: 5177,
    open: '/test-basic.html'
  }
})