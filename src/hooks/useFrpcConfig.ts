import { useState, useMemo, useEffect } from 'react';
import toml from '@iarna/toml';
import type { CommonConfig, ProxyConfig } from '@/shared/types';

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

export function useFrpcConfig(initialContent: string) {
  const [content, setContent] = useState(initialContent);
  const [configObj, setConfigObj] = useState<any | null>(null);
  const [commonConfig, setCommonConfig] = useState<CommonConfig>({ serverAddr: '', serverPort: 7000 });
  const [proxies, setProxies] = useState<ProxyConfig[]>([]);
  const [legacyProxyNames, setLegacyProxyNames] = useState<string[]>([]);
  const [parseError, setParseError] = useState('');

  // Preprocess TOML content to fix common issues (e.g. spaces in section names without quotes)
  const preprocessToml = (text: string) => {
    if (!text) return '';
    const lines = text.split('\n');
    const processedLines = lines.map(line => {
      let processed = line;
      const trimmed = line.trim();
      
      // Check for section headers: starts with [ and ends with ]
      // But we need to be careful not to match arrays of tables [[...]] or arrays [...] as values
      // A section header is usually the only thing on the line (ignoring comments)
      // And it doesn't have = sign before it
      
      const isSectionHeader = trimmed.startsWith('[') && trimmed.endsWith(']') && !trimmed.startsWith('[[') && !line.includes('=');
      
      if (isSectionHeader) {
        let content = trimmed.slice(1, -1).trim();
        
        // Handle quoted content inside brackets e.g. ["foo"]
        if ((content.startsWith('"') && content.endsWith('"')) || (content.startsWith("'") && content.endsWith("'"))) {
             return processed;
        }

        // Skip common section
        if (content === 'common') return processed;

        // Check for special characters that need quoting in TOML keys
        // TOML bare keys only support A-Za-z0-9_-
        // If it contains spaces, @, ., or other chars, it must be quoted
        const needsQuote = /[^A-Za-z0-9_-]/.test(content);
        
        if (needsQuote) {
             return `["${content}"]`;
        }
        return processed;
      }

      // 2. Fix Unquoted String Values (IPs, Tokens)
      // Match basic key = value pattern, allowing for dots in keys or quoted keys
      // e.g. local_ip = 192.168.1.1 or "local_ip" = 192.168.1.1
      const kvMatch = processed.match(/^(\s*(?:[a-zA-Z0-9_-]+|"[^"]+"|'[^']+')\s*=\s*)(.+)$/);
      
      if (kvMatch) {
          const prefix = kvMatch[1];
          let valuePart = kvMatch[2];
          
          // Check for comment
          let comment = '';
          const commentIdx = valuePart.indexOf('#');
          if (commentIdx !== -1) {
              comment = valuePart.slice(commentIdx);
              valuePart = valuePart.slice(0, commentIdx);
          }
          
          let value = valuePart.trim();
          
          // Skip if empty or already quoted or array/table
          if (!value || 
              value.startsWith('"') || 
              value.startsWith("'") || 
              value.startsWith('[') || 
              value.startsWith('{') ||
              value === 'true' || 
              value === 'false') {
              return processed;
          }
          
          // Check if number (integer or float)
          const isNumber = /^-?\d+(\.\d+)?$/.test(value);
          if (isNumber) return processed;
          
          // If we are here, it's likely an unquoted string (like IP or token)
          // Quote it
          return `${prefix}"${value}" ${comment}`;
      }

      return processed;
    });
    return processedLines.join('\n');
  };

  // Re-parse when initialContent changes or when manually triggered
  const parseConfig = (text: string) => {
    setParseError('');
    try {
      if (!text.trim()) {
          setConfigObj({});
          setCommonConfig({ serverAddr: '', serverPort: 7000 });
          setProxies([]);
          return;
      }
      
      const safeText = preprocessToml(text);
      const parsed: any = toml.parse(safeText);
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
    } catch (e: any) {
      setConfigObj(null);
      setLegacyProxyNames([]);
      setProxies([]);
      setParseError(e?.message ? String(e.message) : '配置解析失败');
    }
  };

  useEffect(() => {
    setContent(initialContent);
    parseConfig(initialContent);
  }, [initialContent]);

  const proxyNameSet = useMemo(() => new Set(proxies.map((p) => p.name)), [proxies]);

  const updateCommon = (field: keyof CommonConfig, value: any) => {
    setCommonConfig((prev) => ({ ...prev, [field]: value }));
  };

  const updateProxy = (name: string, patch: Partial<ProxyConfig>) => {
    setProxies((prev) =>
      prev.map((p) => (p.name === name ? { ...p, ...patch } : p))
    );
  };
  
  const renameProxy = (oldName: string, newName: string) => {
      const trimmed = newName.trim();
      if (!trimmed) return false;
      if (trimmed !== oldName && proxyNameSet.has(trimmed)) {
          return false; // Duplicate
      }
      setProxies((prev) => prev.map((p) => (p.name === oldName ? { ...p, name: trimmed } : p)));
      return true;
  };

  const addProxy = () => {
    const p = createNewProxy(proxyNameSet);
    setProxies((prev) => [...prev, p]);
    return p;
  };

  const deleteProxy = (name: string) => {
    setProxies((prev) => prev.filter((p) => p.name !== name));
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
      console.error('TOML generation failed', e);
      return content;
    }
  };

  return {
    content,
    setContent,
    parseError,
    commonConfig,
    proxies,
    updateCommon,
    updateProxy,
    renameProxy,
    addProxy,
    deleteProxy,
    generateToml,
    refresh: () => parseConfig(content), // Parse current text content
  };
}
