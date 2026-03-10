import { Router } from 'express';
import SshService, { sshManager } from '../services/sshService.js';
import toml from '@iarna/toml';

const router = Router();

// Middleware to check SSH session
const requireAuth = (req: any, res: any, next: any) => {
  const sessionId = req.headers['x-session-id'] as string;
  if (!sessionId || !sshManager.has(sessionId)) {
    return res.status(401).json({ error: 'Not connected' });
  }
  req.ssh = sshManager.get(sessionId);
  next();
};

// Connect
router.post('/connect', async (req, res) => {
  const { host, port, username, password, privateKey } = req.body;
  const sessionId = Math.random().toString(36).substring(7);
  
  const ssh = new SshService();
  try {
    await ssh.connect({ host, port: parseInt(port), username, password, privateKey });
    sshManager.set(sessionId, ssh);
    
    // Auto scan
    const processInfo = await ssh.scanFrpc();
    
    res.json({ 
      sessionId, 
      status: 'connected',
      process: processInfo
    });
  } catch (error: any) {
    console.error('Connect Route Error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Re-scan
router.post('/scan', requireAuth, async (req: any, res) => {
    try {
        const processInfo = await req.ssh.scanFrpc();
        res.json({ process: processInfo });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get Config
router.get('/config', requireAuth, async (req: any, res) => {
  const { path } = req.query;
  if (!path) return res.status(400).json({ error: 'Path required' });

  try {
    const content = await req.ssh.readFile(path as string);
    res.json({ content, format: 'text' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Save Config
router.post('/config', requireAuth, async (req: any, res) => {
  const { path, content } = req.body;
  if (!path || !content) return res.status(400).json({ error: 'Path and content required' });

  try {
    await req.ssh.writeFile(path, content);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Service Control
router.post('/service', requireAuth, async (req: any, res) => {
  const { action, type, serviceName, requiresSudo } = req.body; // action: start, stop, restart
  
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
    
    const output = await req.ssh.exec(cmd);
    res.json({ output, success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get Service Logs
router.get('/logs', requireAuth, async (req: any, res) => {
  const { type, serviceName, lines = 50 } = req.query;

  if (!type || !serviceName) {
    return res.status(400).json({ error: 'Missing type or serviceName' });
  }

  try {
    let cmd = '';
    // Limit lines to avoid huge payload
    const n = Math.min(parseInt(lines as string) || 50, 200);

    if (type === 'docker') {
      // Docker logs
      // serviceName is container ID or name
      cmd = `docker logs --tail ${n} ${serviceName} 2>&1`;
    } else if (type === 'systemd') {
      // Systemd logs
      cmd = `journalctl -u ${serviceName} -n ${n} --no-pager`;
    } else {
      return res.status(400).json({ error: 'Unsupported service type for logs' });
    }

    const output = await req.ssh.exec(cmd);
    res.json({ logs: output });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
