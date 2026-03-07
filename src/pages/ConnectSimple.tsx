import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ConnectSimple() {
  const navigate = useNavigate();
  const [host, setHost] = useState('');
  
  const handleConnect = () => {
    if (host.trim()) {
      navigate('/dashboard');
    }
  };
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">FRPC Manager</h1>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Host IP</label>
            <input
              type="text"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="192.168.1.100"
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleConnect}
            className="w-full bg-blue-500 text-white p-3 rounded-md hover:bg-blue-600 transition-colors"
          >
            Connect
          </button>
        </div>
      </div>
    </div>
  );
}
