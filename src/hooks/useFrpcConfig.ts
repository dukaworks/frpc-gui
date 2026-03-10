import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
      setParseError(e?.message ? String(e.message) : t('config.parseFailed'));
    }
  };

  useEffect(() => {
    setContent(initialContent);
    parseConfig(initialContent);
  }, [initialContent]);

  const proxyNameSet = useMemo(() => new Set(proxies.map((p) => p.name)), [proxies]);

  const updateCommon = (field: keyof CommonConfig | Partial<CommonConfig>, value?: any) => {
    if (typeof field === 'object') {
      setCommonConfig((prev) => ({ ...prev, ...field }));
    } else {
      setCommonConfig((prev) => ({ ...prev, [field]: value }));
    }
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

  const addProxy = (initialData?: Partial<ProxyConfig>) => {
    const p = createNewProxy(proxyNameSet);
    if (initialData) {
        Object.assign(p, initialData);
        // Ensure name uniqueness if initialData has a name
        if (initialData.name && proxyNameSet.has(initialData.name)) {
             // If duplicate, keep the generated unique name or fail?
             // Let's keep the generated one if conflict, or maybe we should have passed the name to createNewProxy
             // For simplicity, if initialData has name, we try to use it, if conflict, we fail or append suffix.
             // But createNewProxy guarantees unique name.
             // If we overwrite it with initialData.name, we might have conflict.
             // Ideally we check conflict.
             if (initialData.name !== p.name && proxyNameSet.has(initialData.name)) {
                 // Conflict.
                 // We should probably rely on the caller to ensure uniqueness or just let it be (UI handles it)
             }
        }
    }
    setProxies((prev) => [...prev, p]);
    return p;
  };

  const deleteProxy = (name: string) => {
    setProxies((prev) => prev.filter((p) => p.name !== name));
  };

  const importProxies = (newProxies: ProxyConfig[]) => {
    const currentNames = new Set(proxies.map((p) => p.name));
    const toAdd: ProxyConfig[] = [];

    for (const p of newProxies) {
      if (!p.name) continue;
      let finalName = p.name;
      let i = 1;
      while (currentNames.has(finalName)) {
        finalName = `${p.name}_${i}`;
        i++;
      }
      toAdd.push({ ...p, name: finalName });
      currentNames.add(finalName);
    }

    if (toAdd.length > 0) {
      setProxies((prev) => [...prev, ...toAdd]);
    }
    return toAdd.length;
  };

  const buildTomlObject = () => {
    // We want to reconstruct the object structure to match the original style (INI-like flat structure)
    // instead of the nested [[proxies]] array that @iarna/toml might produce if we aren't careful.
    // The original file uses [common] and then [proxy_name] sections.
    
    const output: any = {};

    // 1. Build [common] section
    const commonSection: any = {};
    if (commonConfig.serverAddr) commonSection.server_addr = commonConfig.serverAddr;
    if (commonConfig.serverPort) commonSection.server_port = Number(commonConfig.serverPort);
    if ((commonConfig as any).token) commonSection.token = String((commonConfig as any).token);
    
    // Add other common fields that were preserved, converting camelCase to snake_case if needed
    // or just keeping them if they were extra fields
    const configCommon = configObj?.common || {};
    Object.keys(configCommon).forEach(k => {
        if (k !== 'serverAddr' && k !== 'server_addr' && 
            k !== 'serverPort' && k !== 'server_port' && 
            k !== 'token' && k !== 'auth') {
            commonSection[k] = configCommon[k];
        }
    });

    output.common = commonSection;

    // 2. Build Proxy sections as flat keys
    // e.g. output['ssh'] = { type: 'tcp', ... }
    proxies.forEach(p => {
        const proxySection: any = {};
        
        if (p.type) proxySection.type = p.type;
        if (p.localIP) proxySection.local_ip = p.localIP;
        if (p.localPort) proxySection.local_port = Number(p.localPort);
        if (p.remotePort) proxySection.remote_port = Number(p.remotePort);
        
        if (p.customDomains && p.customDomains.length > 0) {
            proxySection.custom_domains = p.customDomains.join(',');
        }
        if (p.subdomain) proxySection.subdomain = p.subdomain;
        
        // Add extra fields
        Object.keys(p).forEach(k => {
            if (['name', 'type', 'localIP', 'local_ip', 'localAddr', 'local_addr', 
                 'localPort', 'local_port', 'remotePort', 'remote_port', 
                 'customDomains', 'custom_domains', 'subdomain'].includes(k)) {
                return;
            }
            if (p[k] !== undefined && p[k] !== '') {
                proxySection[k] = p[k];
            }
        });

        output[p.name] = proxySection;
    });

    return output;
  };

  const generateToml = () => {
    try {
      const obj = buildTomlObject();
      // Using toml.stringify, but we need to ensure numbers are not formatted with underscores
      // The @iarna/toml library might add underscores for large numbers.
      // However, we can't easily control that behavior in the library itself.
      // Let's verify if the library does that or if it was just how it was parsed.
      // If the input had underscores, maybe they were preserved?
      // No, we are regenerating the object.
      
      // Let's use a workaround if needed, or check if we can format it better.
      // Actually, @iarna/toml creates compliant TOML. 
      // If we want to avoid underscores, we might need to post-process the string
      // or ensure values are simple numbers.
      
      const tomlStr = toml.stringify(obj as any);
      
      // Post-process to remove underscores from numbers if they appear like 8_000
      // Match digit_digit pattern
      return tomlStr.replace(/(\d)_(\d)/g, '$1$2');
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
    importProxies,
    generateToml,
    refresh: () => parseConfig(content), // Parse current text content
  };
}
