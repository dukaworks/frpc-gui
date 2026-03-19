import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSettingsStore } from '@/store/settingsStore'
import { ApiClient } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  ArrowLeft,
  BarChart,
  Globe,
  Server,
  Wifi,
  WifiOff,
  RefreshCw,
  Trash2,
  Settings,
  ExternalLink,
  Activity,
  Users,
  Network,
} from 'lucide-react'
import type { FrpsServerInfo, FrpsClient } from '@/shared/types'

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

function formatTs(ts: number): string {
  if (!ts) return '—'
  return new Date(ts).toLocaleString()
}

function ProxyTypeCount({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-block w-2 h-2 rounded-full ${color}`} />
      <span className="text-sm text-muted-foreground">{label}</span>
      <Badge variant="outline" className="text-xs">{count}</Badge>
    </div>
  )
}

export default function FrpsOverview() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { frpsDashboardUrl, frpsUsername, frpsPassword } = useSettingsStore()
  const [serverInfo, setServerInfo] = useState<FrpsServerInfo | null>(null)
  const [clients, setClients] = useState<FrpsClient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedbackType, setFeedbackType] = useState<'success' | 'error'>('success')
  const [feedbackMessage, setFeedbackMessage] = useState('')

  const [clearDialogOpen, setClearDialogOpen] = useState(false)
  const [clearing, setClearing] = useState(false)

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedbackType(type)
    setFeedbackMessage(message)
    setFeedbackOpen(true)
  }

  // Sync credentials to backend on mount
  useEffect(() => {
    if (frpsDashboardUrl) {
      ApiClient.saveFrpsConfig(frpsDashboardUrl, frpsUsername, frpsPassword).catch(console.error)
    }
  }, [])

  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      const [info, clientList] = await Promise.all([
        ApiClient.getFrpsServerInfo(),
        ApiClient.getFrpsClients(),
      ])
      setServerInfo(info)
      setClients(clientList)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!frpsDashboardUrl) {
      setError(t('dashboard.frpsUrlNotSet'))
      setLoading(false)
      return
    }
    fetchData()
  }, [])

  const handleClearOffline = async () => {
    setClearing(true)
    try {
      await ApiClient.clearOfflineFrpsProxies()
      showFeedback('success', t('frpsOverview.clearOfflineSuccess'))
      await fetchData()
    } catch (e: unknown) {
      showFeedback('error', e instanceof Error ? e.message : String(e))
    } finally {
      setClearing(false)
      setClearDialogOpen(false)
    }
  }

  const openExternal = (url: string) => {
    if (window.electron?.openExternal) {
      void window.electron.openExternal(url)
    } else {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  if (!frpsDashboardUrl) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-destructive">{t('common.error')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">{t('dashboard.frpsUrlNotSet')}</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('dashboard.backToConnect')}
              </Button>
              <Button onClick={() => navigate('/dashboard')}>
                <Settings className="h-4 w-4 mr-2" />
                {t('common.settings')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="-ml-2">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('dashboard.backToConnect')}</TooltipContent>
            </Tooltip>
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5 text-blue-500" />
              <h1 className="text-xl font-bold">{t('frpsOverview.title')}</h1>
            </div>
            {serverInfo && (
              <Badge variant="outline" className="text-xs font-mono ml-2">
                v{serverInfo.version}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {frpsDashboardUrl && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openExternal(frpsDashboardUrl)}
                    title={t('dashboard.openFrpsDashboard')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('dashboard.openFrpsDashboard')}</TooltipContent>
              </Tooltip>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchData}
              disabled={loading}
              title={t('common.refresh')}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </header>

      <div className="container py-6 space-y-6">
        {loading && !serverInfo ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error && !serverInfo ? (
          <Card className="border-destructive/50">
            <CardContent className="pt-6">
              <p className="text-destructive font-medium">{t('common.error')}</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
              <Button variant="outline" className="mt-4" onClick={fetchData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('common.refresh')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Server Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Traffic In */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Network className="h-4 w-4 text-green-500" />
                    {t('frpsOverview.trafficIn')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{serverInfo ? formatBytes(serverInfo.totalTrafficIn) : '—'}</p>
                </CardContent>
              </Card>

              {/* Traffic Out */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Network className="h-4 w-4 text-blue-500" />
                    {t('frpsOverview.trafficOut')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{serverInfo ? formatBytes(serverInfo.totalTrafficOut) : '—'}</p>
                </CardContent>
              </Card>

              {/* Connections */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Activity className="h-4 w-4 text-purple-500" />
                    {t('frpsOverview.connections')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{serverInfo?.curConns ?? '—'}</p>
                </CardContent>
              </Card>

              {/* Clients */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4 text-amber-500" />
                    {t('frpsOverview.frpcClients')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{serverInfo?.clientCounts ?? '—'}</p>
                </CardContent>
              </Card>
            </div>

            {/* Proxy Type Summary */}
            {serverInfo && serverInfo.proxyTypeCount && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{t('frpsOverview.proxyTypes')}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-4">
                  {Object.entries(serverInfo.proxyTypeCount).map(([type, count]) => (
                    <ProxyTypeCount
                      key={type}
                      label={type.toUpperCase()}
                      count={count}
                      color={
                        type === 'tcp' ? 'bg-blue-500' :
                        type === 'udp' ? 'bg-green-500' :
                        type === 'http' ? 'bg-orange-500' :
                        type === 'https' ? 'bg-purple-500' :
                        type === 'stcp' ? 'bg-pink-500' :
                        type === 'xtcp' ? 'bg-red-500' :
                        'bg-gray-500'
                      }
                    />
                  ))}
                </CardContent>
              </Card>
            )}

            {/* FRPC Clients List */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {t('frpsOverview.frpcClients')} ({clients.length})
                </CardTitle>
                <div className="flex gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setClearDialogOpen(true)}
                        className="text-destructive border-destructive/50 hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        {t('frpsOverview.clearOffline')}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('frpsOverview.clearOfflineDesc')}</TooltipContent>
                  </Tooltip>
                </div>
              </CardHeader>
              <CardContent>
                {clients.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">{t('frpsOverview.noClients')}</p>
                ) : (
                  <div className="space-y-2">
                    {/* Table header */}
                    <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground font-medium px-2">
                      <div className="col-span-1">{t('frpsOverview.status')}</div>
                      <div className="col-span-2">{t('frpsOverview.hostname')}</div>
                      <div className="col-span-2">{t('frpsOverview.runId')}</div>
                      <div className="col-span-2">{t('frpsOverview.clientIp')}</div>
                      <div className="col-span-2">{t('frpsOverview.firstConnected')}</div>
                      <div className="col-span-3">{t('frpsOverview.lastConnected')}</div>
                    </div>
                    {clients.map((client) => (
                      <div
                        key={client.key}
                        className="grid grid-cols-12 gap-2 items-center text-sm px-2 py-2 rounded-md hover:bg-muted/50 transition-colors"
                      >
                        <div className="col-span-1">
                          {client.online ? (
                            <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                              <Wifi className="h-3.5 w-3.5" />
                              <span className="text-xs">{t('frpsOverview.online')}</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <WifiOff className="h-3.5 w-3.5" />
                              <span className="text-xs">{t('frpsOverview.offline')}</span>
                            </span>
                          )}
                        </div>
                        <div className="col-span-2 font-medium truncate" title={client.hostname}>
                          {client.hostname || '—'}
                        </div>
                        <div className="col-span-2 font-mono text-xs text-muted-foreground truncate" title={client.runID}>
                          {client.runID || '—'}
                        </div>
                        <div className="col-span-2 font-mono text-xs text-muted-foreground truncate" title={client.clientIP}>
                          {client.clientIP || '—'}
                        </div>
                        <div className="col-span-2 text-xs text-muted-foreground truncate">
                          {formatTs(client.firstConnectedAt)}
                        </div>
                        <div className="col-span-3 text-xs text-muted-foreground truncate">
                          {formatTs(client.lastConnectedAt)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Clear offline dialog */}
      <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('frpsOverview.clearOffline')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('frpsOverview.clearOfflineConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearOffline}
              className="bg-destructive hover:bg-destructive/90"
              disabled={clearing}
            >
              {clearing ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              {t('frpsOverview.clearOffline')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Feedback dialog */}
      <AlertDialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className={feedbackType === 'success' ? 'text-green-600' : 'text-red-600'}>
              {feedbackType === 'success' ? t('common.success') : t('common.error')}
            </AlertDialogTitle>
            <AlertDialogDescription>{feedbackMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => setFeedbackOpen(false)}
              className={feedbackType === 'success' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {t('common.ok')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
