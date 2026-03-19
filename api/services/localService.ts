/**
 * LocalServiceManager - Native local mode for Frpc-GUI
 *
 * Discovers and controls frpc running on the SAME machine (no SSH needed).
 * Supports Docker, Systemd, and raw process detection.
 */

import { exec, execSync } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';

const execAsync = promisify(exec);

export interface LocalProcessInfo {
  pid: string;
  command?: string;
  configPath?: string;
  version?: string;
  status: 'running' | 'stopped' | 'unknown';
  source: 'process' | 'docker' | 'systemd';
  serviceName?: string;
  requiresSudo?: boolean;
  uptime?: string;
  startTimestamp?: number;
}

/**
 * Detect if we have sudo/root privileges
 */
function checkSudo(): boolean {
  try {
    execSync('id -u', { encoding: 'utf8', timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if docker command is available
 */
async function isDockerAvailable(): Promise<boolean> {
  try {
    await execAsync('docker info', { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if systemctl is available
 */
function isSystemdAvailable(): boolean {
  try {
    execSync('systemctl --version', { encoding: 'utf8', timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Execute a command locally, optionally with sudo prefix
 */
async function localExec(cmd: string, useSudo = false): Promise<string> {
  const fullCmd = useSudo ? `sudo ${cmd}` : cmd;
  const { stdout } = await execAsync(fullCmd, { timeout: 15000 });
  return stdout;
}

class LocalServiceManager {
  private hasSudo: boolean;

  constructor() {
    this.hasSudo = checkSudo();
  }

  /**
   * Full discovery: try Docker → Systemd → Process
   */
  async scanFrpc(): Promise<LocalProcessInfo | null> {
    try {
      // 1. Try Docker first (most common in containerized environments)
      const dockerInfo = await this.scanDocker();
      if (dockerInfo) return dockerInfo;

      // 2. Try Systemd
      if (isSystemdAvailable()) {
        const systemdInfo = await this.scanSystemd();
        if (systemdInfo) return systemdInfo;
      }

      // 3. Fallback to raw process
      return await this.scanProcess();
    } catch (error) {
      console.error('Local scan error:', error);
      return null;
    }
  }

  /**
   * Translate a host path (from frpc container) to the frpc-gui container path
   * by inspecting our own container's mounts.
   */
  private async translateHostPathToContainerPath(hostPath: string): Promise<string> {
    try {
      // Get our own (frpc-gui) container ID
      const selfId = await localExec('docker ps -q --filter name=frpc-gui', false);
      if (!selfId.trim()) return hostPath;

      const selfContainerId = selfId.trim().split('\n')[0];
      if (!selfContainerId) return hostPath;

      // Inspect our own mounts to find matching host path
      const selfMountsRaw = await localExec(
        `docker inspect --format "{{json .Mounts}}" ${selfContainerId}`,
        false
      );
      const selfMounts: Array<{ Type: string; Source: string; Destination: string }> = JSON.parse(selfMountsRaw || '[]');

      for (const mount of selfMounts) {
        if (mount.Type === 'bind') {
          // Exact match
          if (mount.Source === hostPath) {
            // Check if host path is a file or directory
            if (hostPath.endsWith('.toml') || hostPath.endsWith('.ini')) {
              return mount.Destination;
            }
            // It's a directory, append filename
            const filename = hostPath.split('/').pop();
            return `${mount.Destination}/${filename}`;
          }
          // Check if host path is inside a mounted directory
          if (hostPath.startsWith(mount.Source + '/')) {
            const relativePath = hostPath.slice(mount.Source.length);
            return mount.Destination + relativePath;
          }
        }
      }

      // No translation found, try common defaults
      // If the host path contains 'frp' or 'frpc', try common container paths
      if (hostPath.includes('/frp/') || hostPath.includes('/frpc/')) {
        const filename = hostPath.split('/').pop();
        const candidates = [
          `/etc/frp/${filename}`,
          `/etc/frpc/${filename}`,
          `/frp/${filename}`,
          `/frpc/${filename}`,
        ];
        for (const candidate of candidates) {
          try {
            await localExec(`ls "${candidate}" 2>/dev/null`, false);
            return candidate;
          } catch {
            void 0;
          }
        }
      }

      return hostPath;
    } catch {
      return hostPath;
    }
  }

  /**
   * Discover frpc running as Docker container
   */
  private async scanDocker(): Promise<LocalProcessInfo | null> {
    try {
      if (!(await isDockerAvailable())) return null;

      const dockerCmd = this.hasSudo ? 'sudo docker' : 'docker';

      // Find frpc container
      const psOutput = await localExec(
        `${dockerCmd} ps --format "{{.ID}}|{{.Names}}|{{.Image}}|{{.Status}}|{{.State}}"`,
        false
      );

      const lines = psOutput.trim().split('\n');
      let targetLine = '';

      for (const line of lines) {
        if (!line) continue;
        const parts = line.split('|');
        const [id, name, image, , state] = parts;
        if (
          name?.includes('frpc') ||
          image?.includes('frpc') ||
          image?.includes('fatedier/frp')
        ) {
          // Prefer running containers, but take first match
          if (!targetLine || state === 'running') {
            targetLine = line;
          }
          if (state === 'running') break;
        }
      }

      if (!targetLine) return null;

      const [containerId, containerName, image, containerStatus] = targetLine.split('|');

      // Get version
      let version = '';
      try {
        const verOutput = await localExec(`${dockerCmd} exec ${containerId} frpc -v`, false);
        version = verOutput.trim();
      } catch {
        void 0;
      }

      // Inspect mounts to find config path (from frpc container's perspective)
      let hostConfigPath = '';
      let containerConfigPath = '';
      try {
        const inspectOutput = await localExec(
          `${dockerCmd} inspect --format "{{json .Mounts}}|{{.State.StartedAt}}" ${containerId}`,
          false
        );
        const [mountsJson, startedAt] = inspectOutput.split('|');
        const mounts: Array<{ Type: string; Source: string; Destination: string }> = JSON.parse(mountsJson || '[]');

        for (const mount of mounts) {
          if (mount.Type === 'bind') {
            const dest = mount.Destination;
            if (dest.endsWith('frpc.toml') || dest.endsWith('frpc.ini')) {
              hostConfigPath = mount.Source;
              break;
            }
          }
        }

        // Fallback: check for /etc/frp or /etc/frpc common paths
        if (!hostConfigPath) {
          for (const mount of mounts) {
            if (mount.Type === 'bind' && (mount.Destination === '/etc/frp' || mount.Destination === '/etc/frpc' || mount.Destination === '/frp' || mount.Destination === '/frpc')) {
              const source = mount.Source;
              try {
                const checkToml = await localExec(`ls "${source}/frpc.toml" 2>/dev/null`, false);
                if (checkToml && !checkToml.includes('No such file')) {
                  hostConfigPath = `${source}/frpc.toml`;
                  break;
                }
              } catch {
                void 0;
              }
            }
          }
        }

        // Translate host path to frpc-gui container path
        if (hostConfigPath) {
          containerConfigPath = await this.translateHostPathToContainerPath(hostConfigPath);
        }
      } catch {
        void 0;
      }

      // Get start timestamp
      let startTimestamp: number | undefined;
      try {
        const startedAt = await localExec(
          `${dockerCmd} inspect --format "{{.State.StartedAt}}" ${containerId}`,
          false
        );
        const ts = new Date(startedAt.trim()).getTime();
        if (!isNaN(ts)) startTimestamp = ts;
      } catch {
        void 0;
      }

      return {
        pid: containerId,
        serviceName: containerName,
        status: 'running',
        source: 'docker',
        configPath: containerConfigPath || hostConfigPath || undefined,
        command: `${dockerCmd} restart ${containerName}`,
        requiresSudo: !this.hasSudo,
        uptime: containerStatus || 'Unknown',
        startTimestamp,
        version: version || undefined,
      };
    } catch {
      return null;
    }
  }

  /**
   * Discover frpc running as systemd service
   */
  private async scanSystemd(): Promise<LocalProcessInfo | null> {
    try {
      if (!isSystemdAvailable()) return null;

      // List active frpc services
      const units = await localExec(
        'systemctl list-units --type=service --state=running --no-pager --no-legend "frpc*"',
        this.hasSudo
      );

      if (!units || !units.trim()) return null;

      const firstLine = units.trim().split('\n')[0];
      if (!firstLine) return null;

      const serviceName = firstLine.split(/\s+/)[0];
      if (!serviceName) return null;

      // Get uptime
      let startTimestamp: number | undefined;
      try {
        const activeState = await localExec(
          `systemctl show ${serviceName} --property=ActiveEnterTimestamp --value`,
          this.hasSudo
        );
        const ts = new Date(activeState.trim()).getTime();
        if (!isNaN(ts)) startTimestamp = ts;
      } catch {
        void 0;
      }

      // Get version
      let version = '';
      try {
        const execStart = await localExec(
          `systemctl show ${serviceName} --property=ExecStart --value`,
          this.hasSudo
        );
        const binPath = execStart
          .split(' ')
          .find((p) => p.includes('frpc') && !p.startsWith('-'));
        if (binPath) {
          version = (await localExec(`${binPath} -v`, this.hasSudo)).trim();
        }
      } catch {
        void 0;
      }

      // Get config path from ExecStart
      let configPath = '';
      try {
        const execStart = await localExec(
          `systemctl show ${serviceName} --property=ExecStart --value`,
          this.hasSudo
        );
        const parts = execStart.split(/\s+/);
        const cIndex = parts.indexOf('-c');
        if (cIndex > -1 && parts[cIndex + 1]) {
          configPath = parts[cIndex + 1].replace(/[;}]/g, '');
        } else {
          const configIndex = parts.indexOf('--config');
          if (configIndex > -1 && parts[configIndex + 1]) {
            configPath = parts[configIndex + 1].replace(/[;}]/g, '');
          }
        }
      } catch {
        void 0;
      }

      // Fallback to default paths
      if (!configPath) {
        if (existsSync('/etc/frp/frpc.toml')) {
          configPath = '/etc/frp/frpc.toml';
        } else if (existsSync('/etc/frp/frpc.ini')) {
          configPath = '/etc/frp/frpc.ini';
        } else if (existsSync('/etc/frpc.toml')) {
          configPath = '/etc/frpc.toml';
        }
      }

      return {
        pid: serviceName,
        serviceName: serviceName,
        status: 'running',
        source: 'systemd',
        configPath: configPath || undefined,
        command: `systemctl restart ${serviceName}`,
        requiresSudo: true,
        uptime: startTimestamp ? new Date(startTimestamp).toLocaleString() : 'Unknown',
        startTimestamp,
        version: version || undefined,
      };
    } catch {
      return null;
    }
  }

  /**
   * Discover frpc as a raw process
   */
  private async scanProcess(): Promise<LocalProcessInfo | null> {
    try {
      const output = await localExec('ps -eo pid,args | grep frpc | grep -v grep', false);
      const lines = output.trim().split('\n');
      if (lines.length === 0 || !lines[0]) return null;

      const firstLine = lines[0].trim();
      const parts = firstLine.split(/\s+/);
      const pid = parts[0];
      const command = parts.slice(1).join(' ');

      // Get start time
      let startTimestamp: number | undefined;
      try {
        const lstart = await localExec(`ps -p ${pid} -o lstart=`, false);
        const ts = new Date(lstart.trim()).getTime();
        if (!isNaN(ts)) startTimestamp = ts;
      } catch {
        void 0;
      }

      // Get version
      let version = '';
      try {
        const frpcBin = parts.find((p) => p.includes('frpc') && !p.startsWith('-'));
        if (frpcBin) {
          version = (await localExec(`${frpcBin} -v`, false)).trim();
        }
      } catch {
        void 0;
      }

      // Find config path
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
        if (existsSync('/etc/frp/frpc.toml')) configPath = '/etc/frp/frpc.toml';
        else if (existsSync('/etc/frp/frpc.ini')) configPath = '/etc/frp/frpc.ini';
        else if (existsSync('/etc/frpc.toml')) configPath = '/etc/frpc.toml';
      }

      return {
        pid,
        command,
        status: 'running',
        source: 'process',
        configPath: configPath || undefined,
        startTimestamp,
        version: version || undefined,
      };
    } catch {
      return null;
    }
  }

  /**
   * Control a Docker container (start/stop/restart)
   */
  async controlDocker(action: string, serviceName: string): Promise<string> {
    const dockerCmd = this.hasSudo ? 'sudo docker' : 'docker';
    if (!['start', 'stop', 'restart'].includes(action)) {
      throw new Error(`Invalid action for docker: ${action}`);
    }
    return localExec(`${dockerCmd} ${action} ${serviceName}`, false);
  }

  /**
   * Control a systemd service (start/stop/restart/status)
   */
  async controlSystemd(action: string, serviceName: string): Promise<string> {
    if (!['start', 'stop', 'restart', 'status'].includes(action)) {
      throw new Error(`Invalid action for systemd: ${action}`);
    }
    return localExec(`systemctl ${action} ${serviceName}`, this.hasSudo);
  }

  /**
   * Fetch logs from a Docker container
   */
  async dockerLogs(serviceName: string, lines = 50, sinceHours?: number): Promise<string> {
    const dockerCmd = this.hasSudo ? 'sudo docker' : 'docker';
    const sinceFlag = sinceHours ? `--since ${sinceHours}h` : '';
    return localExec(`${dockerCmd} logs --tail ${lines} ${sinceFlag} ${serviceName} 2>&1`, false);
  }

  /**
   * Fetch logs from a systemd service
   */
  async systemdLogs(serviceName: string, lines = 50, sinceHours?: number): Promise<string> {
    const sinceFlag = sinceHours ? `--since "${sinceHours} hours ago"` : '';
    return localExec(
      `journalctl -u ${serviceName} ${sinceFlag} -n ${lines} --no-pager 2>&1`,
      this.hasSudo
    );
  }
}

export const localServiceManager = new LocalServiceManager();
export default LocalServiceManager;
