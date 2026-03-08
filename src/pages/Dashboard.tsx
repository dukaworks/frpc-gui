import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFrpcStore } from '@/store/frpcStore';
import { ApiClient } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Terminal, FileText, Activity, Server, Box, Eye, Edit3, Save, Play, ArrowLeft, LayoutGrid, Settings, Plus, RotateCw, Power, RefreshCw } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConfigEditor } from '@/components/ConfigEditor';
import { ProxyListOverview } from '@/components/ConfigEditor/ProxyListOverview';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export default function Dashboard() {
  const navigate = useNavigate();
  const { isConnected, processInfo, disconnect, setProcessInfo } = useFrpcStore();
  const [configContent, setConfigContent] = useState('');
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [serviceLoading, setServiceLoading] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  
  // State for manual config mode
  const [manualConfigPath, setManualConfigPath] = useState('/etc/frp/frpc.toml');
  const [manualMode, setManualMode] = useState(false);
  const [manualLoading, setManualLoading] = useState(false);

  useEffect(() => {
    if (!isConnected) {
      navigate('/');
    }
  }, [isConnected, navigate]);

  const loadConfig = async (path?: string) => {
    const targetPath = path || processInfo?.configPath;
    if (!targetPath) return;
    
    setLoadingConfig(true);
    try {
      const res = await ApiClient.getConfig(targetPath);
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
        // Keep config content if manual mode, otherwise clear
        if (!manualMode) setConfigContent('');
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
      setTimeout(handleRescan, 2000);
    } catch (error: any) {
      console.error(error);
      alert(`Failed to control service: ${error.message}`);
    } finally {
      setServiceLoading(false);
    }
  };

  const handleManualLoad = async () => {
    if (!manualConfigPath) return;
    setManualLoading(true);
    try {
      await loadConfig(manualConfigPath);
      setManualMode(true);
    } catch (e: any) {
      alert(`加载失败: ${e.message}`);
    } finally {
      setManualLoading(false);
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

  // Not connected to process but maybe want to edit config manually?
  if (!processInfo) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-4xl mx-auto">
          <header className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
               <Tooltip>
                 <TooltipTrigger asChild>
                   <Button variant="ghost" size="icon" onClick={handleLogout} className="-ml-2">
                      <ArrowLeft className="h-5 w-5" />
                   </Button>
                 </TooltipTrigger>
                 <TooltipContent>Back to Connect</TooltipContent>
               </Tooltip>
               <h1 className="text-2xl font-bold">FRPC Manager Dashboard</h1>
            </div>
            <div className="flex gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={handleRescan} disabled={scanLoading} className="rounded-full">
                    {scanLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5 text-muted-foreground hover:text-primary" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Rescan Service</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={handleLogout} className="rounded-full">
                      <Power className="h-5 w-5 text-muted-foreground hover:text-destructive" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Disconnect</TooltipContent>
              </Tooltip>
            </div>
          </header>

          <Card className="mb-6 border-amber-200 bg-amber-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-amber-800 flex items-center gap-2 text-lg">
                <Activity className="h-5 w-5" />
                未检测到正在运行的 frpc
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-amber-800/80">
                已建立 SSH 会话，但扫描未发现 frpc 进程。
                <br/>
                可能是服务未启动，或者配置文件错误导致启动失败。
              </p>
            </CardContent>
          </Card>

          {/* Manual Config Loader */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">手动加载配置</CardTitle>
              <CardDescription>
                如果 frpc 因配置错误无法启动，请在此处指定配置文件路径进行修复。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 items-end">
                <div className="grid w-full max-w-sm items-center gap-1.5">
                  <Label htmlFor="config-path">配置文件路径</Label>
                  <Input 
                    id="config-path" 
                    value={manualConfigPath} 
                    onChange={(e) => setManualConfigPath(e.target.value)} 
                    placeholder="/etc/frp/frpc.toml" 
                  />
                </div>
                <Button onClick={handleManualLoad} disabled={manualLoading} variant="outline">
                  {manualLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
                  加载配置
                </Button>
              </div>
            </CardContent>
          </Card>

          {manualMode && configContent && (
             <Card className="h-[600px] flex flex-col">
                <CardHeader className="pb-2 border-b">
                   <CardTitle className="text-base flex justify-between items-center">
                      <span>配置编辑器: {manualConfigPath}</span>
                      <Button size="sm" variant="secondary" onClick={() => setManualMode(false)}>关闭编辑器</Button>
                   </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 p-0 overflow-hidden">
                    <ConfigEditor 
                        initialContent={configContent} 
                        path={manualConfigPath}
                        onSave={() => alert('保存成功！请尝试在终端手动重启服务，或点击 Rescan 检查状态。')} 
                    />
                </CardContent>
             </Card>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">FRPC Manager Dashboard</h1>
            <div className="space-x-2">
                <Button variant="ghost" size="icon" onClick={handleLogout} className="rounded-full">
                    <Power className="h-5 w-5 text-muted-foreground hover:text-destructive" />
                </Button>
            </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
      <Card className="h-full border-none shadow-none bg-transparent">
          <CardContent className="p-0">
            {loadingConfig ? (
              <div className="flex items-center justify-center h-32 bg-white rounded-lg shadow">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <Tabs defaultValue="proxies" className="w-full">
                <div className="flex items-center justify-between mb-4">
                    <TabsList>
                      <TabsTrigger value="proxies">
                          <LayoutGrid className="h-4 w-4 mr-2" />
                          Proxies
                      </TabsTrigger>
                      <TabsTrigger value="edit">
                          <Settings className="h-4 w-4 mr-2" />
                          Server Settings
                      </TabsTrigger>
                    </TabsList>
                </div>
                
                <TabsContent value="proxies" className="mt-0">
                    <div className="space-y-6">
                        <div className="flex items-center justify-end gap-2">
                             <Button size="sm" variant="outline" className="h-8">
                                <Plus className="h-3.5 w-3.5 mr-1" />
                                Add Proxy
                             </Button>
                             <Button size="sm" variant="outline" className="h-8" onClick={() => handleServiceAction('restart')} disabled={true}>
                                {serviceLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <RotateCw className="h-3.5 w-3.5 mr-1" />}
                                Restart Service
                             </Button>
                        </div>
                        <ProxyListOverview content={configContent} />
                    </div>
                </TabsContent>
                
                <TabsContent value="edit" className="mt-0">
                    {processInfo?.configPath && (
                        <ConfigEditor 
                            initialContent={configContent} 
                            path={processInfo.configPath}
                            defaultTab="server"
                            hideTabs={true}
                            onSave={() => handleServiceAction('restart')} 
                        />
                    )}
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
