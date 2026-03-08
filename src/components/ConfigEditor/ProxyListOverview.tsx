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
}

export function ProxyListOverview({ 
  proxies, 
  parseError, 
  selectionMode, 
  selectedProxies, 
  onToggleSelection, 
  onEdit, 
  onDelete,
  onAdd
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
              }
            }}
          >
             <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-start gap-2">
                   <div className="font-semibold truncate flex-1" title={p.name}>{p.name}</div>
                   {/* Badge moved to second line */}
                </div>
                
                <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                   <Badge variant="secondary" className="uppercase text-xs font-mono shrink-0 mr-1">{p.type}</Badge>
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

                {/* Selection Checkbox */}
                {selectionMode && (
                  <div className="absolute top-3 right-3 pointer-events-none">
                    <Checkbox 
                      checked={isSelected}
                      className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground border-primary h-5 w-5"
                    />
                  </div>
                )}

                {/* Actions Menu (Only when not in selection mode) */}
                {!selectionMode && (
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(p)}>
                          <Pencil className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDelete(p.name)} className="text-red-600 focus:text-red-600">
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
             </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
