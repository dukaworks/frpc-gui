import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/store/settingsStore';
import { ApiClient } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Loader2, ExternalLink } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { t, i18n } = useTranslation();
  const { 
    language, setLanguage, 
    theme, setTheme,
    proxyPageSize, setProxyPageSize,
    serverPageSize, setServerPageSize,
    frpsDashboardUrl, setFrpsDashboardUrl
  } = useSettingsStore();

  const [localFrpsUrl, setLocalFrpsUrl] = useState(frpsDashboardUrl);
  const [loadingAuto, setLoadingAuto] = useState(false);
  const [testLoading, setTestLoading] = useState(false);

  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'success' | 'error'>('success');
  const [feedbackMessage, setFeedbackMessage] = useState('');

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedbackType(type);
    setFeedbackMessage(message);
    setFeedbackOpen(true);
  };

  // Parse existing URL on open
  useEffect(() => {
    setLocalFrpsUrl(frpsDashboardUrl);
  }, [frpsDashboardUrl, open]);

  // Auto-fill on open if empty
  useEffect(() => {
    if (open && !frpsDashboardUrl && import.meta.env.FRPC_CONFIG_PATH) {
        const autoFill = async () => {
             setLoadingAuto(true);
             try {
                const configPath = import.meta.env.FRPC_CONFIG_PATH;
                if (!configPath) return;
                
                const res = await ApiClient.getConfig(configPath);
                if (!res.content) return;
                
                const serverAddrMatch = res.content.match(/server_addr\s*=\s*"?([^"\s]+)"?/);
                if (serverAddrMatch) {
                    let host = serverAddrMatch[1];
                    if (host === '0.0.0.0') host = '127.0.0.1';
                    setLocalFrpsUrl(`http://${host}:8056`);
                }
             } catch (e) {
                 console.error(e);
             } finally {
                 setLoadingAuto(false);
             }
        };
        autoFill();
    }
  }, [open, frpsDashboardUrl]);

  const handleLanguageChange = (val: string) => {
    const lang = val as 'en' | 'zh';
    setLanguage(lang);
    i18n.changeLanguage(lang);
  };

  const handleThemeChange = (val: string) => {
    setTheme(val as 'light' | 'dark' | 'system');
  };

  const handleSave = () => {
    let finalUrl = localFrpsUrl;
    // Ensure protocol
    if (finalUrl && !finalUrl.startsWith('http')) {
       finalUrl = 'http://' + finalUrl;
    }
    setFrpsDashboardUrl(finalUrl);
    onOpenChange(false);
  };

  const handleTest = async () => {
    let finalUrl = localFrpsUrl;
    // Ensure protocol
    if (finalUrl && !finalUrl.startsWith('http')) {
       finalUrl = 'http://' + finalUrl;
    }

    if (!finalUrl) {
      showFeedback('error', t('settings.testAccessEmpty'));
      return;
    }

    setTestLoading(true);
    try {
      const result = await ApiClient.testUrl(finalUrl);
      if (result.ok) {
        const status = typeof result.status === 'number' ? String(result.status) : '';
        showFeedback('success', t('settings.testAccessSuccess', { status }));
      } else {
        showFeedback('error', t('settings.testAccessFailed', { error: result.error || '' }));
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      showFeedback('error', t('settings.testAccessFailed', { error: message }));
    } finally {
      setTestLoading(false);
    }

    if (window.electron?.openExternal) {
      void window.electron.openExternal(finalUrl);
      return;
    }
    window.open(finalUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {t('common.settings')}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">{t('settings.general')}</TabsTrigger>
            <TabsTrigger value="display">{t('settings.display')}</TabsTrigger>
            <TabsTrigger value="frps">{t('settings.frps')}</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="language" className="text-right">
                {t('common.language')}
              </Label>
              <Select value={language} onValueChange={handleLanguageChange}>
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="zh">中文</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="theme" className="text-right">
                {t('common.theme')}
              </Label>
              <Select value={theme} onValueChange={handleThemeChange}>
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">{t('common.light')}</SelectItem>
                  <SelectItem value="dark">{t('common.dark')}</SelectItem>
                  <SelectItem value="system">{t('common.system')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="display" className="space-y-4 py-4">
            <div className="grid grid-cols-12 items-center gap-4">
              <Label htmlFor="proxyPageSize" className="col-span-5 text-right">
                {t('settings.proxiesPerPage')}
              </Label>
              <Input
                id="proxyPageSize"
                type="number"
                value={proxyPageSize}
                onChange={(e) => setProxyPageSize(Math.max(1, Number(e.target.value)))}
                className="col-span-7"
                min={1}
              />
            </div>
            <div className="grid grid-cols-12 items-center gap-4">
              <Label htmlFor="serverPageSize" className="col-span-5 text-right">
                {t('settings.serversPerPage')}
              </Label>
              <Input
                id="serverPageSize"
                type="number"
                value={serverPageSize}
                onChange={(e) => setServerPageSize(Math.max(1, Number(e.target.value)))}
                className="col-span-7"
                min={1}
              />
            </div>
          </TabsContent>

          <TabsContent value="frps" className="space-y-4 py-4">
            <div className="space-y-3">
              {/* Auto-fill is now automatic, but we show a loader if it's happening */}
              {loadingAuto && (
                  <div className="flex items-center justify-end text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      {t('common.loading')}
                  </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="frpsUrl">{t('settings.frpsUrl')}</Label>
                <div className="flex gap-2">
                    <Input
                      id="frpsUrl"
                      placeholder={t('settings.frpsUrlPlaceholder')}
                      value={localFrpsUrl}
                      onChange={(e) => setLocalFrpsUrl(e.target.value)}
                    />
                    <Button type="button" variant="outline" size="icon" onClick={handleTest} title={t('settings.testAccess')} disabled={testLoading}>
                        {testLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                    </Button>
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground">
                {t('settings.frpsNote')}
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSave}>{t('common.confirm')}</Button>
        </DialogFooter>
      </DialogContent>

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
            <AlertDialogAction
              onClick={() => setFeedbackOpen(false)}
              className={feedbackType === 'success' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {t('common.ok')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
