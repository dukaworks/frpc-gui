import { useFrpcConfig } from '@/hooks/useFrpcConfig';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight } from 'lucide-react';
import type { ProxyConfig } from '@/shared/types';

export function ProxyListOverview({ content }: { content: string }) {
  const { proxies, parseError } = useFrpcConfig(content);

  if (!content) {
    return <div className="text-muted-foreground p-4">暂无配置内容</div>;
  }
  
  if (parseError) {
      return (
          <div className="p-4 text-amber-600 bg-amber-50 rounded-md">
              <p className="font-semibold mb-1">配置解析失败</p>
              <p className="text-sm opacity-90">{parseError}</p>
              <p className="text-xs mt-2 text-amber-700/70">
                  请切换到 "Edit Config" → "源码模式" 手动修复，或检查是否有不符合 TOML 规范的内容。
              </p>
          </div>
      );
  }

  if (proxies.length === 0) {
      return (
         <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
            暂无代理配置。请点击 "Edit" 标签页添加代理。
         </div>
      );
  }

  const getLocalAddress = (p: ProxyConfig) => {
    return `${p.localIP || '127.0.0.1'}:${p.localPort}`;
  };

  const getRemoteAddress = (p: ProxyConfig) => {
    if (p.type === 'tcp' || p.type === 'udp') {
      return `:${p.remotePort}`;
    }
    // For http/https
    if (p.customDomains && p.customDomains.length > 0) {
      return p.customDomains[0];
    }
    if (p.subdomain) {
      return `${p.subdomain}.*`;
    }
    return '-';
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {proxies.map(p => (
        <Card key={p.name} className="hover:shadow-md transition-shadow">
           <CardContent className="p-4 space-y-3">
              <div className="flex justify-between items-start">
                 <div className="font-semibold truncate max-w-[70%]" title={p.name}>{p.name}</div>
                 <Badge variant="secondary" className="uppercase text-xs font-mono">{p.type}</Badge>
              </div>
              
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                 <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                    {getLocalAddress(p)}
                 </span>
                 <ArrowRight className="h-3 w-3" />
                 <span className="font-medium text-foreground">
                    {getRemoteAddress(p)}
                 </span>
              </div>
              
              {p.type !== 'tcp' && p.type !== 'udp' && p.customDomains && p.customDomains.length > 1 && (
                  <div className="text-xs text-muted-foreground truncate" title={p.customDomains.join(', ')}>
                      +{p.customDomains.length - 1} more domains
                  </div>
              )}
           </CardContent>
        </Card>
      ))}
    </div>
  );
}
