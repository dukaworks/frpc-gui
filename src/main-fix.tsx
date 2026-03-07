import React from 'react'
import { createRoot } from 'react-dom/client'
import AppFix from './App-fix'

console.log('🚀 Starting FRPC Manager - Fixed Version...')

const rootElement = document.getElementById('root')
console.log('Root element found:', rootElement)

if (rootElement) {
  console.log('Creating React root...')
  const root = createRoot(rootElement)
  console.log('Rendering fixed app...')
  root.render(<AppFix />)
  console.log('✅ Fixed React app rendered successfully')
} else {
  console.error('❌ Root element not found!')
}