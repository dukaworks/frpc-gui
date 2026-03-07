import { useEffect, useMemo, useState } from 'react';
import toml from '@iarna/toml';

import { ApiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Plus, Save, Trash2, Code, LayoutList } from 'lucide-react';

import type { CommonConfig, ProxyConfig } from '@/shared/types';

interface ConfigEditorProps {
  initialContent: string;
  path: string;
  onSave?: () => void;
}

type ProxyType = ProxyConfig['type'];

function toNumberOrUndefined(v: unknown) {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : undefined;
}

function normalizeCommon(common: any): CommonConfig {
  const serverAddr = common?.serverAddr ?? common?.server_addr ?? '';
  const serverPort = common?.serverPort ?? common?.server_port ?? 7000;
  const token = common?.auth?.token ?? common?.token ?? common?.auth_token ?? '';

  return {
    serverAddr: String(serverAddr ?? ''),
    serverPort: toNumberOrUndefined(serverPort) ?? 7000,
    token: token ? String(token) : undefined,
    ...(common || {}),
  };
}

function normalizeProxy(raw: any): ProxyConfig {
  const name = raw?.name ?? raw?.proxyName ?? raw?.proxy_name ?? '';
  const type = (raw?.type ?? 'tcp') as ProxyType;

  const localIP = raw?.localIP ?? raw?.local_ip ?? raw?.localAddr ?? raw?.local_addr ?? '127.0.0.1';
  const localPort = raw?.localPort ?? raw?.local_port;
  const remotePort = raw?.remotePort ?? raw?.remote_port;
  const customDomains = raw?.customDomains ?? raw?.custom_domains;

  return {
    name: String(name ?? ''),
    type,
    localIP: localIP ? String(localIP) : undefined,
    localPort: toNumberOrUndefined(localPort),
    remotePort: toNumberOrUndefined(remotePort),
    customDomains: Array.isArray(customDomains)
      ? customDomains.map((d: any) => String(d))
      : typeof customDomains === 'string'
        ? customDomains.split(',').map((s) => s.trim()).filter(Boolean)
        : undefined,
    subdomain: raw?.subdomain ? String(raw.subdomain) : undefined,
    ...raw,
  };
}

function createNewProxy(existingNames: Set<string>): ProxyConfig {
  const base = 'proxy';
  let i = 1;
  let name = `${base}_${i}`;
  while (existingNames.has(name)) {
    i += 1;
    name = `${base}_${i}`;
  }
  return {
    name,
    type: 'tcp',
    localIP: '127.0.0.1',
    localPort: 80,
    remotePort: 6000 + i,
  };
}

