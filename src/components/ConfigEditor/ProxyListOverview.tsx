import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, MoreHorizontal, Pencil, Trash2, LayoutGrid, Plus } from 'lucide-react';
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

function getProxyStatus(proxyName: string, logs?: string): 'online' | 'error' {
  if (!logs) return 'online'; // Default to online if no logs
  
  const lines = logs.split('\n');
  let hasError = false;
  
  // Iterate through logs to find any error for this proxy
  for (const line of lines) {
    if (line.includes(`[${proxyName}]`) && (line.includes('error') || line.includes('login to server failed'))) {
      hasError = true;
      break; // Found an error, that's enough
    }
  }
  
  return hasError ? 'error' : 'online';
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
        <Card className="border-dashed border-2 bg-gray-50/50">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <LayoutGrid className="h-10 w-10 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No Active Proxies</h3>
            <p className="text-sm text-gray-500 mb-4 max-w-sm">
              Create proxy tunnels to expose your local services to the internet.
            </p>
            <Button onClick={onAdd}>
              <Plus className="mr-2 h-4 w-4" />
              Add First Proxy
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

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {proxies.map(p => {
        const isSelected = selectedProxies.has(p.name);
        const status = getProxyStatus(p.name, logs);
        
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
                      <Badge className="bg-green-500 hover:bg-green-600 border-none h-2 w-2 p-0 rounded-full" title="Online" />
                    )}
                    {status === 'error' && (
                      <Badge className="bg-red-500 hover:bg-red-600 border-none h-2 w-2 p-0 rounded-full" title="Error" />
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
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => onDelete(p.name)}
                          className="text-red-600 hover:bg-red-50 hover:text-red-700 focus:bg-red-50 focus:text-red-700 cursor-pointer"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
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
                      +{p.customDomains.length - 1} more domains
                  </div>
              )}
             </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
