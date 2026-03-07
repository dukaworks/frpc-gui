import React from 'react'
import { createRoot } from 'react-dom/client'
import AppSimple from './App-simple'

console.log('🚀 Starting simple React test...')

const rootElement = document.getElementById('root')
console.log('Root element found:', rootElement)

if (rootElement) {
  console.log('Creating React root...')
  const root = createRoot(rootElement)
  console.log('Rendering simple app...')
  root.render(<AppSimple />)
  console.log('✅ Simple React app rendered successfully')
} else {
  console.error('❌ Root element not found!')
}