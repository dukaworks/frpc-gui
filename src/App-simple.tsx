import React from 'react'

function AppSimple() {
  console.log('AppSimple component rendering...')
  
  return (
    <div style={{ 
      padding: '40px', 
      background: '#f0f8ff', 
      border: '3px solid #4CAF50',
      margin: '20px',
      borderRadius: '10px',
      textAlign: 'center'
    }}>
      <h1>🎯 React App Loaded Successfully!</h1>
      <p style={{ fontSize: '18px', color: '#333' }}>
        If you see this, React is working correctly.
      </p>
      <div style={{ marginTop: '20px' }}>
        <button 
          onClick={() => alert('Button clicked!')} 
          style={{ 
            padding: '10px 20px', 
            background: '#4CAF50', 
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

export default AppSimple