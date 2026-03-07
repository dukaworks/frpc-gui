import { useState, useEffect } from 'react';
import { ApiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Save, Plus, Trash2, Edit2, Code, LayoutList } from 'lucide-react';
import toml from '@iarna/toml';
import { ProxyConfig, CommonConfig } from '@/shared/types';

interface ConfigEditorProps {
  initialContent: string;
  path: string;
  onSave?: () => void;
}

export function ConfigEditor({ initialContent, path, onSave }: ConfigEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [mode, setMode] = useState<'visual' | 'code'>('visual');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Parsed Config State
  const [commonConfig, setCommonConfig] = useState<CommonConfig>({ serverAddr: '', serverPort: 7000 });
  const [proxies, setProxies] = useState<ProxyConfig[]>([]);

  // Sync content when initialContent changes
  useEffect(() => {
    setContent(initialContent);
    parseConfig(initialContent);
  }, [initialContent]);

  const parseConfig = (text: string) => {
    try {
      // Basic TOML parsing
      // Note: @iarna/toml might fail on some complex frp configs or comments, 
      // but for standard configs it should work.
      // We might need a more robust parser or custom logic if structure is complex.
      const parsed: any = toml.parse(text);
      
      // Extract Common
      const common = parsed.common || {};
      setCommonConfig({
        serverAddr: common.server_addr || '',
        serverPort: common.server_port || 7000,
        token: common.token || '',
        ...common
      });

      // Extract Proxies
      const proxyList: ProxyConfig[] = [];
      Object.keys(parsed).forEach(key => {
        if (key !== 'common') {
          proxyList.push({
            name: key,
            ...parsed[key]
          });
        }
      });
      setProxies(proxyList);

    } catch (e) {
      console.warn('Failed to parse TOML for visual editor', e);
      // Fallback to code mode if parsing fails
      // setMode('code'); 
    }
  };

  const generateToml = () => {
    const configObj: any = {};
    
    // Add Common
    configObj.common = {
      server_addr: commonConfig.serverAddr,
      server_port: Number(commonConfig.serverPort),
      ...(commonConfig.token ? { token: commonConfig.token } : {}),
      ...Object.keys(commonConfig).reduce((acc: any, key) => {
          if (!['serverAddr', 'serverPort', 'token'].includes(key)) {
              acc[key] = commonConfig[key];
          }
          return acc;
      }, {})
    };

    // Add Proxies
    proxies.forEach(p => {
        const { name, ...rest } = p;
        configObj[name] = {
            ...rest,
            ...(rest.localPort ? { local_port: Number(rest.localPort) } : {}),
            ...(rest.remotePort ? { remote_port: Number(rest.remotePort) } : {}),
        };
    });

    try {
        return toml.stringify(configObj);
    } catch (e) {
        console.error('Failed to stringify TOML', e);
        return content;
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    
    let contentToSave = content;
    if (mode === 'visual') {
        contentToSave = generateToml();
        setContent(contentToSave); // Sync back to code view
    }

    try {
      await ApiClient.saveConfig(path, contentToSave);
      setSuccess('Configuration saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
      if (onSave) setTimeout(() => onSave(), 500);
    } catch (err: any) {
      setError(err.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  // Proxy Management
  const addProxy = () => {
      const newName = `service_${proxies.length + 1}`;
      setProxies([...proxies, { name: newName, type: 'tcp', localIP: '127.0.0.1', localPort: 80, remotePort: 6000 + proxies.length }]);
  };

  const removeProxy = (index: number) => {
      const newProxies = [...proxies];
      newProxies.splice(index, 1);
      setProxies(newProxies);
  };

  const updateProxy = (index: number, field: string, value: any) => {
      const newProxies = [...proxies];
      newProxies[index] = { ...newProxies[index], [field]: value };
      setProxies(newProxies);
  };

  const updateCommon = (field: string, value: any) => {
      setCommonConfig({ ...commonConfig, [field]: value });
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
            <h3 className="text-lg font-medium">Configuration</h3>
            <div className="flex bg-muted rounded-lg p-1">
                <Button 
                    variant={mode === 'visual' ? 'secondary' : 'ghost'} 
                    size="sm" 
                    onClick={() => {
                        if (mode === 'code') parseConfig(content);
                        setMode('visual');
                    }}
                >
                    <LayoutList className="h-4 w-4 mr-2" /> Visual
                </Button>
                <Button 
                    variant={mode === 'code' ? 'secondary' : 'ghost'} 
                    size="sm" 
                    onClick={() => {
                        if (mode === 'visual') setContent(generateToml());
                        setMode('code');
                    }}
                >
                    <Code className="h-4 w-4 mr-2" /> Code
                </Button>
            </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {saving ? 'Saving...' : 'Save & Restart'}
        </Button>
      </div>

      {error && <div className="p-2 text-sm text-red-500 bg-red-50 rounded">{error}</div>}
      {success && <div className="p-2 text-sm text-green-500 bg-green-50 rounded">{success}</div>}

      {mode === 'code' ? (
        <textarea
          className="w-full flex-1 p-4 font-mono text-sm bg-slate-950 text-slate-50 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary min-h-[500px]"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          spellCheck={false}
        />
      ) : (
        <ScrollArea className="flex-1 border rounded-md p-4 h-[600px]">
            <div className="space-y-6">
                {/* Common Config */}
                <Card>
                    <CardHeader>
                        <CardTitle>Server Settings (Common)</CardTitle>
                        <CardDescription>Connection details for the FRPS server</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Server Address</Label>
                            <Input 
                                value={commonConfig.serverAddr} 
                                onChange={(e) => updateCommon('serverAddr', e.target.value)} 
                                placeholder="x.x.x.x"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Server Port</Label>
                            <Input 
                                type="number"
                                value={commonConfig.serverPort} 
                                onChange={(e) => updateCommon('serverPort', e.target.value)} 
                                placeholder="7000"
                            />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label>Auth Token</Label>
                            <Input 
                                type="password"
                                value={commonConfig.token || ''} 
                                onChange={(e) => updateCommon('token', e.target.value)} 
                                placeholder="Secret Token"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Proxies */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h4 className="text-lg font-semibold">Proxies</h4>
                        <Button size="sm" variant="outline" onClick={addProxy}>
                            <Plus className="h-4 w-4 mr-2" /> Add Proxy
                        </Button>
                    </div>

                    {proxies.map((proxy, idx) => (
                        <Card key={idx} className="relative group">
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => removeProxy(idx)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                            <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Name</Label>
                                    <Input 
                                        value={proxy.name} 
                                        onChange={(e) => updateProxy(idx, 'name', e.target.value)} 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Type</Label>
                                    <Select 
                                        value={proxy.type} 
                                        onValueChange={(val) => updateProxy(idx, 'type', val)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="tcp">TCP</SelectItem>
                                            <SelectItem value="udp">UDP</SelectItem>
                                            <SelectItem value="http">HTTP</SelectItem>
                                            <SelectItem value="https">HTTPS</SelectItem>
                                            <SelectItem value="xtcp">XTCP</SelectItem>
                                            <SelectItem value="stcp">STCP</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                
                                <div className="space-y-2">
                                    <Label>Local IP</Label>
                                    <Input 
                                        value={proxy.localIP || '127.0.0.1'} 
                                        onChange={(e) => updateProxy(idx, 'localIP', e.target.value)} 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Local Port</Label>
                                    <Input 
                                        type="number"
                                        value={proxy.localPort || ''} 
                                        onChange={(e) => updateProxy(idx, 'localPort', e.target.value)} 
                                    />
                                </div>

                                {(proxy.type === 'tcp' || proxy.type === 'udp') && (
                                    <div className="space-y-2">
                                        <Label>Remote Port</Label>
                                        <Input 
                                            type="number"
                                            value={proxy.remotePort || ''} 
                                            onChange={(e) => updateProxy(idx, 'remotePort', e.target.value)} 
                                        />
                                    </div>
                                )}

                                {(proxy.type === 'http' || proxy.type === 'https') && (
                                    <div className="space-y-2 md:col-span-2">
                                        <Label>Custom Domains</Label>
                                        <Input 
                                            value={Array.isArray(proxy.customDomains) ? proxy.customDomains.join(',') : (proxy.customDomains || '')} 
                                            onChange={(e) => updateProxy(idx, 'customDomains', e.target.value.split(','))} 
                                            placeholder="example.com,www.example.com"
                                        />
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                    
                    {proxies.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                            No proxies configured. Click "Add Proxy" to start.
                        </div>
                    )}
                </div>
            </div>
        </ScrollArea>
      )}
      
      <p className="text-xs text-muted-foreground">
        Note: Saving will overwrite the file at <code>{path}</code> and automatically restart the service.
      </p>
    </div>
  );
}
