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

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Request failed');
    }
    return data;
  }

  static async connect(credentials: any): Promise<ConnectResponse> {
    const res = await fetch(`${API_BASE}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

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

  static async scan() {
      return this.request('/scan', { method: 'POST' });
  }
}
