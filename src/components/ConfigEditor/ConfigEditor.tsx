import { useState, useEffect } from 'react';
import { ApiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Save, Code, AlertTriangle, Server, Eye, EyeOff, Lock, Unlock } from 'lucide-react';
import { useFrpcConfig } from '@/hooks/useFrpcConfig';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ConfigEditorProps {
  initialContent: string;
  path: string;
  onSave?: () => void;
  onConfigSaved?: () => void;
  defaultTab?: 'server' | 'code';
  hideTabs?: boolean;
}

function toNumberOrUndefined(v: unknown) {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : undefined;
}

export function ConfigEditor({ initialContent, path, onSave, onConfigSaved, defaultTab = 'server', hideTabs = false }: ConfigEditorProps) {
  const {
    content: hookContent,
    setContent: setHookContent,
    parseError,
    commonConfig,
    updateCommon,
    generateToml,
    refresh
  } = useFrpcConfig(initialContent);

  const [activeTab, setActiveTab] = useState(defaultTab);
  const [codeContent, setCodeContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isLocked, setIsLocked] = useState(true);

  // Sync code content when hook content changes (external update or re-parse)
  useEffect(() => {
    setCodeContent(hookContent);
  }, [hookContent]);

  // When switching tabs
  const handleTabChange = (val: string) => {
    if (val === 'code') {
      const currentToml = generateToml();
      setCodeContent(currentToml);
    } else if (activeTab === 'code' && val !== 'code') {
      // Leaving code tab, parse content
      setHookContent(codeContent);
      refresh(); // trigger re-parse immediately just in case
    }
    setActiveTab(val as 'code' | 'server');
  };

  const handleSave = async (restart: boolean = true) => {
    if (isLocked) return;
    
    setSaving(true);
    setError('');
    setSuccess('');

    let contentToSave = '';
    
    if (activeTab !== 'code') {
      contentToSave = generateToml();
    } else {
      contentToSave = codeContent;
    }

    try {
      await ApiClient.saveConfig(path, contentToSave);
      
      if (onConfigSaved) {
        onConfigSaved();
      }
      
      if (restart && onSave) {
         // If restart is requested, we call onSave which triggers restart in Dashboard
         setSuccess('已保存并请求重启...');
         setTimeout(() => onSave(), 300);
      } else {
         setSuccess('已保存');
      }
      
      if (activeTab !== 'code') {
         setHookContent(contentToSave);
      } else {
         setHookContent(contentToSave);
      }

      setTimeout(() => setSuccess(''), 2000);
    } catch (err: any) {
      setError(err.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      {!hideTabs && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-card p-3 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between sm:justify-start gap-3">
            <div className="flex flex-col">
                <div className="flex items-center gap-2">
                    <h3 className="text-lg font-medium">配置编辑器</h3>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 w-6 p-0 rounded-full"
                                onClick={() => setIsLocked(!isLocked)}
                            >
                                {isLocked ? <Lock className="h-3 w-3 text-muted-foreground" /> : <Unlock className="h-3 w-3 text-orange-500" />}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            {isLocked ? 'Click to Unlock Editing' : 'Unlocked - Careful!'}
                        </TooltipContent>
                    </Tooltip>
                </div>
                {path && <p className="text-xs text-muted-foreground font-mono">{path}</p>}
            </div>
          </div>

          <div className="flex gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={() => handleSave(false)} disabled={saving || isLocked} variant="outline" className="border-primary text-primary hover:bg-primary/10">
                     {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                     Save
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Save configuration only</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={() => handleSave(true)} disabled={saving || isLocked} className="min-w-[120px]" variant="outline">
                     {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                     {saving ? 'Saving...' : 'Save & Restart'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Save configuration and restart service</TooltipContent>
              </Tooltip>
          </div>
        </div>
      )}
      
      {hideTabs && (
          <div className="flex justify-end items-center mb-2">
               <div className="flex gap-2">
                   <Tooltip>
                     <TooltipTrigger asChild>
                       <Button onClick={() => handleSave(false)} disabled={saving || isLocked} size="sm" variant="outline" className="border-primary text-primary hover:bg-primary/10">
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save
                       </Button>
                     </TooltipTrigger>
                     <TooltipContent>Save configuration only</TooltipContent>
                   </Tooltip>

                   <Tooltip>
                     <TooltipTrigger asChild>
                       <Button onClick={() => handleSave(true)} disabled={saving || isLocked} size="sm" className="min-w-[120px]" variant="outline">
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        {saving ? 'Saving…' : 'Save & Restart'}
                      </Button>
                     </TooltipTrigger>
                     <TooltipContent>Save configuration and restart service</TooltipContent>
                   </Tooltip>
               </div>
          </div>
      )}

      {parseError && activeTab !== 'code' && (
         <div className="flex items-center p-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md">
            <AlertTriangle className="h-4 w-4 mr-2" />
            <span>配置解析遇到问题，部分内容可能无法显示。建议切换到源码模式查看。错误: {parseError}</span>
            <Button variant="link" size="sm" onClick={() => handleTabChange('code')} className="ml-auto text-amber-900">
                切换到源码模式
            </Button>
         </div>
      )}

      {error && <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">{error}</div>}
      {success && <div className="p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-md">{success}</div>}

      <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-4">
            {!hideTabs && (
                <TabsList>
                    <TabsTrigger value="server" className="flex items-center gap-2">
                        <Server className="h-4 w-4" />
                        服务器配置
                    </TabsTrigger>
                    <TabsTrigger value="code" className="flex items-center gap-2">
                        <Code className="h-4 w-4" />
                        源码模式
                    </TabsTrigger>
                </TabsList>
            )}
        </div>

        <TabsContent value="server" className="mt-0 relative">
            {isLocked && <div className="absolute inset-0 bg-white/50 z-10 cursor-not-allowed" />}
            <div className="grid grid-cols-12 gap-4">
                <div className="hidden md:block md:col-span-3"></div>
                <div className="col-span-12 md:col-span-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle>Server Connection Settings</CardTitle>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-8 w-8 p-0"
                                        onClick={() => setIsLocked(!isLocked)}
                                    >
                                        {isLocked ? <Lock className="h-4 w-4 text-muted-foreground" /> : <Unlock className="h-4 w-4 text-orange-500" />}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    {isLocked ? 'Click to Unlock Editing' : 'Unlocked - Careful!'}
                                </TooltipContent>
                            </Tooltip>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Server Addr</Label>
                                <Input 
                                    value={commonConfig.serverAddr} 
                                    onChange={(e) => updateCommon('serverAddr', e.target.value)} 
                                    placeholder="Frps Server IP or Domain" 
                                    disabled={isLocked}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Server Port</Label>
                                <Input
                                    type="number"
                                    value={commonConfig.serverPort}
                                    onChange={(e) => updateCommon('serverPort', toNumberOrUndefined(e.target.value) ?? 0)}
                                    placeholder="7000"
                                    disabled={isLocked}
                                />
                            </div>
                            <div className="space-y-2">
                        <Label>Token</Label>
                        <div className="relative">
                            <Input
                                type={showToken ? "text" : "password"}
                                value={(commonConfig as any).token || ''}
                                onChange={(e) => updateCommon('token' as any, e.target.value)}
                                placeholder="Optional auth token"
                                className="pr-10"
                                disabled={isLocked}
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowToken(!showToken)}
                                disabled={isLocked}
                            >
                                {showToken ? (
                                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                    <Eye className="h-4 w-4 text-muted-foreground" />
                                )}
                            </Button>
                        </div>
                    </div>
                        </CardContent>
                    </Card>
                </div>
                <div className="hidden md:block md:col-span-3"></div>
            </div>
        </TabsContent>

        <TabsContent value="code" className="flex-1 mt-0 h-full min-h-[500px]">
            <textarea
                className={`w-full h-full p-4 font-mono text-sm bg-slate-950 text-slate-50 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary ${isLocked ? 'opacity-80 cursor-not-allowed' : ''}`}
                value={codeContent}
                onChange={(e) => setCodeContent(e.target.value)}
                spellCheck={false}
                disabled={isLocked}
            />
        </TabsContent>
      </Tabs>
    </div>
  );
}
