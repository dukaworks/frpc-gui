import { defineConfig } from 'vite'

// Ultra simple Vite config - just serve static files
export default defineConfig({
  server: {
    port: 5179,
    open: '/test-ultra-simple.html'
  }
})