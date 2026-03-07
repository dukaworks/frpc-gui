import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFrpcStore } from '@/store/frpcStore';
import { ApiClient } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Terminal, FileText, Activity, Server, Box } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConfigEditor } from '@/components/ConfigEditor';

export default function Dashboard() {
  const navigate = useNavigate();
  const { isConnected, processInfo, disconnect, setProcessInfo } = useFrpcStore();
  const [configContent, setConfigContent] = useState('');
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [serviceLoading, setServiceLoading] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);

  useEffect(() => {
    if (!isConnected) {
      navigate('/');
    }
  }, [isConnected, navigate]);

  const loadConfig = async () => {
    if (!processInfo?.configPath) return;
    setLoadingConfig(true);
    try {
      const res = await ApiClient.getConfig(processInfo.configPath);
      setConfigContent(res.content);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingConfig(false);
    }
  };

  useEffect(() => {
    if (processInfo?.configPath) {
      loadConfig();
    }
  }, [processInfo]);

  const handleLogout = () => {
    disconnect();
    navigate('/');
  };

  const handleRescan = async () => {
    setScanLoading(true);
    try {
      const res = await ApiClient.scan();
      setProcessInfo(res.process ?? null);
      if (!res.process?.configPath) {
        setConfigContent('');
      }
    } catch (error: any) {
      console.error(error);
      alert(error.message || 'Scan failed');
    } finally {
      setScanLoading(false);
    }
  };

  const handleServiceAction = async (action: string) => {
    if (!processInfo?.source || !processInfo?.serviceName) {
        alert('Cannot control service: Source or Service Name unknown');
        return;
    }
    
    setServiceLoading(true);
    try {
      await ApiClient.serviceControl(action, processInfo.source, processInfo.serviceName, processInfo.requiresSudo);
      // Ideally re-scan status
      alert(`Service ${action} command sent successfully`);
    } catch (error: any) {
      console.error(error);
      alert(`Failed to control service: ${error.message}`);
    } finally {
      setServiceLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-6">
          <h1 className="text-xl font-bold mb-2">未连接到 FRPC</h1>
          <p className="text-sm text-gray-600 mb-4">请先在首页建立连接，再进入 Dashboard。</p>
          <div className="flex gap-3">
            <button
              className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => navigate('/')}
            >
              返回首页
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!processInfo) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">FRPC Manager Dashboard</h1>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleRescan} disabled={scanLoading}>
                {scanLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Rescan'}
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout}>Disconnect</Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>未检测到正在运行的 frpc</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                已建立 SSH 会话，但扫描未发现 frpc（Docker / systemd / 进程）。你可以点击 Rescan 重新扫描。
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">FRPC Manager Dashboard</h1>
        <div className="space-x-2">
            <Button variant="outline" size="sm" onClick={() => handleServiceAction('restart')} disabled={serviceLoading}>
                {serviceLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Restart Service'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>Disconnect</Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Status Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Service Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {processInfo?.status || 'Unknown'}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              {processInfo?.source === 'docker' ? <Box className="h-3 w-3" /> : <Server className="h-3 w-3" />}
              {processInfo?.source ? `via ${processInfo.source}` : ''} 
              {processInfo?.pid ? ` (PID/ID: ${processInfo.pid.substring(0, 12)})` : ''}
            </p>
          </CardContent>
        </Card>

        {/* Config Path Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Config File</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium break-all">
              {processInfo?.configPath || 'Not detected'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {processInfo?.configPath ? 'Found via process args' : 'Try manual selection'}
            </p>
          </CardContent>
        </Card>
        
        {/* Service Info */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">Service Info</CardTitle>
             <Terminal className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             <div className="text-sm font-medium break-all">
                 {processInfo?.serviceName || 'N/A'}
             </div>
             <p className="text-xs text-muted-foreground mt-1">
                 {processInfo?.command ? `Command: ${processInfo.command.substring(0, 30)}...` : 'Service Name'}
             </p>
          </CardContent>
        </Card>

      </div>

      {/* Config Section */}
      <Card className="h-full">
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingConfig ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <Tabs defaultValue="preview" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                  <TabsTrigger value="edit">Edit</TabsTrigger>
                </TabsList>
                <TabsContent value="preview">
                    <pre className="bg-slate-950 text-slate-50 p-4 rounded-md overflow-auto max-h-[600px] text-sm font-mono">
                        {configContent || 'No configuration loaded'}
                    </pre>
                </TabsContent>
                <TabsContent value="edit">
                    {processInfo?.configPath && (
                        <ConfigEditor 
                            initialContent={configContent} 
                            path={processInfo.configPath}
                            onSave={() => handleServiceAction('restart')} 
                        />
                    )}
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
    </div>
  );
}
