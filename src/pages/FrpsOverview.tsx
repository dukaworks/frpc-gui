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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  ArrowLeft,
  Globe,
  Server,
  Wifi,
  WifiOff,
  RefreshCw,
  Settings,
  ExternalLink,
  Activity,
  Users,
  Network,
} from 'lucide-react'
import type { FrpsServerInfo, FrpsClient, FrpsProxyItem } from '@/shared/types'

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


export default function FrpsOverview() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { frpsDashboardUrl, frpsUsername, frpsPassword } = useSettingsStore()
  const [serverInfo, setServerInfo] = useState<FrpsServerInfo | null>(null)
  const [clients, setClients] = useState<FrpsClient[]>([])
  const [proxies, setProxies] = useState<Record<string, FrpsProxyItem[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Fixed tab order — TCP first, always
  const proxyTypes = ['tcp', 'udp', 'http', 'https', 'stcp', 'xtcp', 'sudp']
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedbackType, setFeedbackType] = useState<'success' | 'error'>('success')
  const [feedbackMessage, setFeedbackMessage] = useState('')

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
      // Fetch serverinfo (always works)
      const info = await ApiClient.getFrpsServerInfo()
      setServerInfo(info)

      // Try /api/clients (v0.67.0+), fall back to empty list for older versions
      let clientList: import('@/shared/types').FrpsClient[] = []
      try {
        clientList = await ApiClient.getFrpsClients()
      } catch {
        // /api/clients doesn't exist on frps < v0.67.0 — that's OK
      }
      setClients(clientList)

      // Fetch proxy list — hardcoded tab order, TCP first
      const grouped: Record<string, FrpsProxyItem[]> = {}
      await Promise.allSettled(
        proxyTypes.map(async (type) => {
          try {
            const res = await ApiClient.getFrpsProxiesByType(type)
            grouped[type] = res?.proxies ?? []
          } catch {
            grouped[type] = []
          }
        }),
      )
      setProxies(grouped)
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

            {/* Proxy List Tabs */}
            {Object.keys(proxies).length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground text-sm">
                  {t('frpsOverview.noProxies')}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Tabs defaultValue="tcp" className="w-full">
                    <TabsList className="w-full justify-start rounded-none border-b bg-background px-2 h-auto py-2">
                      {proxyTypes.map((type) => (
                        <TabsTrigger
                          key={type}
                          value={type}
                          className="text-xs uppercase data-[state=active]:font-bold"
                        >
                          {type} ({Object.keys(proxies[type] || {}).length})
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    {proxyTypes.map((type) => {
                      const items = proxies[type] || []
                      return (
                        <TabsContent key={type} value={type} className="m-0">
                          {items.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">{t('frpsOverview.noProxies')}</p>
                          ) : (
                            <div>
                              <div className="grid grid-cols-12 gap-3 text-xs text-muted-foreground font-medium px-4 py-2 border-b">
                                <div className="col-span-3">{t('frpsOverview.proxyName')}</div>
                                <div className="col-span-1">{t('frpsOverview.port')}</div>
                                <div className="col-span-1 text-center">{t('frpsOverview.connections')}</div>
                                <div className="col-span-2 text-right">{t('frpsOverview.trafficIn')}</div>
                                <div className="col-span-2 text-right">{t('frpsOverview.trafficOut')}</div>
                                <div className="col-span-3 text-right">{t('frpsOverview.status')}</div>
                              </div>
                              {items.map((proxy) => {
                                const conf = proxy.conf
                                const port = conf?.remotePort
                                const trafficIn = proxy.todayTrafficIn
                                const trafficOut = proxy.todayTrafficOut
                                const conns = proxy.curConns
                                const isOnline = proxy.status === 'online'
                                return (
                                  <div
                                    key={proxy.name}
                                    className="grid grid-cols-12 gap-3 items-center text-sm px-4 py-2 hover:bg-muted/50 transition-colors border-b last:border-0"
                                  >
                                    <div className="col-span-3 font-medium text-xs truncate" title={proxy.name.replace(/"/g, '')}>
                                      {proxy.name.replace(/"/g, '')}
                                    </div>
                                    <div className="col-span-1 text-xs text-muted-foreground font-mono">
                                      {port || '—'}
                                    </div>
                                    <div className="col-span-1 text-center text-xs text-muted-foreground font-mono">
                                      {conns ?? 0}
                                    </div>
                                    <div className="col-span-2 text-right text-xs text-muted-foreground font-mono">
                                      {trafficIn ? formatBytes(trafficIn) : '0 B'}
                                    </div>
                                    <div className="col-span-2 text-right text-xs text-muted-foreground font-mono">
                                      {trafficOut ? formatBytes(trafficOut) : '0 B'}
                                    </div>
                                    <div className="col-span-3 flex items-center justify-end gap-1.5">
                                      <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                                      <span className={`text-xs font-medium ${isOnline ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                                        {isOnline ? t('frpsOverview.online') : t('frpsOverview.offline')}
                                      </span>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </TabsContent>
                      )
                    })}
                  </Tabs>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

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
