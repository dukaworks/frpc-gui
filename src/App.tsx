import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Connect from './pages/Connect';
import ConnectSimple from './pages/ConnectSimple';
import Dashboard from './pages/Dashboard';
import { TooltipProvider } from '@/components/ui/tooltip';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error?: Error }
> {
  state: { error?: Error } = {};

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('App ErrorBoundary caught:', error);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          background: '#0b1220',
          color: '#fff',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
        }}>
          <div style={{
            maxWidth: 900,
            width: '100%',
            background: '#111827',
            border: '1px solid rgba(255,255,255,.1)',
            borderRadius: 12,
            padding: 20,
            boxShadow: '0 10px 30px rgba(0,0,0,.35)'
          }}>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 10 }}>页面渲染异常</div>
            <div style={{ fontSize: 13, opacity: .95, lineHeight: 1.6, marginBottom: 12 }}>{this.state.error.message}</div>
            <pre style={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontSize: 12,
              lineHeight: 1.5,
              background: '#0b1220',
              padding: 12,
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,.08)',
              maxHeight: '55vh',
              overflow: 'auto'
            }}>{this.state.error.stack}</pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  return (
    <TooltipProvider>
      <ErrorBoundary>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Connect />} />
            <Route path="/simple" element={<ConnectSimple />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ErrorBoundary>
    </TooltipProvider>
  );
}

export default App;
