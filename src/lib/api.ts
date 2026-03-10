import { ConnectResponse, ConfigResponse } from '../shared/types';

const API_BASE = '/api/frpc';

export class ApiClient {
  private static sessionId: string | null = null;

  static setSessionId(id: string) {
    this.sessionId = id;
    if (id) {
        localStorage.setItem('frpc_session_id', id);
    } else {
        localStorage.removeItem('frpc_session_id');
    }
  }

  static getSessionId() {
    if (!this.sessionId) {
      this.sessionId = localStorage.getItem('frpc_session_id');
    }
    return this.sessionId;
  }

  private static async request(endpoint: string, options: RequestInit = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...((options.headers as any) || {}),
      'x-session-id': this.getSessionId() || '',
    };

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch (e) {
      console.error('Failed to parse response:', text);
      throw new Error('Invalid server response');
    }

    if (!res.ok) {
      throw new Error(data.error || `Request failed: ${res.status} ${res.statusText}`);
    }
    return data;
  }

  static async connect(credentials: any): Promise<ConnectResponse> {
    const res = await fetch(`${API_BASE}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
    });
    
    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch (e) {
      console.error('Failed to parse connect response:', text);
      throw new Error('Invalid server response');
    }

    if (!res.ok) throw new Error(data.error || `Connection failed: ${res.status}`);

    if (data.sessionId) {
      this.setSessionId(data.sessionId);
    }
    return data;
  }

  static async getConfig(path: string): Promise<ConfigResponse> {
    return this.request(`/config?path=${encodeURIComponent(path)}`);
  }

  static async saveConfig(path: string, content: string) {
    return this.request('/config', {
      method: 'POST',
      body: JSON.stringify({ path, content }),
    });
  }

  static async serviceControl(action: string, type: string, serviceName: string, requiresSudo?: boolean) {
    return this.request('/service', {
      method: 'POST',
      body: JSON.stringify({ action, type, serviceName, requiresSudo }),
    });
  }

  static async fetchLogs(type: string, serviceName: string, options?: { lines?: number; sinceHours?: number }) {
    const lines = options?.lines ?? 50;
    const query = new URLSearchParams({
      type,
      serviceName,
      lines: String(lines),
    });
    if (options?.sinceHours) {
      query.set('sinceHours', String(options.sinceHours));
    }
    return this.request(`/logs?${query.toString()}`);
  }

  static async scan() {
      return this.request('/scan', { method: 'POST' });
  }
}
