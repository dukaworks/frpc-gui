import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

// Minimal components to test basic functionality
function Home() {
  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h1>🎉 FRPC Manager - Minimal Test</h1>
      <p>React is working correctly!</p>
      <div style={{ marginTop: '20px' }}>
        <button 
          onClick={() => alert('✅ Button clicked!')}
          style={{
            padding: '10px 20px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Test Button
        </button>
      </div>
    </div>
  )
}

function Dashboard() {
  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h1>📊 Dashboard</h1>
      <p>Dashboard component loaded successfully!</p>
      <button 
        onClick={() => window.location.href = '/'} 
        style={{
          padding: '10px 20px',
          background: '#28a745',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer'
        }}
      >
        Back to Home
      </button>
    </div>
  )
}

export default function AppMinimal() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  )
}