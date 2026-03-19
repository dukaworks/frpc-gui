/**
 * LocalPage — Standalone page for Native Local Mode (no SSH needed).
 *
 * State is fully local — no zustand store, no sessionId, no isConnected.
 * This page is intentionally isolated from the SSH architecture.
 */

import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiClient } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Terminal, FileText, Activity, Edit3, Settings, Plus, RotateCw, RefreshCw, CheckSquare, Trash2, Globe, Lock, BarChart, Download, Upload, ChevronLeft, ChevronRight, Power, Server, ExternalLink } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConfigEditor } from '@/components/ConfigEditor';
import { ProxyListOverview } from '@/components/ConfigEditor/ProxyListOverview';
import { ProxyEditDialog } from '@/components/ConfigEditor/ProxyEditDialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ProxyConfig, FrpcProcessInfo } from '@/shared/types';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/store/settingsStore';
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
} from '@/components/ui/alert-dialog';
import { useFrpcConfig } from '@/hooks/useFrpcConfig';
import { useTheme } from '@/hooks/useTheme';

// ─── Uptime Display ───────────────────────────────────────────────────────────

function UptimeDisplay({ startTimestamp }: { startTimestamp: number }) {
  const { t } = useTranslation();
  const [uptime, setUptime] = useState('');

  useEffect(() => {
    const update = () => {
      const diff = Math.floor((Date.now() - startTimestamp) / 1000);
      if (diff < 0) { setUptime(t('dashboard.starting')); return; }
      if (diff < 60) setUptime(`${t('dashboard.up')} ${diff} ${t('dashboard.seconds')}`);
      else if (diff < 3600) setUptime(`${t('dashboard.up')} ${Math.floor(diff / 60)} ${t('dashboard.minutes')}`);
      else if (diff < 86400) setUptime(`${t('dashboard.up')} ${Math.floor(diff / 3600)} ${t('dashboard.hours')}`);
      else setUptime(`${t('dashboard.up')} ${Math.floor(diff / 86400)} ${t('dashboard.days')}`);
    };
    update();
    const i = setInterval(update, 1000);
    return () => clearInterval(i);
  }, [startTimestamp, t]);

  return <span className="truncate">{uptime}</span>;
}

// ─── ANSI Cleaner ───────────────────────────────────────────────────────────

