import { defineConfig } from 'vite'

// Minimal Vite config - just serve static files without React processing
export default defineConfig({
  server: {
    port: 5180,
    open: '/test-minimal-react.html'
  }
})