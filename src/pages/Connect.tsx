import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiClient } from '@/lib/api';
import { useFrpcStore } from '@/store/frpcStore';
import { useUserStore } from '@/store/userStore';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Eye, EyeOff, KeyRound, Lock, ChevronDown, Check, Server } from 'lucide-react';
import { SSHConfig } from '@/shared/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export default function Connect() {
  const navigate = useNavigate();
  const { setConnected, sessionId: storeSessionId, isConnected } = useFrpcStore();
  const { savedConnections, addConnection, updateConnection } = useUserStore();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authType, setAuthType] = useState<'password' | 'key'>('password');
  
  // Combobox state
  const [showServerList, setShowServerList] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    host: '',
    port: '22',
    username: 'root',
    password: '',
    privateKey: '',
    save: true
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowServerList(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  
  const handleSelectServer = (conn: SSHConfig | null) => {
    if (!conn) {
        // New Connection
        setFormData({
            name: '',
            host: '',
            port: '22',
            username: 'root',
            password: '',
            privateKey: '',
            save: true
        });
        setAuthType('password');
    } else {
        setFormData({
            name: conn.name,
            host: conn.host,
            port: conn.port.toString(),
            username: conn.username,
            password: conn.password || '',
            privateKey: conn.privateKey || '',
            save: true
        });
        setAuthType(conn.privateKey ? 'key' : 'password');
    }
    setShowServerList(false);
  };

  useEffect(() => {
    // If we are already connected in store, redirect to dashboard
    if (isConnected && storeSessionId) {
       navigate('/dashboard');
       return;
    }

    const existing = ApiClient.getSessionId();
    if (!existing) return;

    setLoading(true);
    setError('');
    ApiClient.scan()
      .then((res: any) => {
        setConnected(existing, res.process ?? null);
        navigate('/dashboard');
      })
      .catch(() => {
        ApiClient.setSessionId('');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isConnected, navigate, setConnected, storeSessionId]);

  const connect = async (config: any) => {
      setLoading(true);
      setError('');
      try {
        const res = await ApiClient.connect({
          host: config.host,
          port: typeof config.port === 'string' ? parseInt(config.port) : config.port,
          username: config.username,
          password: config.password,
          privateKey: config.privateKey
        });
        
        setConnected(res.sessionId, res.process);
        navigate('/dashboard');
      } catch (err: any) {
        setError(err.message || 'Failed to connect');
      } finally {
        setLoading(false);
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Default name to host if empty
    const finalName = formData.name || formData.host;
    
    if (formData.save) {
        // Find existing by exact match logic or just update if name matches?
        // Let's use name match for simplicity as ID is hidden
        const existing = savedConnections.find(
            c => c.name === finalName || (c.host === formData.host && c.username === formData.username)
        );
        
        const connectionData = {
            name: finalName,
            host: formData.host,
            port: parseInt(formData.port),
            username: formData.username,
            password: authType === 'password' ? formData.password : undefined,
            privateKey: authType === 'key' ? formData.privateKey : undefined
        };

        if (existing) {
            updateConnection(existing.id, { ...connectionData, lastConnected: Date.now() });
        } else {
            addConnection(connectionData);
        }
    }
    
    await connect({
        ...formData,
        name: finalName,
        password: authType === 'password' ? formData.password : undefined,
        privateKey: authType === 'key' ? formData.privateKey : undefined
    });
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl">Connect to Remote Server</CardTitle>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
            <CardContent className="space-y-5">
                {/* Combined Server Name / Saved Selection */}
                <div className="space-y-2 relative" ref={dropdownRef}>
                    <Label>Server</Label>
                    <div className="relative">
                        <Input 
                            name="name" 
                            placeholder={formData.host || "Input Server Name or Select"} 
                            value={formData.name}
                            onChange={handleChange}
                            className="pr-10"
                            autoComplete="off"
                            onClick={() => setShowServerList(true)}
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full w-10 text-muted-foreground hover:bg-transparent"
                            onClick={() => setShowServerList(!showServerList)}
                        >
                            <ChevronDown className="h-4 w-4" />
                        </Button>
                    </div>

                    {showServerList && (
                        <div className="absolute top-full left-0 w-full mt-1 z-50 bg-popover bg-white dark:bg-slate-950 border rounded-md shadow-md max-h-60 overflow-y-auto">
                            <div 
                                className="px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground flex items-center gap-2 text-primary font-medium border-b"
                                onClick={() => handleSelectServer(null)}
                            >
                                <Server className="h-4 w-4" />
                                New Connection
                            </div>
                            {savedConnections.length === 0 ? (
                                <div className="p-4 text-center text-sm text-muted-foreground">No saved servers</div>
                            ) : (
                                savedConnections.map(conn => (
                                    <div 
                                        key={conn.id} 
                                        className="px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground flex items-center justify-between group"
                                        onClick={() => handleSelectServer(conn)}
                                    >
                                        <div className="flex flex-col">
                                            <span className="font-medium">{conn.name}</span>
                                            <span className="text-xs text-muted-foreground">{conn.username}@{conn.host}</span>
                                        </div>
                                        {formData.name === conn.name && <Check className="h-4 w-4 text-primary" />}
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-8 space-y-2">
                        <Label>Host IP</Label>
                        <Input 
                            name="host" 
                            placeholder="192.168.1.100" 
                            value={formData.host}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="col-span-4 space-y-2">
                        <Label>SSH Port</Label>
                        <Input 
                            name="port" 
                            type="number" 
                            placeholder="22" 
                            value={formData.port}
                            onChange={handleChange}
                            required
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Username</Label>
                    <Input 
                        name="username" 
                        placeholder="root" 
                        value={formData.username}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label>Authentication</Label>
                        <div className="flex bg-muted rounded-md p-1 gap-1">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button 
                                        type="button"
                                        variant={authType === 'password' ? 'default' : 'ghost'} 
                                        size="sm" 
                                        className="h-7 px-3 text-xs shadow-none"
                                        onClick={() => setAuthType('password')}
                                    >
                                        <Lock className="h-3 w-3 mr-1.5" /> Password
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Authenticate with password</TooltipContent>
                            </Tooltip>
                            
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button 
                                        type="button"
                                        variant={authType === 'key' ? 'default' : 'ghost'} 
                                        size="sm" 
                                        className="h-7 px-3 text-xs shadow-none"
                                        onClick={() => setAuthType('key')}
                                    >
                                        <KeyRound className="h-3 w-3 mr-1.5" /> Key
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Authenticate with private key</TooltipContent>
                            </Tooltip>
                        </div>
                    </div>
                    
                    {authType === 'password' ? (
                        <div className="relative">
                            <Input 
                                name="password" 
                                type={showPassword ? "text" : "password"} 
                                placeholder="••••••••" 
                                value={formData.password}
                                onChange={handleChange}
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? (
                                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                    <Eye className="h-4 w-4 text-muted-foreground" />
                                )}
                            </Button>
                        </div>
                    ) : (
                        <Textarea 
                            name="privateKey"
                            placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
                            className="font-mono text-xs min-h-[100px] resize-none"
                            value={formData.privateKey}
                            onChange={handleChange}
                        />
                    )}
                </div>
                
                <div className="flex items-center space-x-2 pt-2">
                    <Checkbox 
                        id="save"
                        checked={formData.save}
                        onCheckedChange={(checked) => setFormData({...formData, save: checked as boolean})}
                    />
                    <Label htmlFor="save" className="text-sm font-normal text-muted-foreground cursor-pointer">Save Connection</Label>
                </div>

                {error && (
                    <div className="text-sm text-red-500 font-medium bg-red-50 p-2 rounded border border-red-200">
                        {error}
                    </div>
                )}
            </CardContent>
            <CardFooter>
                <Button type="submit" className="w-full" disabled={loading} variant="outline">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    OK
                </Button>
            </CardFooter>
        </form>
      </Card>
    </div>
  );
}
