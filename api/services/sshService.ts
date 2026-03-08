import { Client, ClientChannel } from 'ssh2';
import { readFileSync } from 'fs';

export interface SSHConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string; // Path or content
}

export interface FrpcProcessInfo {
  pid: string;
  command?: string;
  configPath?: string;
  version?: string;
  uptime?: string; // e.g. "Up 2 days"
  status: 'running' | 'stopped' | 'unknown';
  source: 'process' | 'docker' | 'systemd';
  serviceName?: string;
  requiresSudo?: boolean;
}

class SshService {
  private client: Client;
  private isConnected: boolean = false;

  constructor() {
    this.client = new Client();
  }

  connect(config: SSHConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.on('ready', () => {
        this.isConnected = true;
        console.log('SSH Connection Ready');
        resolve();
      }).on('error', (err) => {
        this.isConnected = false;
        console.error('SSH Connection Error:', err);
        reject(err);
      }).on('end', () => {
        this.isConnected = false;
        console.log('SSH Connection Ended');
      }).on('close', () => {
        this.isConnected = false;
        console.log('SSH Connection Closed');
      });

      try {
        const connectConfig: any = {
          host: config.host,
          port: config.port,
          username: config.username,
          password: config.password,
        };

        if (config.privateKey) {
            // Check if it looks like a key content
            if (config.privateKey.includes('BEGIN')) {
                connectConfig.privateKey = config.privateKey;
            } else {
                // Assume it's a path
                try {
                    connectConfig.privateKey = readFileSync(config.privateKey);
                } catch (e) {
                    // If read fails, maybe it was a string key that didn't have BEGIN? 
                    // Or file doesn't exist. Warn and try as string?
                    console.warn('Failed to read privateKey file, trying as string');
                    connectConfig.privateKey = config.privateKey;
                }
            }
        }

        this.client.connect(connectConfig);
      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect() {
    this.client.end();
  }

  exec(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        return reject(new Error('SSH not connected'));
      }

      this.client.exec(command, (err, stream) => {
        if (err) return reject(err);
        
        let stdout = '';
        let stderr = '';

        stream.on('close', (code: number, signal: any) => {
          if (code !== 0) {
            // console.warn(`Command "${command}" failed with code ${code}: ${stderr}`);
             // Don't reject immediately for grep/find commands that might return 1
             resolve(stdout); 
          } else {
            resolve(stdout);
          }
        }).on('data', (data: any) => {
          stdout += data.toString();
        }).stderr.on('data', (data: any) => {
          stderr += data.toString();
        });
      });
    });
  }

  async scanFrpc(): Promise<FrpcProcessInfo | null> {
    try {
      // 1. Try Docker First (Most common as per user)
      const dockerInfo = await this.scanDocker();
      if (dockerInfo) return dockerInfo;

      // 2. Try Systemd
      const systemdInfo = await this.scanSystemd();
      if (systemdInfo) return systemdInfo;

      // 3. Fallback to raw process
      return await this.scanProcess();

    } catch (error) {
      console.error('Error scanning frpc:', error);
      return null;
    }
  }

  private async scanDocker(): Promise<FrpcProcessInfo | null> {
    try {
        // Check if docker command exists (try with and without sudo)
        let useSudo = false;
        try {
            await this.exec('docker -v');
        } catch {
            try {
                await this.exec('sudo docker -v');
                useSudo = true;
            } catch {
                return null;
            }
        }

        const dockerCmd = useSudo ? 'sudo docker' : 'docker';

        // List containers filtering for 'frpc' in name or image
        const psOutput = await this.exec(`${dockerCmd} ps --format "{{.ID}}|{{.Names}}|{{.Image}}|{{.Status}}"`);
        const lines = psOutput.trim().split('\n');
        
        let targetContainerId = '';
        let targetContainerName = '';
        let targetUptime = '';
        
        for (const line of lines) {
            if (!line) continue;
            const [id, name, image, status] = line.split('|');
            if (name.includes('frpc') || image.includes('frpc') || image.includes('frp')) {
                targetContainerId = id;
                targetContainerName = name;
                targetUptime = status; // e.g. "Up 2 hours"
                break;
            }
        }

        if (!targetContainerId) return null;

        // Try to get version
        let version = '';
        try {
            const verOutput = await this.exec(`${dockerCmd} exec ${targetContainerId} frpc -v`);
            if (verOutput && !verOutput.toLowerCase().includes('exec failed')) {
                version = verOutput.trim();
            }
        } catch (e) {
            // ignore if exec fails
        }

        // Inspect to find config mount and start time
        const inspectOutput = await this.exec(`${dockerCmd} inspect --format "{{json .Mounts}}|{{.State.StartedAt}}" ${targetContainerId}`);
        const [mountsJson, startedAt] = inspectOutput.split('|');
        const mounts = JSON.parse(mountsJson || '[]');
        
        let startTimestamp: number | undefined;
        if (startedAt) {
            const ts = new Date(startedAt).getTime();
            if (!isNaN(ts)) startTimestamp = ts;
        }
        
        // Find a mount that looks like a config file
        let configPath = '';
        
        for (const mount of mounts) {
            if (mount.Type === 'bind') {
                const dest = mount.Destination;
                if (dest.endsWith('frpc.toml') || dest.endsWith('frpc.ini')) {
                    configPath = mount.Source; // On the host
                    break;
                }
            }
        }
        
        // If specific file mount not found, check if folder mounted to /etc/frp
        if (!configPath) {
             for (const mount of mounts) {
                if (mount.Type === 'bind' && (mount.Destination === '/etc/frp' || mount.Destination.includes('frp'))) {
                    // Check if file exists in that source folder
                    const source = mount.Source;
                    const checkToml = await this.exec(`ls "${source}/frpc.toml"`);
                    if (checkToml && !checkToml.includes('No such file')) {
                        configPath = `${source}/frpc.toml`;
                        break;
                    }
                    const checkIni = await this.exec(`ls "${source}/frpc.ini"`);
                    if (checkIni && !checkIni.includes('No such file')) {
                        configPath = `${source}/frpc.ini`;
                        break;
                    }
                }
            }
        }

        return {
            pid: targetContainerId,
            serviceName: targetContainerName,
            status: 'running',
            source: 'docker',
            configPath: configPath || undefined,
            command: `${dockerCmd} restart ${targetContainerName}`,
            requiresSudo: useSudo,
            uptime: targetUptime || 'Unknown',
            startTimestamp,
            version: version || undefined
        };

    } catch (e) {
        // console.error('Docker scan failed', e);
        return null;
    }
  }

  private async scanSystemd(): Promise<FrpcProcessInfo | null> {
      try {
        // Check for active service
        const units = await this.exec('systemctl list-units --type=service --state=running --no-pager --no-legend "frpc*"');
        if (!units || !units.trim()) return null;

        const firstLine = units.trim().split('\n')[0];
        const serviceName = firstLine.split(/\s+/)[0];

        // Get Uptime (ActiveEnterTimestamp)
        const activeState = await this.exec(`systemctl show ${serviceName} --property=ActiveEnterTimestamp --value`);
        
        let startTimestamp: number | undefined;
        if (activeState) {
            const ts = new Date(activeState).getTime();
            if (!isNaN(ts)) startTimestamp = ts;
        }

        // Get Version
        let version = '';
        try {
            const execPath = await this.exec(`systemctl show ${serviceName} --property=ExecStart --value`);
            const binPath = execPath.split(' ')[0].replace('path=', '').replace(/[;}]/g, ''); // Crude parsing
            if (binPath && binPath.includes('frpc')) {
                version = await this.exec(`${binPath} -v`);
                version = version.trim();
            }
        } catch (e) {}

        // Get ExecStart to find config path
        const execStart = await this.exec(`systemctl show ${serviceName} --property=ExecStart --value`);
        
        let configPath = '';
        const parts = execStart.split(/\s+/);
        
        // Look for -c or --config
        const cIndex = parts.indexOf('-c');
        if (cIndex > -1 && parts[cIndex + 1]) {
            configPath = parts[cIndex + 1];
        } else {
             const configIndex = parts.indexOf('--config');
             if (configIndex > -1 && parts[configIndex + 1]) {
                configPath = parts[configIndex + 1];
             }
        }
        
        // Clean up path
        if (configPath) {
            configPath = configPath.replace(/[;}]/g, '');
        } else {
            // Check default paths if not specified in ExecStart
            try {
                const checkToml = await this.exec('ls /etc/frp/frpc.toml');
                if (checkToml && !checkToml.includes('No such file')) configPath = '/etc/frp/frpc.toml';
                else {
                    const checkIni = await this.exec('ls /etc/frp/frpc.ini');
                    if (checkIni && !checkIni.includes('No such file')) configPath = '/etc/frp/frpc.ini';
                }
            } catch (e) {}
        }

        return {
            pid: serviceName, // Use service name as ID
            serviceName: serviceName,
            status: 'running',
            source: 'systemd',
            configPath: configPath || undefined,
            command: `sudo systemctl restart ${serviceName}`,
            requiresSudo: true,
            uptime: activeState || 'Unknown',
            startTimestamp,
            version: version || undefined
        };

      } catch (e) {
          return null;
      }
  }

  private async scanProcess(): Promise<FrpcProcessInfo | null> {
      try {
        const output = await this.exec('ps -eo pid,args | grep frpc | grep -v grep');
        const lines = output.trim().split('\n');
        if (lines.length === 0 || lines[0] === '') return null;

        const firstLine = lines[0].trim();
        const parts = firstLine.split(/\s+/);
        const pid = parts[0];
        const command = parts.slice(1).join(' ');

        let startTimestamp: number | undefined;
        try {
            const lstart = await this.exec(`ps -p ${pid} -o lstart=`);
            if (lstart) {
                const ts = new Date(lstart.trim()).getTime();
                if (!isNaN(ts)) startTimestamp = ts;
            }
        } catch (e) {}

        let configPath = '';
        const cIndex = parts.indexOf('-c');
        if (cIndex > -1 && parts[cIndex + 1]) {
            configPath = parts[cIndex + 1];
        } else {
            const configIndex = parts.indexOf('--config');
            if (configIndex > -1 && parts[configIndex + 1]) {
            configPath = parts[configIndex + 1];
            }
        }
        
        if (!configPath) {
            // Default check
            try {
                await this.exec('ls /etc/frp/frpc.ini');
                configPath = '/etc/frp/frpc.ini';
            } catch (e) {
                try {
                    await this.exec('ls /etc/frp/frpc.toml');
                    configPath = '/etc/frp/frpc.toml';
                } catch (e2) {}
            }
        }

        return {
            pid,
            command,
            status: 'running',
            source: 'process',
            configPath,
            startTimestamp
        };
      } catch (e) {
          return null;
      }
  }

  async readFile(path: string): Promise<string> {
    return this.exec(`cat "${path}"`);
  }

  async writeFile(path: string, content: string): Promise<void> {
    try {
        const b64 = Buffer.from(content).toString('base64');
        await this.exec(`echo "${b64}" | base64 -d > "${path}"`);
    } catch (e) {
        throw new Error('Failed to write file via SSH');
    }
  }
}

export const sshManager = new Map<string, SshService>();

export default SshService;
