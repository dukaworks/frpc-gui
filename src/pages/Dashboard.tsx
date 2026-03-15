import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '@/store/userStore';
import { useFrpcStore } from '@/store/frpcStore';
import { ApiClient } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Terminal, FileText, Activity, Server, Edit3, ArrowLeft, LayoutGrid, Settings, Plus, RotateCw, Power, RefreshCw, CheckSquare, Trash2, Globe, Lock, BarChart, Download, Upload, ChevronLeft, ChevronRight } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConfigEditor } from '@/components/ConfigEditor';
import { ProxyListOverview } from '@/components/ConfigEditor/ProxyListOverview';
import { ServerListOverview } from '@/components/ConfigEditor/ServerListOverview';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useFrpcConfig } from '@/hooks/useFrpcConfig';
import { ProxyEditDialog } from '@/components/ConfigEditor/ProxyEditDialog';
import { SshEditDialog } from '@/components/ConfigEditor/SshEditDialog';
import { ServerEditDialog } from '@/components/ConfigEditor/ServerEditDialog';
import { ProxyConfig, SSHConfig, ServerProfile } from '@/shared/types';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/store/settingsStore';
import { useServerProfileStore } from '@/store/serverProfileStore';
import { SettingsDialog } from '@/components/SettingsDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function UptimeDisplay({ startTimestamp }: { startTimestamp: number }) {
  const { t } = useTranslation();
  const [uptime, setUptime] = useState('');

  useEffect(() => {
    const update = () => {
        const now = Date.now();
        const diff = Math.floor((now - startTimestamp) / 1000);
        
        if (diff < 0) {
            setUptime(t('dashboard.starting'));
            return;
        }

        const upPrefix = t('dashboard.up');
        const secondsUnit = t('dashboard.seconds');
        const minutesUnit = t('dashboard.minutes');
        const hoursUnit = t('dashboard.hours');
        const daysUnit = t('dashboard.days');

        if (diff < 60) {
            setUptime(`${upPrefix} ${diff} ${secondsUnit}`);
        } else if (diff < 3600) {
            setUptime(`${upPrefix} ${Math.floor(diff / 60)} ${minutesUnit}`);
        } else if (diff < 86400) {
            const hrs = Math.floor(diff / 3600);
            const mins = Math.floor((diff % 3600) / 60);
            setUptime(`${upPrefix} ${hrs} ${hoursUnit}, ${mins} ${minutesUnit}`);
        } else {
            const days = Math.floor(diff / 86400);
            const hrs = Math.floor((diff % 86400) / 3600);
            setUptime(`${upPrefix} ${days} ${daysUnit}, ${hrs} ${hoursUnit}`);
        }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startTimestamp, t]);

  return <span className="truncate">{uptime}</span>;
}

