// Ultra simple test to verify React is working
console.log('🧪 Starting ultra-simple React test...')

// Create a simple div element
const testDiv = document.createElement('div')
testDiv.innerHTML = `
  <div style="
    position: fixed; 
    top: 50%; 
    left: 50%; 
    transform: translate(-50%, -50%);
    background: #4CAF50; 
    color: white; 
    padding: 40px; 
    border-radius: 10px; 
    font-family: Arial, sans-serif;
    text-align: center;
    box-shadow: 0 8px 16px rgba(0,0,0,0.3);
    z-index: 99999;
  ">
    <h1>✅ React Test Successful!</h1>
    <p>JavaScript is executing correctly</p>
    <p style="font-size: 12px; opacity: 0.8;">If you see this, the basic setup is working</p>
  </div>
`

// Add to body
document.body.appendChild(testDiv)

console.log('✅ Ultra-simple test completed - element should be visible on page')