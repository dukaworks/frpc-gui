import { Router, type NextFunction, type Request, type Response } from 'express';
import SshService, { sshManager } from '../services/sshService.js';
import { existsSync, readFileSync, writeFileSync } from 'fs';

const router = Router();

type AuthedRequest = Request & { ssh: SshService };
type LocalAuthedRequest = Request & { localFileService: LocalFileService };

function getLocalConfigPath() {
  return process.env.FRPC_CONFIG_PATH || '/etc/frpc.toml';
}

function getLocalProcessInfo() {
  const configPath = getLocalConfigPath();
  return {
    pid: 'local',
    status: existsSync(configPath) ? 'running' : 'unknown',
    source: 'docker',
    serviceName: 'frpc',
    configPath,
    command: '',
  };
}

// Local file service for local mode operations
class LocalFileService {
  async readFile(path: string): Promise<string> {
    try {
      return readFileSync(path, 'utf8');
    } catch (error) {
      throw new Error(`Failed to read file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async writeFile(path: string, content: string): Promise<void> {
    try {
      writeFileSync(path, content, 'utf8');
    } catch (error) {
      throw new Error(`Failed to write file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

const localFileService = new LocalFileService();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

// Middleware to check SSH session or use local mode
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  // Check if we're in local mode
  const isLocalMode = process.env.FRPC_GUI_MODE === 'local';
  
  if (isLocalMode) {
    // In local mode, we don't need SSH session
    // But we still attach a local file service for file operations
    (req as LocalAuthedRequest).localFileService = localFileService;
    next();
    return;
  }

  // Standard SSH mode
  const sessionIdRaw = req.headers['x-session-id'];
  const sessionId =
    typeof sessionIdRaw === 'string'
      ? sessionIdRaw
      : Array.isArray(sessionIdRaw)
        ? sessionIdRaw[0]
        : undefined;

  if (!sessionId) {
    res.status(401).json({ error: 'Not connected' });
    return;
  }

  const ssh = sshManager.get(sessionId);
  if (!ssh) {
    res.status(401).json({ error: 'Not connected' });
    return;
  }

  (req as AuthedRequest).ssh = ssh;
  next();
};

// Connect
router.post('/connect', async (req: Request, res: Response) => {
  // Check if we're in local mode
  const isLocalMode = process.env.FRPC_GUI_MODE === 'local';
  
  if (isLocalMode) {
    const sessionId = Math.random().toString(36).substring(7);
    res.json({ 
      sessionId, 
      status: 'connected',
      process: getLocalProcessInfo()
    });
    return;
  }

  const body = isRecord(req.body) ? req.body : {};
  const host = typeof body.host === 'string' ? body.host : '';
  const username = typeof body.username === 'string' ? body.username : '';
  const password = typeof body.password === 'string' ? body.password : undefined;
  const privateKey = typeof body.privateKey === 'string' ? body.privateKey : undefined;

  const portRaw = body.port;
  const port =
    typeof portRaw === 'number'
      ? portRaw
      : typeof portRaw === 'string'
        ? parseInt(portRaw, 10)
        : parseInt(String(portRaw ?? ''), 10);
  const sessionId = Math.random().toString(36).substring(7);
  
  const ssh = new SshService();
  try {
    if (!host || !username) {
      res.status(400).json({ error: 'Missing host or username' });
      return;
    }

    await ssh.connect({ host, port: Number.isFinite(port) ? port : 22, username, password, privateKey });
    sshManager.set(sessionId, ssh);
    
    // Auto scan
    const processInfo = await ssh.scanFrpc();
    
    
    res.json({ 
      sessionId, 
      status: 'connected',
      process: processInfo
    });
  } catch (error: unknown) {
    sshManager.delete(sessionId);
    try {
      ssh.disconnect();
    } catch {
      void 0;
    }
    console.error('Connect Route Error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Re-scan
router.post('/scan', requireAuth, async (req: Request, res: Response) => {
    try {
        // Check if we're in local mode
        const isLocalMode = process.env.FRPC_GUI_MODE === 'local';
        
        if (isLocalMode) {
            res.json({ process: getLocalProcessInfo() });
        } else {
            // Standard SSH mode
            const processInfo = await (req as AuthedRequest).ssh.scanFrpc();
            res.json({ process: processInfo });
        }
    } catch (error: unknown) {
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
});

// Get Config
router.get('/config', requireAuth, async (req: Request, res: Response) => {
  const path = typeof req.query.path === 'string' ? req.query.path : undefined;
  if (!path) return res.status(400).json({ error: 'Path required' });

  try {
    // Check if we're in local mode
    const isLocalMode = process.env.FRPC_GUI_MODE === 'local';
    
    if (isLocalMode) {
      // In local mode, read file directly
      const content = await (req as LocalAuthedRequest).localFileService.readFile(path);
      res.json({ content, format: 'text' });
    } else {
      // Standard SSH mode
      const content = await (req as AuthedRequest).ssh.readFile(path);
      res.json({ content, format: 'text' });
    }
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Save Config
router.post('/config', requireAuth, async (req: Request, res: Response) => {
  const body = isRecord(req.body) ? req.body : {};
  const path = typeof body.path === 'string' ? body.path : '';
  const content = typeof body.content === 'string' ? body.content : '';
  if (!path || !content) return res.status(400).json({ error: 'Path and content required' });

  try {
    // Check if we're in local mode
    const isLocalMode = process.env.FRPC_GUI_MODE === 'local';
    
    if (isLocalMode) {
      // In local mode, write file directly
      await (req as LocalAuthedRequest).localFileService.writeFile(path, content);
      res.json({ success: true });
    } else {
      // Standard SSH mode
      await (req as AuthedRequest).ssh.writeFile(path, content);
      res.json({ success: true });
    }
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Service Control
router.post('/service', requireAuth, async (req: Request, res: Response) => {
  const body = isRecord(req.body) ? req.body : {};
  const action = typeof body.action === 'string' ? body.action : '';
  const type = typeof body.type === 'string' ? body.type : '';
  const serviceName = typeof body.serviceName === 'string' ? body.serviceName : '';
  const requiresSudo = typeof body.requiresSudo === 'boolean' ? body.requiresSudo : false;
  
  // Check if we're in local mode
  const isLocalMode = process.env.FRPC_GUI_MODE === 'local';
  
  if (isLocalMode) {
    // In local mode, we can't control remote services
    return res.status(400).json({ error: 'Service control not available in local mode' });
  }
  
  if (!action || !type || !serviceName) {
      return res.status(400).json({ error: 'Missing parameters: action, type, serviceName' });
  }

  try {
    let cmd = '';
    const prefix = requiresSudo ? 'sudo ' : '';
    
    if (type === 'docker') {
        // Docker control
        if (['start', 'stop', 'restart'].includes(action)) {
            cmd = `${prefix}docker ${action} ${serviceName}`;
        } else {
             return res.status(400).json({ error: 'Invalid action for docker' });
        }
    } else if (type === 'systemd') {
        // Systemd control
        if (['start', 'stop', 'restart', 'status'].includes(action)) {
             cmd = `sudo systemctl ${action} ${serviceName}`; // Systemd always use sudo for safety
        } else {
             return res.status(400).json({ error: 'Invalid action for systemd' });
        }
    } else {
        return res.status(400).json({ error: 'Unsupported service type for control' });
    }
    
    const output = await (req as AuthedRequest).ssh.exec(cmd);
    res.json({ output, success: true });
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Get Service Logs
router.get('/logs', requireAuth, async (req: Request, res: Response) => {
  const type = typeof req.query.type === 'string' ? req.query.type : '';
  const serviceName = typeof req.query.serviceName === 'string' ? req.query.serviceName : '';
  const lines = typeof req.query.lines === 'string' ? req.query.lines : '50';
  const sinceHours = typeof req.query.sinceHours === 'string' ? req.query.sinceHours : undefined;

  // Check if we're in local mode
  const isLocalMode = process.env.FRPC_GUI_MODE === 'local';
  
  if (isLocalMode) {
    // In local mode, we can't fetch remote service logs
    return res.status(400).json({ error: 'Service logs not available in local mode' });
  }

  if (!type || !serviceName) {
    return res.status(400).json({ error: 'Missing type or serviceName' });
  }

  try {
    let cmd = '';
    const n = Math.min(parseInt(lines as string) || 50, 2000);
    const hours = Number.isFinite(Number(sinceHours)) ? Math.max(1, Number(sinceHours)) : null;

    if (type === 'docker') {
      cmd = hours
        ? `docker logs --since ${hours}h --tail ${n} ${serviceName} 2>&1`
        : `docker logs --tail ${n} ${serviceName} 2>&1`;
    } else if (type === 'systemd') {
      cmd = hours
        ? `journalctl -u ${serviceName} --since "${hours} hours ago" -n ${n} --no-pager`
        : `journalctl -u ${serviceName} -n ${n} --no-pager`;
    } else {
      return res.status(400).json({ error: 'Unsupported service type for logs' });
    }

    const output = await (req as AuthedRequest).ssh.exec(cmd);
    res.json({ logs: output });
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

router.get('/test-url', requireAuth, async (req: Request, res: Response) => {
  const rawUrl = typeof req.query.url === 'string' ? req.query.url : '';
  if (!rawUrl) {
    res.status(400).json({ error: 'URL required' });
    return;
  }

  const finalUrl = /^https?:\/\//i.test(rawUrl) ? rawUrl : `http://${rawUrl}`;

  let url: URL;
  try {
    url = new URL(finalUrl);
  } catch {
    res.status(400).json({ error: 'Invalid URL' });
    return;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    res.status(400).json({ error: 'Unsupported protocol' });
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const resp = await fetch(url.toString(), {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
    });

    res.json({
      ok: resp.ok,
      status: resp.status,
      statusText: resp.statusText,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.json({ ok: false, error: message });
  } finally {
    clearTimeout(timeout);
  }
});

export default router;
