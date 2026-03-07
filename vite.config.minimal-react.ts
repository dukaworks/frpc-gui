import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Minimal React Vite config
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5181,
    open: '/index-minimal.html'
  }
})