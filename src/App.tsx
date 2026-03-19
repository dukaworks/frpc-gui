import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Connect from './pages/Connect';
import ConnectSimple from './pages/ConnectSimple';
import Dashboard from './pages/Dashboard';
import LocalPage from './pages/LocalPage';
import FrpsOverview from './pages/FrpsOverview';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Footer } from '@/components/Footer';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';

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

/**
 * Detect GUI mode at app startup.
 * Frontend calls the backend /api/mode endpoint so the Docker image
 * works in both Local and SSH Remote modes without rebuilding.
 */
async function detectMode(): Promise<'local' | 'remote'> {
  try {
    const res = await fetch('/api/mode');
    if (res.ok) {
      const data = await res.json() as { mode: 'local' | 'remote' };
      return data.mode;
    }
  } catch {
    // fetch failed, fall through
  }
  return (import.meta as { env: { VITE_FRPC_GUI_MODE?: string } }).env.VITE_FRPC_GUI_MODE === 'local'
    ? 'local'
    : 'remote';
}

function App() {
  const [mode, setMode] = useState<'local' | 'remote' | 'loading'>('loading');
  useTheme(); // Ensure dark class is on <html> before routes render

  useEffect(() => {
    detectMode().then(setMode);
  }, []);

  if (mode === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-muted-foreground text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <ErrorBoundary>
        <BrowserRouter>
          <div className="flex min-h-screen flex-col">
            <div className="flex-1">
              <Routes>
                {/*
                  Local Mode: /local renders LocalPage (no SSH, no sessionId, no zustand store)
                  SSH Mode: / renders Connect → Dashboard (unchanged)
                */}
                <Route path="/local" element={mode === 'local' ? <LocalPage /> : <Navigate to="/" replace />} />
                <Route path="/" element={mode === 'remote' ? <Connect /> : <Navigate to="/local" replace />} />
                <Route path="/simple" element={<ConnectSimple />} />
                <Route path="/dashboard" element={mode === 'remote' ? <Dashboard /> : <Navigate to="/local" replace />} />
                <Route path="/frps" element={<FrpsOverview />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
            <Footer />
          </div>
        </BrowserRouter>
      </ErrorBoundary>
    </TooltipProvider>
  );
}

export default App;
