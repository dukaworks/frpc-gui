import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, MoreHorizontal, Pencil, Trash2, LayoutGrid, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ProxyConfig } from '@/shared/types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/store/settingsStore';

interface ProxyListOverviewProps {
  proxies: ProxyConfig[];
  parseError?: string;
  selectionMode: boolean;
  selectedProxies: Set<string>;
  onToggleSelection: (name: string) => void;
  onEdit: (proxy: ProxyConfig) => void;
  onDelete: (name: string) => void;
  onAdd: () => void;
  logs?: string;
}

// Get all proxy names that have recent errors
function getErrorProxyNames(logs?: string): Set<string> {
  const errorNames = new Set<string>();
  if (!logs) return errorNames;

  for (const rawLine of logs.split('\n')) {
    const line = rawLine.trim();
    if (!line.includes('[E]')) continue;
    // Real frpc format:
    //   [E] [file.go:line] [runId] [PROXY_NAME] connect to local service [IP:PORT] error: ...
    // Strategy: split by "connect to local", the 4th bracket in the left part is the proxy name.
    // This avoids complex regex issues with nested brackets and character class escaping.
    const beforeConnect = line.split('connect to local')[0];
    const brackets = beforeConnect.match(/\[([^\]]+)\]/g);
    if (brackets && brackets.length >= 4) {
      // 4th bracket (0-indexed: index 3), strip the surrounding []
      const name = brackets[3].slice(1, -1);
      errorNames.add(name);
    }
  }

  return errorNames;
}

function getProxyStatus(proxy: ProxyConfig, logs?: string): 'online' | 'error' {
  if (!logs) return 'online';
  
  // Get proxy names with recent errors (last 100 lines)
  const recentLogs = logs.split('\n').slice(-100).join('\n');
  const errorNames = getErrorProxyNames(recentLogs);
  
  if (errorNames.has(proxy.name)) {
    return 'error';
  }
  
  return 'online';
}

export function ProxyListOverview({ 
  proxies, 
  parseError, 
  selectionMode, 
  selectedProxies, 
  onToggleSelection, 
  onEdit, 
  onDelete,
  onAdd,
  logs
}: ProxyListOverviewProps) {
  const { t } = useTranslation();
  const { proxyPageSize } = useSettingsStore();
  const [currentPage, setCurrentPage] = useState(1);

  const effectivePageSize = Math.max(1, proxyPageSize);
  const totalPages = Math.max(1, Math.ceil(proxies.length / effectivePageSize));

  useEffect(() => {
    setCurrentPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);
  
  if (parseError) {
      return (
          <div className="p-4 text-amber-600 bg-amber-50 rounded-md">
              <p className="font-semibold mb-1">{t('common.error')}</p>
              <p className="text-sm opacity-90">{parseError}</p>
              <p className="text-xs mt-2 text-amber-700/70">
                  {t('dashboard.configEditor')} → "Source Mode"
              </p>
          </div>
      );
  }

  if (proxies.length === 0) {
      return (
        <Card className="border-dashed border-2 bg-gray-50/50">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <LayoutGrid className="h-10 w-10 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-gray-900">{t('dashboard.noActiveProxies')}</h3>
            <p className="text-sm text-gray-500 mb-4 max-w-sm">
              {t('dashboard.noActiveProxiesDesc')}
            </p>
            <Button onClick={onAdd}>
              <Plus className="mr-2 h-4 w-4" />
              {t('dashboard.addFirstProxy')}
            </Button>
          </CardContent>
        </Card>
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

  const startIndex = (currentPage - 1) * effectivePageSize;
  const paginatedProxies = proxies.slice(startIndex, startIndex + effectivePageSize);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {paginatedProxies.map(p => {
          const isSelected = selectedProxies.has(p.name);
          const status = getProxyStatus(p, logs);
          
          return (
            <Card 
              key={p.name} 
              className={cn(
                "hover:shadow-md transition-all relative group cursor-pointer",
                selectionMode && isSelected && "bg-muted/50 border-primary/50"
              )}
              onClick={(e) => {
                // Prevent triggering when clicking on menu
                if ((e.target as HTMLElement).closest('[role="menuitem"]')) return;
                if ((e.target as HTMLElement).closest('button')) return;
                
                if (selectionMode) {
                  onToggleSelection(p.name);
                } else {
                  onEdit(p);
                }
              }}
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      {status === 'online' && (
                        <Badge className="bg-green-500 hover:bg-green-600 border-none h-2 w-2 p-0 rounded-full" title={t('dashboard.online')} />
                      )}
                      {status === 'error' && (
                        <Badge className="bg-red-500 hover:bg-red-600 border-none h-2 w-2 p-0 rounded-full animate-pulse" title={t('dashboard.offline')} />
                      )}
                      <h3 className="font-semibold text-sm truncate max-w-[120px]" title={p.name}>{p.name}</h3>
                    </div>
                    <Badge variant="outline" className="text-xs font-normal border-primary/20 text-primary bg-primary/5 uppercase">
                      {p.type}
                    </Badge>
                  </div>
                  
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    {selectionMode && (
                      <Checkbox 
                        checked={isSelected}
                        onCheckedChange={() => onToggleSelection(p.name)}
                      />
                    )}
                    
                    {!selectionMode && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6 -mt-1 -mr-2">
                            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(p)} className="hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground cursor-pointer">
                            <Pencil className="mr-2 h-4 w-4" />
                            {t('common.edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => onDelete(p.name)}
                            className="text-red-600 hover:bg-red-50 hover:text-red-700 focus:bg-red-50 focus:text-red-700 cursor-pointer"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {t('common.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>

                <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
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
                        {t('proxy.moreDomains', { count: p.customDomains.length - 1 })}
                    </div>
                )}
               </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex items-center justify-end gap-2 mt-4">
        <span className="text-sm text-muted-foreground">
           {t('common.page')} {currentPage} / {totalPages}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
