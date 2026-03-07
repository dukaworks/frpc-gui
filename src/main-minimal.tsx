import React from 'react'
import { createRoot } from 'react-dom/client'
import AppMinimal from './App-minimal'

console.log('🚀 Starting minimal React test...')

const rootElement = document.getElementById('root')
console.log('Root element found:', rootElement)

if (rootElement) {
  console.log('Creating React root...')
  const root = createRoot(rootElement)
  console.log('Rendering minimal app...')
  root.render(<AppMinimal />)
  console.log('✅ Minimal React app rendered successfully')
} else {
  console.error('❌ Root element not found!')
}