export function ConfigEditor({ initialContent, path, onSave }: ConfigEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [mode, setMode] = useState<'visual' | 'code'>('visual');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [configObj, setConfigObj] = useState<any | null>(null);
  const [legacyProxyNames, setLegacyProxyNames] = useState<string[]>([]);

  const [commonConfig, setCommonConfig] = useState<CommonConfig>({ serverAddr: '', serverPort: 7000 });
  const [proxies, setProxies] = useState<ProxyConfig[]>([]);
  const [selectedProxyName, setSelectedProxyName] = useState<string | null>(null);
  const [proxyFilter, setProxyFilter] = useState('');

  const selectedProxy = useMemo(
    () => proxies.find((p) => p.name === selectedProxyName) ?? null,
    [proxies, selectedProxyName]
  );

  const parsedOk = !!configObj;

  const parseConfig = (text: string) => {
    setError('');
    try {
      const parsed: any = toml.parse(text);
      setConfigObj(parsed);

      const commonRaw = parsed?.common ?? {};
      setCommonConfig(normalizeCommon(commonRaw));

      const legacyNames: string[] = [];
      let proxyList: ProxyConfig[] = [];

      if (Array.isArray(parsed?.proxies)) {
        proxyList = parsed.proxies.map((p: any) => normalizeProxy(p));
      } else {
        const rootKeys = Object.keys(parsed || {});
        const candidates = rootKeys
          .filter((k) => k !== 'common' && k !== 'proxies')
          .map((k) => ({ name: k, value: (parsed as any)[k] }))
          .filter((kv) => kv.value && typeof kv.value === 'object');

        const proxyLike = candidates.filter((kv) => {
          const v = kv.value;
          return typeof v.type === 'string' || v.localPort != null || v.local_port != null;
        });

        proxyList = proxyLike.map((kv) => {
          legacyNames.push(kv.name);
          return normalizeProxy({ name: kv.name, ...kv.value });
        });
      }

      setLegacyProxyNames(legacyNames);
      setProxies(proxyList);
      setSelectedProxyName(proxyList[0]?.name ?? null);
    } catch (e: any) {
      setConfigObj(null);
      setLegacyProxyNames([]);
      setProxies([]);
      setSelectedProxyName(null);
      setError(e?.message ? String(e.message) : '配置解析失败');
      setMode('code');
    }
  };

  useEffect(() => {
    setContent(initialContent);
    parseConfig(initialContent);
  }, [initialContent]);

  const proxyNameSet = useMemo(() => new Set(proxies.map((p) => p.name)), [proxies]);

  const filteredProxies = useMemo(() => {
    const q = proxyFilter.trim().toLowerCase();
    if (!q) return proxies;
    return proxies.filter((p) => `${p.name} ${p.type}`.toLowerCase().includes(q));
  }, [proxies, proxyFilter]);

  const updateCommon = (field: keyof CommonConfig, value: any) => {
    setCommonConfig((prev) => ({ ...prev, [field]: value }));
  };

  const updateSelectedProxy = (patch: Partial<ProxyConfig>) => {
    if (!selectedProxyName) return;
    setProxies((prev) =>
      prev.map((p) => (p.name === selectedProxyName ? { ...p, ...patch } : p))
    );
  };

  const renameSelectedProxy = (nextName: string) => {
    if (!selectedProxyName) return;
    const trimmed = nextName.trim();
    if (!trimmed) return;
    if (trimmed !== selectedProxyName && proxyNameSet.has(trimmed)) {
      setError('代理名称重复，请换一个');
      return;
    }
    setError('');
    setProxies((prev) => prev.map((p) => (p.name === selectedProxyName ? { ...p, name: trimmed } : p)));
    setSelectedProxyName(trimmed);
  };

  const addProxy = () => {
    const p = createNewProxy(proxyNameSet);
    setProxies((prev) => [...prev, p]);
    setSelectedProxyName(p.name);
  };

  const deleteSelectedProxy = () => {
    if (!selectedProxyName) return;
    const idx = proxies.findIndex((p) => p.name === selectedProxyName);
    const next = proxies.filter((p) => p.name !== selectedProxyName);
    setProxies(next);
    const fallback = next[Math.min(idx, next.length - 1)]?.name ?? null;
    setSelectedProxyName(fallback);
  };

  const buildTomlObject = () => {
    const base = configObj ? JSON.parse(JSON.stringify(configObj)) : {};

    const commonRaw = base.common && typeof base.common === 'object' ? base.common : {};
    const nextCommon: any = { ...commonRaw };
    nextCommon.serverAddr = commonConfig.serverAddr;
    nextCommon.serverPort = Number(commonConfig.serverPort);

    const token = (commonConfig as any).token ? String((commonConfig as any).token) : '';
    if (token) {
      nextCommon.auth = { ...(nextCommon.auth || {}), token };
      delete nextCommon.token;
      delete nextCommon.auth_token;
    } else {
      if (nextCommon.auth && typeof nextCommon.auth === 'object') {
        delete nextCommon.auth.token;
        if (Object.keys(nextCommon.auth).length === 0) delete nextCommon.auth;
      }
      delete nextCommon.token;
      delete nextCommon.auth_token;
    }

    base.common = nextCommon;

    base.proxies = proxies.map((p) => {
      const raw: any = { ...p };
      if (raw.localPort != null) raw.localPort = Number(raw.localPort);
      if (raw.remotePort != null) raw.remotePort = Number(raw.remotePort);
      if (Array.isArray(raw.customDomains)) {
        raw.customDomains = raw.customDomains.map((d: any) => String(d)).filter(Boolean);
        if (raw.customDomains.length === 0) delete raw.customDomains;
      }

      Object.keys(raw).forEach((k) => {
        if (raw[k] === undefined || raw[k] === '') delete raw[k];
      });

      return raw;
    });

    if (legacyProxyNames.length > 0) {
      for (const k of legacyProxyNames) {
        delete base[k];
      }
    }

    return base;
  };

  const generateToml = () => {
    try {
      const obj = buildTomlObject();
      return toml.stringify(obj as any);
    } catch (e) {
      return content;
    }
  };

  const validateBeforeSave = () => {
    const names = proxies.map((p) => p.name.trim()).filter(Boolean);
    if (names.length !== proxies.length) {
      setError('存在空的代理名称');
      return false;
    }
    const set = new Set(names);
    if (set.size !== names.length) {
      setError('存在重复的代理名称');
      return false;
    }
    setError('');
    return true;
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    let contentToSave = content;
    if (mode === 'visual') {
      if (!validateBeforeSave()) {
        setSaving(false);
        return;
      }
      contentToSave = generateToml();
      setContent(contentToSave);
    }

    try {
      await ApiClient.saveConfig(path, contentToSave);
      setSuccess('已保存');
      setTimeout(() => setSuccess(''), 2000);
      if (onSave) setTimeout(() => onSave(), 300);
    } catch (err: any) {
      setError(err.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const renderProxyEditor = () => {
    if (!selectedProxy) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>代理</CardTitle>
            <CardDescription>新增或选择一个代理进行编辑</CardDescription>
          </CardHeader>
        </Card>
      );
    }

    const type = (selectedProxy.type || 'tcp') as ProxyType;
    const showRemotePort = type === 'tcp' || type === 'udp';
    const showDomains = type === 'http' || type === 'https';

    return (
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle>代理：{selectedProxy.name}</CardTitle>
            <CardDescription>增删改查你的代理配置</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={deleteSelectedProxy}>
            <Trash2 className="h-4 w-4 mr-2" />
            删除
          </Button>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>名称</Label>
            <Input value={selectedProxy.name} onChange={(e) => renameSelectedProxy(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>类型</Label>
            <Select value={type} onValueChange={(v) => updateSelectedProxy({ type: v as ProxyType })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tcp">tcp</SelectItem>
                <SelectItem value="udp">udp</SelectItem>
                <SelectItem value="http">http</SelectItem>
                <SelectItem value="https">https</SelectItem>
                <SelectItem value="xtcp">xtcp</SelectItem>
                <SelectItem value="stcp">stcp</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>本地 IP</Label>
            <Input
              value={selectedProxy.localIP || ''}
              onChange={(e) => updateSelectedProxy({ localIP: e.target.value })}
              placeholder="127.0.0.1"
            />
          </div>
          <div className="space-y-2">
            <Label>本地端口</Label>
            <Input
              type="number"
              value={selectedProxy.localPort ?? ''}
              onChange={(e) => updateSelectedProxy({ localPort: toNumberOrUndefined(e.target.value) })}
              placeholder="80"
            />
          </div>

          {showRemotePort && (
            <div className="space-y-2">
              <Label>远端端口</Label>
              <Input
                type="number"
                value={selectedProxy.remotePort ?? ''}
                onChange={(e) => updateSelectedProxy({ remotePort: toNumberOrUndefined(e.target.value) })}
                placeholder="6000"
              />
            </div>
          )}

          {showDomains && (
            <>
              <div className="space-y-2 md:col-span-2">
                <Label>自定义域名（逗号分隔）</Label>
                <Input
                  value={(selectedProxy.customDomains || []).join(', ')}
                  onChange={(e) =>
                    updateSelectedProxy({
                      customDomains: e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="a.example.com, b.example.com"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>子域名</Label>
                <Input
                  value={selectedProxy.subdomain || ''}
                  onChange={(e) => updateSelectedProxy({ subdomain: e.target.value || undefined })}
                  placeholder="blog"
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between sm:justify-start gap-3">
          <h3 className="text-lg font-medium">配置编辑</h3>
          <div className="flex bg-muted rounded-lg p-1">
            <Button
              variant={mode === 'visual' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => {
                if (mode === 'code') parseConfig(content);
                setMode('visual');
              }}
              disabled={!parsedOk && mode !== 'visual'}
            >
              <LayoutList className="h-4 w-4 mr-2" />
              可视化
            </Button>
            <Button
              variant={mode === 'code' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => {
                if (mode === 'visual') setContent(generateToml());
                setMode('code');
              }}
            >
              <Code className="h-4 w-4 mr-2" />
              源码
            </Button>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {saving ? '保存中…' : '保存并重启'}
        </Button>
      </div>

      {error && <div className="p-2 text-sm text-red-600 bg-red-50 rounded">{error}</div>}
      {success && <div className="p-2 text-sm text-green-600 bg-green-50 rounded">{success}</div>}

      {mode === 'code' ? (
        <textarea
          className="w-full flex-1 p-4 font-mono text-sm bg-slate-950 text-slate-50 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary min-h-[500px]"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          spellCheck={false}
        />
      ) : (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-4 min-h-[600px]">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>服务器（Common）</CardTitle>
                <CardDescription>FRPS 连接信息</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Server Addr</Label>
                  <Input value={commonConfig.serverAddr} onChange={(e) => updateCommon('serverAddr', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Server Port</Label>
                  <Input
                    type="number"
                    value={commonConfig.serverPort}
                    onChange={(e) => updateCommon('serverPort', toNumberOrUndefined(e.target.value) ?? 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Token</Label>
                  <Input
                    type="password"
                    value={(commonConfig as any).token || ''}
                    onChange={(e) => updateCommon('token' as any, e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle>代理列表</CardTitle>
                  <CardDescription>选择一个代理编辑，或新增</CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={addProxy}>
                  <Plus className="h-4 w-4 mr-2" />
                  新增
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input value={proxyFilter} onChange={(e) => setProxyFilter(e.target.value)} placeholder="搜索代理…" />
                <ScrollArea className="h-[320px] rounded-md border">
                  <div className="p-2 space-y-1">
                    {filteredProxies.length === 0 ? (
                      <div className="text-sm text-muted-foreground p-2">暂无代理</div>
                    ) : (
                      filteredProxies.map((p) => (
                        <button
                          key={p.name}
                          type="button"
                          onClick={() => setSelectedProxyName(p.name)}
                          className={
                            'w-full text-left rounded-md px-3 py-2 transition-colors ' +
                            (p.name === selectedProxyName
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-muted')
                          }
                        >
                          <div className="flex items-center justify-between">
                            <div className="font-medium truncate">{p.name}</div>
                            <div className={
                              'text-xs ' +
                              (p.name === selectedProxyName ? 'opacity-90' : 'text-muted-foreground')
                            }>
                              {p.type}
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3">
            {renderProxyEditor()}
          </div>
        </div>
      )}
    </div>
  );
}

