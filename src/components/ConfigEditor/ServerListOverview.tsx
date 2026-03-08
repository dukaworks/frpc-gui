import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Server, MoreHorizontal, Trash2, Edit2, PlayCircle, Plus, Lock, CheckCircle2 } from 'lucide-react';
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
  
  const isActive = (profile: ServerProfile) => {
    return (
      profile.serverAddr === activeConfig.serverAddr &&
      profile.serverPort === activeConfig.serverPort &&
      (profile.token || '') === (activeConfig.token || '')
    );
  };

  return (
    <div className="space-y-4">
      {profiles.length === 0 ? (
        <Card className="border-dashed border-2 bg-gray-50/50">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <Server className="h-10 w-10 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No Server Profiles</h3>
            <p className="text-sm text-gray-500 mb-4 max-w-sm">
              Create server profiles to quickly switch between different FRPS servers.
            </p>
            <Button onClick={onAdd}>
              <Plus className="mr-2 h-4 w-4" />
              Add First Profile
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile) => {
            const active = isActive(profile);
            const isSsh = (profile as any).isSshImport;
            
            return (
              <Card 
                key={profile.id} 
                className={cn(
                  "relative transition-all hover:shadow-md",
                  active ? "bg-white border-green-500/50 ring-1 ring-green-500/20" : "bg-gray-50/50 border-gray-200"
                )}
              >
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                      {isSsh ? (
                          <Badge variant="secondary" className="text-[10px] h-5 bg-blue-100 text-blue-700 hover:bg-blue-100">SSH</Badge>
                      ) : (
                          <Badge variant="secondary" className="text-[10px] h-5 bg-orange-100 text-orange-700 hover:bg-orange-100">Manual</Badge>
                      )}
                      <span className="truncate max-w-[150px]" title={profile.name}>{profile.name}</span>
                      {active && (
                          <Badge variant="default" className="text-[10px] h-5 bg-green-600 hover:bg-green-700 gap-1 pl-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Active
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
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      {!active && (
                          <DropdownMenuItem onClick={() => onApply(profile)}>
                            <PlayCircle className="mr-2 h-4 w-4" />
                            Apply & Use
                          </DropdownMenuItem>
                      )}
                      
                      {isSsh ? (
                          <>
                             <DropdownMenuItem onClick={() => onEdit(profile)}>
                                <Edit2 className="mr-2 h-4 w-4" />
                                Edit Connection
                             </DropdownMenuItem>
                             <DropdownMenuSeparator />
                             <DropdownMenuItem 
                                onClick={() => onDelete(profile.id)}
                                className="text-red-600 focus:text-red-600 focus:bg-red-50"
                             >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                             </DropdownMenuItem>
                          </>
                      ) : (
                          <>
                            <DropdownMenuItem onClick={() => onEdit(profile)}>
                                <Edit2 className="mr-2 h-4 w-4" />
                                Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                                onClick={() => onDelete(profile.id)}
                                className="text-red-600 focus:text-red-600 focus:bg-red-50"
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                            </DropdownMenuItem>
                          </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent>
                   <div className="text-xs text-muted-foreground mt-2 font-mono">
                      Token: {profile.token ? '******' : 'None'}
                   </div>
                </CardContent>
              </Card>
            );
          })}
          
          {/* Add New Card */}
          <Card className="flex flex-col items-center justify-center border-dashed border-2 hover:border-primary/50 hover:bg-gray-50/50 cursor-pointer transition-colors min-h-[120px]" onClick={onAdd}>
              <Plus className="h-8 w-8 text-muted-foreground mb-2" />
              <span className="text-sm font-medium text-muted-foreground">Add New Profile</span>
          </Card>
        </div>
      )}
    </div>
  );
}
