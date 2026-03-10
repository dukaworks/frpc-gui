import type { ConnectResponse, ConfigResponse, FrpcProcessInfo } from '../shared/types';

const API_BASE = '/api/frpc';

type ScanResponse = { process: FrpcProcessInfo | null };
type LogsResponse = { logs: string };
type SaveConfigResponse = { success: boolean };
type ServiceControlResponse = { output: string; success: boolean };

type ConnectCredentials = {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

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

  private static async request<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');
    headers.set('x-session-id', this.getSessionId() || '');

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const text = await res.text();
    let data: unknown = {};
    try {
      data = text ? (JSON.parse(text) as unknown) : {};
    } catch {
      console.error('Failed to parse response:', text);
      throw new Error('Invalid server response');
    }

    if (!res.ok) {
      const message =
        isRecord(data) && typeof data.error === 'string'
          ? data.error
          : `Request failed: ${res.status} ${res.statusText}`;
      throw new Error(message);
    }
    return data as T;
  }

  static async connect(credentials: ConnectCredentials): Promise<ConnectResponse> {
    const data = await this.request<ConnectResponse>('/connect', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    this.setSessionId(data.sessionId);
    return data;
  }

  static async getConfig(path: string): Promise<ConfigResponse> {
    return this.request(`/config?path=${encodeURIComponent(path)}`);
  }

  static async saveConfig(path: string, content: string) {
    return this.request<SaveConfigResponse>('/config', {
      method: 'POST',
      body: JSON.stringify({ path, content }),
    });
  }

  static async serviceControl(action: string, type: string, serviceName: string, requiresSudo?: boolean) {
    return this.request<ServiceControlResponse>('/service', {
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
    return this.request<LogsResponse>(`/logs?${query.toString()}`);
  }

  static async scan(): Promise<ScanResponse> {
    return this.request<ScanResponse>('/scan', { method: 'POST' });
  }
}
