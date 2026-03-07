export default function Test() {
  console.log('Test component rendering...');
  
  return (
    <div style={{ 
      padding: '20px', 
      background: '#f0f0f0', 
      border: '2px solid #ccc',
      margin: '20px',
      borderRadius: '8px'
    }}>
      <h1>🎯 Test Component Loaded!</h1>
      <p>If you see this, React is working correctly.</p>
      <div style={{ marginTop: '20px', padding: '10px', background: '#e8f5e8', borderRadius: '4px' }}>
        <strong>✅ Success Indicators:</strong>
        <ul>
          <li>React components are rendering</li>
          <li>CSS styles are applied</li>
          <li>JavaScript is executing</li>
        </ul>
      </div>
    </div>
  );
}