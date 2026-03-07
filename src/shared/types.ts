export interface SSHConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  password?: string; // Optional if privateKey used
  privateKey?: string;
  lastConnected?: number;
}

export interface FrpcProcessInfo {
  pid: string;
  command?: string;
  configPath?: string;
  version?: string;
  status: 'running' | 'stopped' | 'unknown';
  source: 'process' | 'docker' | 'systemd';
  serviceName?: string;
  requiresSudo?: boolean;
}

export interface ConnectResponse {
  sessionId: string;
  status: 'connected';
  process: FrpcProcessInfo | null;
}

export interface ConfigResponse {
  content: string;
  parsed?: any;
  format: 'toml' | 'text';
}

// Basic TOML structure types for visual editor
export interface ProxyConfig {
  name: string;
  type: 'tcp' | 'udp' | 'http' | 'https' | 'xtcp' | 'stcp';
  localIP?: string;
  localPort?: number;
  remotePort?: number;
  customDomains?: string[];
  subdomain?: string;
  [key: string]: any;
}

export interface CommonConfig {
  serverAddr: string;
  serverPort: number;
  token?: string;
  [key: string]: any;
}
