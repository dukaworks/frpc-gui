import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiClient } from '@/lib/api';
import { useFrpcStore } from '@/store/frpcStore';
import { useUserStore } from '@/store/userStore';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2, History, Server } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SSHConfig } from '@/shared/types';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function Connect() {
  const navigate = useNavigate();
  const { setConnected, sessionId: storeSessionId, isConnected } = useFrpcStore();
  const { savedConnections, addConnection, removeConnection, updateConnection } = useUserStore();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('new');
  
  const [formData, setFormData] = useState({
    name: 'My Server',
    host: '',
    port: '22',
    username: 'root',
    password: '',
    save: true
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  useEffect(() => {
    const existing = ApiClient.getSessionId();
    if (!existing) return;
    if (isConnected && storeSessionId === existing) return;

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

  const handleConnectNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.save) {
        addConnection({
            name: formData.name || formData.host,
            host: formData.host,
            port: parseInt(formData.port),
            username: formData.username,
            password: formData.password
        });
    }
    await connect(formData);
  };

  const handleConnectSaved = async (conn: SSHConfig) => {
      updateConnection(conn.id, { lastConnected: Date.now() });
      await connect(conn);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Connect to Remote Server</CardTitle>
          <CardDescription>Manage your FRPC instances via SSH</CardDescription>
        </CardHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="px-6">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="new">New Connection</TabsTrigger>
                    <TabsTrigger value="saved">Saved Servers</TabsTrigger>
                </TabsList>
            </div>

            <TabsContent value="new">
                <form onSubmit={handleConnectNew}>
                <CardContent className="space-y-4 pt-4">
                    <div className="space-y-2">
                    <label className="text-sm font-medium">Friendly Name (Optional)</label>
                    <Input 
                        name="name" 
                        placeholder="My Home Lab" 
                        value={formData.name}
                        onChange={handleChange}
                    />
                    </div>
                    <div className="space-y-2">
                    <label className="text-sm font-medium">Host IP</label>
                    <Input 
                        name="host" 
                        placeholder="192.168.1.100" 
                        value={formData.host}
                        onChange={handleChange}
                        required
                    />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                        <label className="text-sm font-medium">SSH Port</label>
                        <Input 
                            name="port" 
                            type="number" 
                            placeholder="22" 
                            value={formData.port}
                            onChange={handleChange}
                            required
                        />
                        </div>
                        <div className="space-y-2">
                        <label className="text-sm font-medium">Username</label>
                        <Input 
                            name="username" 
                            placeholder="root" 
                            value={formData.username}
                            onChange={handleChange}
                            required
                        />
                        </div>
                    </div>
                    <div className="space-y-2">
                    <label className="text-sm font-medium">Password</label>
                    <Input 
                        name="password" 
                        type="password" 
                        placeholder="••••••••" 
                        value={formData.password}
                        onChange={handleChange}
                        required
                    />
                    </div>
                    
                    <div className="flex items-center space-x-2">
                        <input 
                            type="checkbox" 
                            id="save"
                            checked={formData.save}
                            onChange={(e) => setFormData({...formData, save: e.target.checked})}
                            className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <label htmlFor="save" className="text-sm text-muted-foreground">Save connection details</label>
                    </div>

                    {error && (
                    <div className="text-sm text-red-500 font-medium">
                        {error}
                    </div>
                    )}
                </CardContent>
                <CardFooter>
                    <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {loading ? 'Connecting...' : 'Connect & Scan'}
                    </Button>
                </CardFooter>
                </form>
            </TabsContent>

            <TabsContent value="saved">
                <CardContent className="pt-4 h-[400px]">
                    {savedConnections.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-4">
                            <History className="h-12 w-12 opacity-20" />
                            <p>No saved connections yet.</p>
                            <Button variant="link" onClick={() => setActiveTab('new')}>Create one now</Button>
                        </div>
                    ) : (
                        <ScrollArea className="h-full pr-4">
                            <div className="space-y-3">
                                {savedConnections.map((conn) => (
                                    <div key={conn.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors group">
                                        <div className="flex items-center space-x-3 cursor-pointer flex-1" onClick={() => handleConnectSaved(conn)}>
                                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                <Server className="h-4 w-4 text-primary" />
                                            </div>
                                            <div>
                                                <div className="font-medium">{conn.name}</div>
                                                <div className="text-xs text-muted-foreground">{conn.username}@{conn.host}:{conn.port}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-8 w-8 text-muted-foreground hover:text-red-500"
                                                onClick={() => removeConnection(conn.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                            <Button size="sm" variant="secondary" onClick={() => handleConnectSaved(conn)} disabled={loading}>
                                                Connect
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                </CardContent>
                {error && (
                    <CardFooter>
                        <div className="text-sm text-red-500 font-medium w-full text-center">
                            {error}
                        </div>
                    </CardFooter>
                )}
            </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
