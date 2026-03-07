import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Simple Vite config for React testing
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5178,
    open: '/index-simple.html'
  }
})