function cleanAnsi(raw: string) {
  const esc = String.fromCharCode(27);
  return raw.replace(new RegExp(`${esc}\\[[0-9;]*[a-zA-Z]`, 'g'), '');
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function LocalPage() {
  const { t } = useTranslation();
  useTheme(); // Apply dark class to <html> for Tailwind dark mode
  const navigate = useNavigate();
  const { frpsDashboardUrl } = useSettingsStore();

  // ── State ────────────────────────────────────────────────────────────────
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [processInfo, setProcessInfo] = useState<FrpcProcessInfo | null>(null);
  const [configContent, setConfigContent] = useState('');
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [logs, setLogs] = useState('');
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState('');
  const [serviceLoading, setServiceLoading] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'success' | 'error'>('success');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingProxy, setEditingProxy] = useState<ProxyConfig | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [proxyToDelete, setProxyToDelete] = useState<string | null>(null);
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedProxies, setSelectedProxies] = useState<Set<string>>(new Set());

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedbackType(type);
    setFeedbackMessage(message);
    setFeedbackOpen(true);
  };

  // ── Scan ────────────────────────────────────────────────────────────────
  const scan = async () => {
    setScanLoading(true);
    try {
      const res = await ApiClient.scan();
      setProcessInfo(res.process ?? null);
    } catch (err: unknown) {
      showFeedback('error', err instanceof Error ? err.message : 'Scan failed');
    } finally {
      setScanLoading(false);
    }
  };

  // ── Load config ─────────────────────────────────────────────────────────
  const loadConfig = async (path: string) => {
    setLoadingConfig(true);
    try {
      const res = await ApiClient.getConfig(path);
      setConfigContent(res.content);
    } catch (err: unknown) {
      showFeedback('error', err instanceof Error ? err.message : 'Load failed');
    } finally {
      setLoadingConfig(false);
    }
  };

  // ── Init: scan + load config ───────────────────────────────────────────
  useEffect(() => {
    scan();
  }, []);

  useEffect(() => {
    if (processInfo?.configPath) {
      loadConfig(processInfo.configPath);
    }
  }, [processInfo?.configPath]);

  // ── Logs ────────────────────────────────────────────────────────────────
  const fetchLogs = async () => {
    if (!processInfo?.serviceName || !processInfo?.source) return;
    setLogsLoading(true);
    try {
      const res = await ApiClient.fetchLogs(processInfo.source, processInfo.serviceName, { lines: 80 });
      setLogsError('');
      setLogs(cleanAnsi(res.logs || ''));
    } catch (e: unknown) {
      console.error('Failed to fetch logs:', e);
      const msg = e instanceof Error ? e.message : String(e);
      setLogsError(msg);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    if (processInfo?.serviceName && processInfo?.source) {
      fetchLogs();
      const i = setInterval(fetchLogs, 10000);
      return () => clearInterval(i);
    }
  }, [processInfo?.serviceName, processInfo?.source]);

  // ── CRUD ────────────────────────────────────────────────────────────────
  const { proxies, parseError, commonConfig, addProxy, updateProxy, deleteProxy, importProxies, generateToml } =
    useFrpcConfig(configContent);

  const existingNames = useMemo(() => new Set(proxies.map((p) => p.name)), [proxies]);

  const [savePending, setSavePending] = useState(false);
  const triggerSave = () => setSavePending(true);

  useEffect(() => {
    if (savePending && processInfo?.configPath) {
      const newContent = generateToml();
      ApiClient.saveConfig(processInfo.configPath, newContent)
        .then(() => setConfigContent(newContent))
        .catch((e: unknown) => showFeedback('error', e instanceof Error ? e.message : 'Save failed'))
        .finally(() => setSavePending(false));
    }
  }, [proxies, savePending, processInfo?.configPath, generateToml]);

  const handleServiceAction = async (action: string) => {
    if (!processInfo?.source || !processInfo?.serviceName) return;
    setServiceLoading(true);
    try {
      await ApiClient.serviceControl(action, processInfo.source, processInfo.serviceName, processInfo.requiresSudo);
      showFeedback('success', `Service ${action} sent`);
      setTimeout(scan, 2000);
    } catch (err: unknown) {
      showFeedback('error', err instanceof Error ? err.message : 'Failed');
    } finally {
      setServiceLoading(false);
    }
  };

  const handleAddProxy = () => { setEditingProxy(null); setEditDialogOpen(true); };
  const handleEditProxy = (p: ProxyConfig) => { setEditingProxy(p); setEditDialogOpen(true); };

  const handleSaveProxy = (data: ProxyConfig) => {
    if (editingProxy) updateProxy(editingProxy.name, data);
    else addProxy(data);
    setEditDialogOpen(false);
    triggerSave();
  };

  const confirmDeleteSingle = () => {
    if (proxyToDelete) { deleteProxy(proxyToDelete); setProxyToDelete(null); setDeleteDialogOpen(false); triggerSave(); }
  };

  const handleToggleSelection = (name: string) => {
    setSelectedProxies((prev) => { const n = new Set(prev); n.has(name) ? n.delete(name) : n.add(name); return n; });
  };

  const confirmDeleteBatch = () => {
    selectedProxies.forEach((n) => deleteProxy(n));
    setSelectedProxies(new Set());
    setSelectionMode(false);
    setBatchDeleteDialogOpen(false);
    triggerSave();
  };

  const handleExportProxies = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(proxies, null, 2)], { type: 'application/json' }));
    a.download = `proxies_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleImportProxies = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string);
        if (Array.isArray(json)) { importProxies(json); triggerSave(); showFeedback('success', t('dashboard.importedSuccess', { count: json.length })); }
        else showFeedback('error', t('dashboard.importError'));
      } catch { showFeedback('error', t('dashboard.importError')); }
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const openExternalUrl = (url: string) => { window.open(url, '_blank', 'noopener,noreferrer'); };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-purple-600 dark:text-purple-400">{t('dashboard.title')}</h1>
            <Badge variant="outline" className="text-xs border-purple-500/30 text-purple-400">Local Mode</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={scan} disabled={scanLoading} className="rounded-full">
                  {scanLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5 text-muted-foreground hover:text-primary" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('dashboard.rescanService')}</TooltipContent>
            </Tooltip>

            {/* FRPS Overview */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/frps')}
                  className="text-muted-foreground hover:bg-primary hover:text-primary-foreground"
                >
                  <Server className="h-4 w-4 md:mr-2" />
                  <span className="hidden md:inline">{t('frpsOverview.title')}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('frpsOverview.title')}</TooltipContent>
            </Tooltip>

            {/* Open original FRPS dashboard */}
            {frpsDashboardUrl && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openExternalUrl(frpsDashboardUrl)}
                    title={t('dashboard.openFrpsDashboard')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('dashboard.openFrpsDashboard')}</TooltipContent>
              </Tooltip>
            )}

            <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)} className="text-muted-foreground hover:bg-primary hover:text-primary-foreground">
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container py-6 space-y-6">
        {/* Status Cards */}
        {processInfo ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* FRPC Status */}
            <Card className="flex flex-col h-64">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Activity className="h-4 w-4 text-purple-500" /> {t('dashboard.frpcClient')}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {processInfo.version && <span className="text-xs text-muted-foreground font-mono">v{processInfo.version}</span>}
                  <div className={`h-2.5 w-2.5 rounded-full ${processInfo.status === 'running' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-center">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-xs">{t('dashboard.status')}</span>
                    <span className={`text-sm font-medium capitalize ${processInfo.status === 'running' ? 'text-green-600' : 'text-red-600'}`}>{processInfo.status}</span>
                  </div>
                  {processInfo.startTimestamp && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-xs">{t('dashboard.uptime')}</span>
                      <UptimeDisplay startTimestamp={processInfo.startTimestamp} />
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-xs">Source</span>
                    <Badge variant="outline" className="text-[10px] h-5 font-normal">
                      {processInfo.source === 'docker' ? 'Docker' : processInfo.source === 'systemd' ? 'Systemd' : 'Process'}
                    </Badge>
                  </div>
                  <div className="pt-2 border-t space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-xs">Config</span>
                      <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded truncate max-w-[160px]" title={processInfo.configPath}>
                        {processInfo.configPath?.split('/').pop() || 'Unknown'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* FRPS Server */}
            <Card className="flex flex-col h-64">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Globe className="h-4 w-4 text-blue-500" /> {t('dashboard.frpsServer')}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-center">
                <div className="space-y-3">
                  <div>
                    <div className="text-2xl font-bold text-foreground break-all">
                      {commonConfig.serverAddr || '127.0.0.1'}<span className="text-lg text-muted-foreground font-normal">:{commonConfig.serverPort || 7000}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{t('dashboard.frpsAddress')}</p>
                  </div>
                  <div className="pt-3 border-t space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-2 text-xs">
                        <Lock className="h-3 w-3" /> {t('dashboard.auth')}
                      </span>
                      <span className={`font-medium text-xs ${commonConfig.token ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                        {commonConfig.token ? 'Token' : 'None'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Live Logs */}
            <Card className="flex flex-col h-64 bg-slate-950 text-slate-50 border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-800/50">
                <CardTitle className="text-sm font-medium text-purple-400 flex items-center gap-2">
                  <Terminal className="h-4 w-4" /> {t('dashboard.recentLogs')}
                </CardTitle>
                <Badge variant="outline" className="text-[10px] h-5 border-purple-500/30 text-purple-400">{t('dashboard.live')}</Badge>
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-hidden relative group">
                <div className="absolute inset-0 p-4 font-mono text-[11px] overflow-auto">
                  {logsError ? (
                    <div className="text-red-400 italic">{t('dashboard.fetchLogsFailed')}: {logsError}</div>
                  ) : logsLoading && !logs ? (
                    <div className="flex items-center justify-center h-full text-slate-500"><Loader2 className="h-5 w-5 animate-spin mr-2" /></div>
                  ) : logs ? (
                    <div className="space-y-1">
                      {logs.split('\n').filter(Boolean).map((line, i) => (
                        <div key={i} className={`whitespace-pre-wrap break-all leading-tight pb-1 ${line.includes('[E]') || line.toLowerCase().includes('error') ? 'text-purple-400' : 'text-slate-300'}`}>{line}</div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-slate-500 italic">{t('dashboard.noLogsAvailable')}</div>
                  )}
                </div>
                <Button variant="ghost" size="sm" className="absolute bottom-2 right-2 h-7 text-xs bg-slate-900/80 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity" onClick={fetchLogs} disabled={logsLoading}>
                  <RefreshCw className={`h-3 w-3 mr-1 ${logsLoading ? 'animate-spin' : ''}`} /> {t('dashboard.refresh')}
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Not found */
          <Card className="border-amber-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-foreground flex items-center gap-2 text-lg">
                <Activity className="h-5 w-5 text-amber-600" /> {t('dashboard.localNotDetected')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{t('dashboard.localNotDetectedDesc')}</p>
              <p className="text-sm text-muted-foreground">{t('dashboard.localNotDetectedCheckTitle')}</p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>{t('dashboard.localNotDetectedCheck1')}</li>
                <li>{t('dashboard.localNotDetectedCheck2')}</li>
              </ul>
              <Button onClick={scan} disabled={scanLoading} variant="outline">
                {scanLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />} {t('dashboard.localRescan')}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Config Tabs */}
        {loadingConfig ? (
          <div className="flex items-center justify-center h-32"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : (
          <Tabs defaultValue="proxies" className="w-full">
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="proxies"><Settings className="h-4 w-4 mr-2" />{t('dashboard.proxies')}</TabsTrigger>
                <TabsTrigger value="edit"><FileText className="h-4 w-4 mr-2" />{t('dashboard.configEditor')}</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="proxies" className="mt-0">
              <div className="space-y-6">
                <div className="flex items-center justify-end gap-2">
                  <input type="file" accept=".json" className="hidden" id="import-local" onChange={handleImportProxies} />
                  <Button size="sm" variant="outline" className="h-8" onClick={() => document.getElementById('import-local')?.click()}>
                    <Upload className="h-3.5 w-3.5 mr-1" />{t('dashboard.import')}
                  </Button>
                  <Button size="sm" variant="outline" className="h-8" onClick={handleExportProxies}>
                    <Download className="h-3.5 w-3.5 mr-1" />{t('dashboard.export')}
                  </Button>
                  <Button size="sm" variant="outline" className="h-8" onClick={handleAddProxy}>
                    <Plus className="h-3.5 w-3.5 mr-1" />{t('dashboard.addProxy')}
                  </Button>
                  {selectionMode ? (
                    <>
                      <Button size="sm" variant="destructive" className="h-8" onClick={() => setBatchDeleteDialogOpen(true)} disabled={selectedProxies.size === 0}>
                        <Trash2 className="h-3.5 w-3.5 mr-1" />{t('dashboard.delete')} ({selectedProxies.size})
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8" onClick={() => { setSelectionMode(false); setSelectedProxies(new Set()); }}>
                        {t('dashboard.cancel')}
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="ghost" className="h-8" onClick={() => setSelectionMode(true)}>
                      <CheckSquare className="h-3.5 w-3.5 mr-1" />{t('dashboard.select')}
                    </Button>
                  )}
                  {processInfo && (
                    <Button size="sm" variant="outline" className="h-8" onClick={() => handleServiceAction('restart')} disabled={serviceLoading}>
                      {serviceLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <RotateCw className="h-3.5 w-3.5 mr-1" />}{t('dashboard.restartService')}
                    </Button>
                  )}
                </div>
                <ProxyListOverview
                  proxies={proxies}
                  parseError={parseError}
                  selectionMode={selectionMode}
                  selectedProxies={selectedProxies}
                  onToggleSelection={handleToggleSelection}
                  onEdit={handleEditProxy}
                  onDelete={(n) => { setProxyToDelete(n); setDeleteDialogOpen(true); }}
                  onAdd={handleAddProxy}
                  logs={logs}
                />
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
                  onConfigSaved={() => void 0}
                />
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Dialogs */}
      <ProxyEditDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} initialData={editingProxy} onSave={handleSaveProxy} existingNames={existingNames} />

      <AlertDialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className={feedbackType === 'success' ? 'text-green-600' : 'text-red-600'}>{feedbackType === 'success' ? t('common.success') : t('common.error')}</AlertDialogTitle>
            <AlertDialogDescription>{feedbackMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setFeedbackOpen(false)} className={feedbackType === 'success' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}>{t('common.ok')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dialog.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('dialog.deleteProxyConfirm', { name: proxyToDelete })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSingle} className="bg-red-600 hover:bg-red-700">{t('common.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={batchDeleteDialogOpen} onOpenChange={setBatchDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dialog.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('dialog.deleteBatchProxyConfirm', { count: selectedProxies.size })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteBatch} className="bg-red-600 hover:bg-red-700">{t('common.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