export default function Dashboard() {
  const { t } = useTranslation();
  const { frpsDashboardUrl, serverPageSize } = useSettingsStore();
  const { profiles: serverProfiles, saveProfile: saveServerProfile, removeProfile: removeServerProfile } = useServerProfileStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const navigate = useNavigate();
  const { isConnected, processInfo, disconnect, setProcessInfo, restartRequired, setRestartRequired } = useFrpcStore();
  const { savedConnections, addConnection, updateConnection, removeConnection } = useUserStore();
  const [configContent, setConfigContent] = useState('');
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [serviceLoading, setServiceLoading] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualConfigPath, setManualConfigPath] = useState('/etc/frp/frpc.toml');
  const [manualLoading, setManualLoading] = useState(false);
  
  // Feedback Dialog State
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'success' | 'error'>('success');
  const [feedbackMessage, setFeedbackMessage] = useState('');

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedbackType(type);
    setFeedbackMessage(message);
    setFeedbackOpen(true);
  };
  
  // State for manual config mode
  const [logs, setLogs] = useState<string>('');
  const [logsLoading, setLogsLoading] = useState(false);
  const [statusLogs, setStatusLogs] = useState<string>('');
  
  const cleanAnsi = (raw: string) => {
    const esc = '\u001b';
    const csi = '\u009b';
    let out = '';

    for (let i = 0; i < raw.length; i += 1) {
      const ch = raw[i];
      if (ch === esc || ch === csi) {
        i += 1;
        while (i < raw.length) {
          const code = raw.charCodeAt(i);
          if (code >= 0x40 && code <= 0x7e) break;
          i += 1;
        }
        continue;
      }
      out += ch;
    }

    return out;
  };

  const fetchLogs = async () => {
    // Ensure we are connected before fetching
    if (!isConnected || !processInfo?.serviceName || !processInfo?.source) return;
    
    setLogsLoading(true);
    try {
      const [recentRes, statusRes] = await Promise.all([
        ApiClient.fetchLogs(processInfo.source, processInfo.serviceName, { lines: 80 }),
        ApiClient.fetchLogs(processInfo.source, processInfo.serviceName, { lines: 2000, sinceHours: 2 })
      ]);
      const cleanLogs = cleanAnsi(recentRes.logs || '');
      const cleanStatusLogs = cleanAnsi(statusRes.logs || '');
      setLogs(cleanLogs || t('dashboard.noLogsAvailable'));
      setStatusLogs(cleanStatusLogs);
    } catch (e: unknown) {
      console.error("Failed to fetch logs", e);
      const message = e instanceof Error ? e.message : '';
      if (message === 'Not connected' || message.includes('Not connected')) {
          disconnect();
          navigate('/');
      }
    } finally {
      setLogsLoading(false);
    }
  };

  // Auto-fetch logs when connected
  useEffect(() => {
    if (isConnected && processInfo?.serviceName && processInfo?.source) {
      fetchLogs();
      // Optional: Poll every 10s
      const interval = setInterval(fetchLogs, 10000);
      
      return () => {
        clearInterval(interval);
      };
    }
  }, [isConnected, processInfo?.serviceName, processInfo?.source]);

  // Hook for CRUD operations
  const { 
    content: hookContent, 
    proxies, 
    commonConfig,
    parseError, 
    addProxy: hookAddProxy, 
    updateProxy: hookUpdateProxy, 
    deleteProxy: hookDeleteProxy,
    importProxies: hookImportProxies,
    updateCommon,
    generateToml 
  } = useFrpcConfig(configContent);

  const [sshEditDialogOpen, setSshEditDialogOpen] = useState(false);
  const [editingSshProfile, setEditingSshProfile] = useState<SSHConfig | null>(null);
  const [serverEditDialogOpen, setServerEditDialogOpen] = useState(false);
  const [editingServerProfile, setEditingServerProfile] = useState<ServerProfile | null>(null);

  const handleAddSshConnection = () => {
    setEditingSshProfile(null);
    setSshEditDialogOpen(true);
  };

  const handleEditSshConnection = (data: SSHConfig) => {
    setEditingSshProfile(data);
    setSshEditDialogOpen(true);
  };

  const handleSaveSshConnection = (data: SSHConfig) => {
    if (data.id) {
      updateConnection(data.id, data);
    } else {
      addConnection({
        name: data.name,
        host: data.host,
        port: data.port,
        username: data.username,
        password: data.password,
        privateKey: data.privateKey,
      });
    }
    setSshEditDialogOpen(false);
  };

  const [serverToDelete, setServerToDelete] = useState<string | null>(null);
  const [serverDeleteDialogOpen, setServerDeleteDialogOpen] = useState(false);

  const handleDeleteServer = (id: string) => {
      setServerToDelete(id);
      setServerDeleteDialogOpen(true);
  };

  const confirmDeleteServer = () => {
      if (!serverToDelete) return;
      const id = serverToDelete;
      
      if (id.startsWith('ssh_')) {
        const sshId = id.replace('ssh_', '');
        removeConnection(sshId);
      } else {
        removeServerProfile(id);
      }
      setServerDeleteDialogOpen(false);
      setServerToDelete(null);
  };

  // CRUD States
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedProxies, setSelectedProxies] = useState<Set<string>>(new Set());
  const [sshCurrentPage, setSshCurrentPage] = useState(1);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingProxy, setEditingProxy] = useState<ProxyConfig | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [proxyToDelete, setProxyToDelete] = useState<string | null>(null); // For single delete
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);

  const effectiveServerPageSize = Math.max(1, serverPageSize);
  const sshTotalPages = Math.max(1, Math.ceil(savedConnections.length / effectiveServerPageSize));

  useEffect(() => {
    setSshCurrentPage((p) => Math.min(p, sshTotalPages));
  }, [sshTotalPages]);

  const sshStartIndex = (sshCurrentPage - 1) * effectiveServerPageSize;
  const paginatedSshConnections = savedConnections.slice(sshStartIndex, sshStartIndex + effectiveServerPageSize);

  const existingNames = useMemo(() => new Set(proxies.map(p => p.name)), [proxies]);

  useEffect(() => {
    if (!isConnected) {
      navigate('/');
    }
  }, [isConnected, navigate]);

  const loadConfig = async (path?: string) => {
    const targetPath = path || processInfo?.configPath;
    if (!targetPath || !isConnected) return;
    
    setLoadingConfig(true);
    try {
      const res = await ApiClient.getConfig(targetPath);
      setConfigContent(res.content);
    } catch (error: unknown) {
      console.error(error);
      const message = error instanceof Error ? error.message : '';
      if (message === 'Not connected' || message.includes('Not connected')) {
          disconnect();
          navigate('/');
      }
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
    } catch (error: unknown) {
      console.error(error);
      alert(error instanceof Error ? error.message : 'Scan failed');
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
      showFeedback('success', `Service ${action} command sent successfully`);
      if (action === 'restart') {
        setRestartRequired(false);
      }
      setTimeout(handleRescan, 2000);
    } catch (error: unknown) {
      console.error(error);
      showFeedback('error', `Failed to control service: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    } catch (e: unknown) {
        alert(e instanceof Error ? e.message : 'Load failed');
    } finally {
        setManualLoading(false);
    }
  };

  // Helper to save config to disk
  const saveToDisk = async () => {
    const path = processInfo?.configPath;
    if (!path) {
      alert("No config path found!");
      return;
    }
    const newContent = generateToml();
    try {
      await ApiClient.saveConfig(path, newContent);
      setConfigContent(newContent); // Update local state to reflect saved content (and re-init hook)
    } catch (e: unknown) {
      alert(`Save failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  // CRUD Handlers
  const handleToggleSelection = (name: string) => {
    setSelectedProxies(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleAddProxy = () => {
    setEditingProxy(null);
    setEditDialogOpen(true);
  };

  const handleEditProxy = (proxy: ProxyConfig) => {
    setEditingProxy(proxy);
    setEditDialogOpen(true);
  };

  const handleExportProxies = async () => {
    try {
      const dataStr = JSON.stringify(proxies, null, 2);
      const filename = `proxies_${new Date().toISOString().slice(0, 10)}.json`;

      // Try File System Access API (Show Save File Picker)
      // This allows the user to choose where to save the file
      type FileHandleLike = { createWritable(): Promise<{ write(data: string): Promise<void>; close(): Promise<void> }> };
      type ShowSaveFilePickerLike = (options: unknown) => Promise<FileHandleLike>;
      const showSaveFilePicker = (window as unknown as { showSaveFilePicker?: ShowSaveFilePickerLike }).showSaveFilePicker;

      if (showSaveFilePicker) {
        try {
          const handle = await showSaveFilePicker({
            suggestedName: filename,
            types: [{
              description: 'JSON Files',
              accept: { 'application/json': ['.json'] },
            }],
          });
          const writable = await handle.createWritable();
          await writable.write(dataStr);
          await writable.close();
          showFeedback('success', t('dashboard.exportSuccess'));
          return;
        } catch (err: unknown) {
          // If user cancelled, just return
          if (err && typeof err === 'object' && 'name' in err && err.name === 'AbortError') return;
          // If other error, fall back to legacy download
          console.warn('File picker failed, falling back to download', err);
        }
      }

      // Fallback: Legacy download method
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showFeedback('success', t('dashboard.exportSuccess'));
    } catch {
      showFeedback('error', t('dashboard.exportError'));
    }
  };

  const handleImportProxies = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
            const count = hookImportProxies(json);
            showFeedback('success', t('dashboard.importedSuccess', { count }));
            triggerSave();
            setRestartRequired(true);
        } else {
            showFeedback('error', t('dashboard.importError'));
        }
      } catch {
        showFeedback('error', t('dashboard.importError'));
      }
      // Reset input
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const handleSaveProxy = async (data: ProxyConfig) => {
    if (editingProxy) {
      // Update
      hookUpdateProxy(editingProxy.name, data);
    } else {
      // Add
      hookAddProxy(data);
    }
    setEditDialogOpen(false);
    triggerSave();
    setRestartRequired(true);
  };
  
  const handleDeleteSingle = (name: string) => {
    setProxyToDelete(name);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteSingle = async () => {
    if (proxyToDelete) {
      hookDeleteProxy(proxyToDelete);
      setDeleteDialogOpen(false);
      setProxyToDelete(null);
      triggerSave();
      setRestartRequired(true);
    }
  };

  const handleDeleteBatch = () => {
    setBatchDeleteDialogOpen(true);
  };

  const confirmDeleteBatch = async () => {
    // We need deleteProxies in hook or loop
    // hookDeleteProxy only takes one name.
    // We can iterate.
    selectedProxies.forEach(name => hookDeleteProxy(name));
    setSelectedProxies(new Set());
    setSelectionMode(false);
    setBatchDeleteDialogOpen(false);
    triggerSave();
    setRestartRequired(true);
  };

  const [savePending, setSavePending] = useState(false);
  
  useEffect(() => {
      if (savePending) {
          saveToDisk();
          setSavePending(false);
      }
  }, [proxies, commonConfig, savePending]);

  const triggerSave = () => setSavePending(true);

  if (!isConnected) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">{t('common.loading')}</span>
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
               <h1 className="text-2xl font-bold text-purple-600 dark:text-purple-400">Frpc Manager Dashboard</h1>
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

          <Card className="mb-6 border-amber-500/30 bg-card dark:border-amber-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-foreground flex items-center gap-2 text-lg">
                <Activity className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                未检测到正在运行的 frpc
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
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

  const openExternalUrl = (url: string) => {
    if (!url) return;
    if (window.electron?.openExternal) {
      void window.electron.openExternal(url);
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-purple-600 dark:text-purple-400">{t('dashboard.title')}</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (frpsDashboardUrl) {
                  openExternalUrl(frpsDashboardUrl);
                  return;
                }
                showFeedback('error', t('dashboard.frpsUrlNotSet'));
                setSettingsOpen(true);
              }}
              className={frpsDashboardUrl ? "text-muted-foreground hover:bg-primary hover:text-primary-foreground" : "text-muted-foreground/60 hover:bg-primary hover:text-primary-foreground"}
              title={t('dashboard.openFrpsServer')}
            >
              <BarChart className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">{t('dashboard.openFrpsServer')}</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSettingsOpen(true)}
              className="text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
              title={t('common.settings')}
            >
              <Settings className="h-5 w-5" />
            </Button>
            <Button 
              size="sm" 
              onClick={handleLogout}
              className="text-primary border border-primary hover:bg-primary hover:text-primary-foreground bg-transparent"
            >
              <Power className="mr-2 h-4 w-4" />
              {t('common.logout')}
            </Button>
          </div>
        </div>
      </header>
      <div className="container py-6 space-y-6">

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Health & Uptime */}
        <Card className="flex flex-col h-64">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.serviceHealth')}</CardTitle>
            <div className={`flex items-center gap-2`}>
                <span className="text-xs text-muted-foreground font-mono">{processInfo?.version ? `v${processInfo.version}` : ''}</span>
                <div className={`h-2.5 w-2.5 rounded-full ${processInfo?.status === 'running' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center">
             <div className="space-y-4">
                <div>
                    <div className="text-3xl font-bold text-foreground capitalize">
                        {processInfo?.status || t('dashboard.unknown')}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        {t('dashboard.currentStatus')}
                    </p>
                </div>
                
                <div className="pt-4 border-t">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <Activity className="h-4 w-4 text-muted-foreground shrink-0" />
                        {processInfo?.startTimestamp ? (
                            <UptimeDisplay startTimestamp={processInfo.startTimestamp} />
                        ) : (
                            <span className="truncate">{processInfo?.uptime || 'N/A'}</span>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 pl-6">
                        {t('dashboard.uptimeSince')}
                    </p>
                </div>
             </div>
          </CardContent>
        </Card>

        {/* Card 2: Connection Topology */}
        <Card className="flex flex-col h-64">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.connectionInfo')}</CardTitle>
            {frpsDashboardUrl ? (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 text-muted-foreground hover:text-primary cursor-pointer" 
                onClick={() => openExternalUrl(frpsDashboardUrl)}
                title={t('dashboard.frpsAdmin')}
              >
                <Globe className="h-4 w-4" />
              </Button>
            ) : (
              <Globe className="h-4 w-4 text-muted-foreground/50" />
            )}
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center">
             <div className="space-y-4">
                <div>
                    <div className="text-2xl font-bold text-foreground break-all">
                        {commonConfig.serverAddr || '127.0.0.1'}
                        <span className="text-lg text-muted-foreground font-normal">:{commonConfig.serverPort || 7000}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        {t('dashboard.activeServerAddress')}
                    </p>
                </div>

                <div className="pt-4 border-t space-y-3">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-2">
                            <Lock className="h-3 w-3" /> {t('dashboard.token')}
                        </span>
                        <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs">
                            {commonConfig.token ? '******' : 'None'}
                        </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-2">
                            <FileText className="h-3 w-3" /> {t('dashboard.config')}
                        </span>
                        <span className="font-mono text-xs truncate max-w-[150px]" title={processInfo?.configPath}>
                            {processInfo?.configPath ? processInfo.configPath.split('/').pop() : t('dashboard.unknown')}
                        </span>
                    </div>
                </div>
             </div>
          </CardContent>
        </Card>
        
        {/* Card 3: Real-time Logs */}
        <Card className="flex flex-col h-64 bg-slate-950 text-slate-50 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-slate-800/50">
             <CardTitle className="text-sm font-medium text-purple-400 flex items-center gap-2">
                <Terminal className="h-4 w-4" />
                {t('dashboard.recentLogs')}
             </CardTitle>
             <Badge variant="outline" className="text-[10px] h-5 border-purple-500/30 text-purple-400">
                 {t('dashboard.live')}
             </Badge>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden relative group bg-black">
             <div className="absolute inset-0 p-4 font-mono text-[11px] overflow-auto scrollbar-purple">
                 {logsLoading && !logs ? (
                     <div className="flex items-center justify-center h-full text-slate-500">
                         <Loader2 className="h-5 w-5 animate-spin mr-2" />
                         {t('dashboard.fetchingLogs')}
                     </div>
                 ) : (
                     <div className="space-y-1">
                         {logs ? logs.split('\n').filter(line => line.trim()).map((line, i) => {
                             // Highlight errors - Changed to Purple-400 for errors to match theme
                             const isError = line.includes('[E]') || line.toLowerCase().includes('error');
                             
                             // Convert UTC timestamp to local time if present
                             // Matches format: 2024/03/10 12:00:00 [I] ...
                             const timestampRegex = /^(\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2})/;
                             const match = line.match(timestampRegex);
                             
                             let displayLine = line;
                             if (match) {
                               const utcTimeStr = match[1];
                               // Treat as UTC by appending 'Z'
                               const utcDate = new Date(utcTimeStr.replace(/\//g, '-') + 'Z');
                               if (!isNaN(utcDate.getTime())) {
                                 const localTimeStr = utcDate.toLocaleString();
                                 displayLine = line.replace(utcTimeStr, localTimeStr);
                               }
                             }

                             return (
                                 <div key={i} className={`whitespace-pre-wrap break-all leading-tight py-0.5 border-b border-white/5 pb-1 ${isError ? 'text-purple-400' : 'text-slate-300'}`}>
                                     {displayLine}
                                 </div>
                             );
                         }) : (
                             <div className="text-slate-500 italic">{t('dashboard.noLogsAvailable')}</div>
                         )}
                     </div>
                 )}
             </div>
             
             {/* Refresh Button */}
             <Button 
                variant="ghost" 
                size="sm" 
                className="absolute bottom-2 right-2 h-7 text-xs bg-slate-900/80 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={fetchLogs}
                disabled={logsLoading}
             >
                <RefreshCw className={`h-3 w-3 mr-1 ${logsLoading ? 'animate-spin' : ''}`} />
                {t('dashboard.refresh')}
             </Button>
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
                          {t('dashboard.proxies')}
                      </TabsTrigger>
                      <TabsTrigger value="servers">
                          <Server className="h-4 w-4 mr-2" />
                          {t('dashboard.serverList')}
                      </TabsTrigger>
                      <TabsTrigger value="edit">
                          <Settings className="h-4 w-4 mr-2" />
                          {t('dashboard.configEditor')}
                      </TabsTrigger>
                      <TabsTrigger value="ssh">
                          <Server className="h-4 w-4 mr-2" />
                          {t('ssh.connectionList')}
                      </TabsTrigger>
                    </TabsList>
                </div>
                
                <TabsContent value="proxies" className="mt-0">
                    <div className="space-y-6">
                        <div className="flex items-center justify-end gap-2">
                             <input
                               type="file"
                               accept=".json"
                               className="hidden"
                               id="import-proxies-input"
                               onChange={handleImportProxies}
                             />
                             <Button size="sm" variant="outline" className="h-8" onClick={() => document.getElementById('import-proxies-input')?.click()} title={t('dashboard.import')}>
                                <Upload className="h-3.5 w-3.5 mr-1" />
                                <span className="hidden sm:inline">{t('dashboard.import')}</span>
                             </Button>
                             <Button size="sm" variant="outline" className="h-8" onClick={handleExportProxies} title={t('dashboard.export')}>
                                <Download className="h-3.5 w-3.5 mr-1" />
                                <span className="hidden sm:inline">{t('dashboard.export')}</span>
                             </Button>
                             <Button size="sm" variant="outline" className="h-8" onClick={handleAddProxy}>
                                <Plus className="h-3.5 w-3.5 mr-1" />
                                {t('dashboard.addProxy')}
                             </Button>

                             {selectionMode ? (
                                <>
                                  <Button 
                                    size="sm" 
                                    variant="destructive" 
                                    className="h-8"
                                    onClick={handleDeleteBatch}
                                    disabled={selectedProxies.size === 0}
                                  >
                                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                                    {t('dashboard.delete')} ({selectedProxies.size})
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-8" onClick={() => {
                                    setSelectionMode(false);
                                    setSelectedProxies(new Set());
                                  }}>
                                    {t('dashboard.cancel')}
                                  </Button>
                                </>
                             ) : (
                               <Button 
                                 size="sm" 
                                 variant="ghost" 
                                 className="h-8"
                                 onClick={() => setSelectionMode(true)}
                               >
                                 <CheckSquare className="h-3.5 w-3.5 mr-1" />
                                 {t('dashboard.select')}
                               </Button>
                             )}
                             
                             <Button size="sm" variant="outline" className="h-8" onClick={() => handleServiceAction('restart')} disabled={serviceLoading || !restartRequired}>
                                {serviceLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <RotateCw className="h-3.5 w-3.5 mr-1" />}
                                {t('dashboard.restartService')}
                             </Button>
                        </div>
                        <ProxyListOverview 
                          proxies={proxies} 
                          parseError={parseError}
                          selectionMode={selectionMode}
                          selectedProxies={selectedProxies}
                          onToggleSelection={handleToggleSelection}
                          onEdit={handleEditProxy}
                          onDelete={handleDeleteSingle}
                          onAdd={handleAddProxy}
                          logs={statusLogs}
                        />
                    </div>
                </TabsContent>
                
                <TabsContent value="edit" className="mt-0">
                    <div className="space-y-6">
                      {processInfo?.configPath && (
                        <ConfigEditor 
                          initialContent={hookContent} 
                          path={processInfo.configPath}
                          defaultTab="server"
                          hideTabs={true}
                          onSave={() => handleServiceAction('restart')}
                          onConfigSaved={() => setRestartRequired(true)} 
                        />
                      )}
                    </div>
                </TabsContent>

                <TabsContent value="servers" className="mt-0">
                  <div className="space-y-6">
                    <div className="flex items-center justify-end">
                      <Button size="sm" className="h-8" onClick={() => {
                        setEditingSshProfile(null);
                        setSshEditDialogOpen(false);
                        setEditingProxy(null);
                        setEditDialogOpen(false);
                        setEditingServerProfile(null);
                        setServerEditDialogOpen(true);
                      }}>
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        {t('dashboard.addServer')}
                      </Button>
                    </div>

                    <ServerListOverview
                      profiles={serverProfiles}
                      activeConfig={commonConfig}
                      onAdd={() => {
                        setEditingServerProfile(null);
                        setServerEditDialogOpen(true);
                      }}
                      onEdit={(profile) => {
                        setEditingServerProfile(profile);
                        setServerEditDialogOpen(true);
                      }}
                      onDelete={(id) => handleDeleteServer(id)}
                      onApply={async (profile) => {
                        updateCommon({
                          serverAddr: profile.serverAddr,
                          serverPort: profile.serverPort,
                          token: profile.token,
                        });
                        try {
                          await saveToDisk();
                          setRestartRequired(true);
                          showFeedback('success', t('common.savedRestarting'));
                        } catch (e: unknown) {
                          const message = e instanceof Error ? e.message : String(e);
                          showFeedback('error', message);
                        }
                      }}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="ssh" className="mt-0">
                  <div className="space-y-6">
                    <div className="flex items-center justify-end">
                      <Button size="sm" className="h-8" onClick={handleAddSshConnection}>
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        {t('ssh.addConnection')}
                      </Button>
                    </div>

                    {savedConnections.length === 0 ? (
                      <div className="text-sm text-muted-foreground">{t('noSavedServers')}</div>
                    ) : (
                      <div className="space-y-2">
                        {paginatedSshConnections.map((conn) => (
                          <div key={conn.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{conn.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{conn.username}@{conn.host}:{conn.port}</p>
                            </div>
                            <div className="flex items-center gap-1 ml-2">
                              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditSshConnection(conn)}>
                                <Edit3 className="h-3.5 w-3.5" />
                              </Button>
                              <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-600 hover:text-red-700" onClick={() => handleDeleteServer(`ssh_${conn.id}`)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}

                        <div className="flex items-center justify-end gap-2 pt-2">
                          <span className="text-sm text-muted-foreground">
                            {t('common.page')} {sshCurrentPage} / {sshTotalPages}
                          </span>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setSshCurrentPage((p) => Math.max(1, p - 1))}
                              disabled={sshCurrentPage === 1}
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setSshCurrentPage((p) => Math.min(sshTotalPages, p + 1))}
                              disabled={sshCurrentPage === sshTotalPages}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>

      <ProxyEditDialog 
        open={editDialogOpen} 
        onOpenChange={setEditDialogOpen}
        initialData={editingProxy}
        onSave={handleSaveProxy}
        existingNames={existingNames}
      />
      
      <SshEditDialog
        open={sshEditDialogOpen}
        onOpenChange={setSshEditDialogOpen}
        initialData={editingSshProfile}
        onSave={handleSaveSshConnection}
      />

      <ServerEditDialog
        open={serverEditDialogOpen}
        onOpenChange={setServerEditDialogOpen}
        initialData={editingServerProfile}
        onSave={(data) => saveServerProfile(data)}
      />

          <AlertDialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className={feedbackType === 'success' ? 'text-green-600' : 'text-red-600'}>
              {feedbackType === 'success' ? t('common.success') : t('common.error')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {feedbackMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setFeedbackOpen(false)} className={feedbackType === 'success' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}>
              {t('common.ok')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dialog.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('dialog.deleteProxyConfirm', { name: proxyToDelete })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSingle} className="bg-red-600 hover:bg-red-700">{t('common.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={serverDeleteDialogOpen} onOpenChange={setServerDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dialog.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('dialog.deleteServerConfirm')}
              {serverToDelete?.startsWith('ssh_') && t('dialog.deleteSshNote')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteServer} className="bg-red-600 hover:bg-red-700">{t('common.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={batchDeleteDialogOpen} onOpenChange={setBatchDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dialog.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('dialog.deleteBatchProxyConfirm', { count: selectedProxies.size })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteBatch} className="bg-red-600 hover:bg-red-700">{t('common.deleteAll')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
