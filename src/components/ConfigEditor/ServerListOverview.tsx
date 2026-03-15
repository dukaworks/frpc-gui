import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Server, MoreHorizontal, Trash2, Edit2, PlayCircle, Plus, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ServerProfile, CommonConfig } from '@/shared/types';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/store/settingsStore';

interface ServerListOverviewProps {
  profiles: ServerProfile[];
  activeConfig: CommonConfig;
  onAdd: () => void;
  onEdit: (profile: ServerProfile) => void;
  onDelete: (id: string) => void;
  onApply: (profile: ServerProfile) => void;
}

export function ServerListOverview({
  profiles,
  activeConfig,
  onAdd,
  onEdit,
  onDelete,
  onApply,
}: ServerListOverviewProps) {
  const { t } = useTranslation();
  const { serverPageSize } = useSettingsStore();
  const [currentPage, setCurrentPage] = useState(1);
  
  const isActive = (profile: ServerProfile) => {
    return (
      profile.serverAddr === activeConfig.serverAddr &&
      profile.serverPort === activeConfig.serverPort &&
      (profile.token || '') === (activeConfig.token || '')
    );
  };

  const effectivePageSize = Math.max(1, serverPageSize);
  const totalPages = Math.max(1, Math.ceil(profiles.length / effectivePageSize));

  useEffect(() => {
    setCurrentPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

  const startIndex = (currentPage - 1) * effectivePageSize;
  const paginatedProfiles = profiles.slice(startIndex, startIndex + effectivePageSize);

  return (
    <div className="space-y-4">
      {profiles.length === 0 ? (
        <Card className="border-dashed border-2 bg-muted/30">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <Server className="h-10 w-10 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground">{t('dashboard.noServerProfiles')}</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm">
              {t('dashboard.noServerProfilesDesc')}
            </p>
            <Button onClick={onAdd}>
              <Plus className="mr-2 h-4 w-4" />
              {t('dashboard.addServer')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {paginatedProfiles.map((profile) => {
              const active = isActive(profile);
              
              return (
                <Card 
                  key={profile.id} 
                  className={cn(
                    "relative transition-all hover:shadow-md",
                    active ? "border-green-500/50 ring-1 ring-green-500/20 bg-card" : "bg-card border-border hover:bg-accent/50"
                  )}
                >
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <div className="space-y-1">
                      <CardTitle className="text-base font-medium flex items-center gap-2">
                        <span className="truncate max-w-[150px]" title={profile.name}>{profile.name}</span>
                        {active && (
                            <Badge variant="default" className="text-[10px] h-5 bg-green-600 hover:bg-green-700 gap-1 pl-1">
                                <CheckCircle2 className="h-3 w-3" />
                                {t('dashboard.online')}
                            </Badge>
                        )}
                      </CardTitle>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Server className="h-3 w-3" />
                          {profile.serverAddr}:{profile.serverPort}
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>{t('common.actions')}</DropdownMenuLabel>
                        {!active && (
                            <DropdownMenuItem onClick={() => onApply(profile)}>
                              <PlayCircle className="mr-2 h-4 w-4" />
                              {t('common.applyAndUse')}
                            </DropdownMenuItem>
                        )}
                        
                        <DropdownMenuItem onClick={() => onEdit(profile)}>
                          <Edit2 className="mr-2 h-4 w-4" />
                          {t('common.edit')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => onDelete(profile.id)}
                          className="text-red-600 focus:text-red-600 focus:bg-red-50"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t('common.delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardHeader>
                  <CardContent>
                     <div className="text-xs text-muted-foreground mt-2 font-mono">
                        {t('dashboard.token')}: {profile.token ? '******' : t('common.none')}
                     </div>
                  </CardContent>
                </Card>
              );
            })}
            
            {/* Add New Card - Always visible or only on last page? 
                Let's keep it always visible for easy access, 
                or maybe better to move it to top toolbar in Dashboard.tsx if we want clean pagination.
                But Dashboard.tsx already has an "Add Server" button at the top.
                So we can probably remove this card if it's redundant, or keep it.
                If we keep it, it will just be another card.
            */}
            <Card className="flex flex-col items-center justify-center border-dashed border-2 hover:border-primary/50 hover:bg-gray-50/50 cursor-pointer transition-colors min-h-[120px]" onClick={onAdd}>
                <Plus className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-sm font-medium text-muted-foreground">{t('dashboard.addNewProfile')}</span>
            </Card>
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
      )}
    </div>
  );
}
