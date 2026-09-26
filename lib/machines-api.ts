import { apiRequest } from './api-client';

export interface ResourceStats {
  cpu_percent: number;
  memory_percent: number;
  disk_percent: number;
  network_inbound: number;
  network_outbound: number;
  uptime_seconds?: number;
}

export interface Machine {
  id: string;
  agent_id: string;
  name: string;
  hostname: string;
  description: string;
  os: string;
  ip_address: string;
  status: 'online' | 'offline' | 'pending' | 'executing_script';
  is_connected: boolean;
  last_active: string;
  uptime: number;
  resource_stats: ResourceStats;
  metadata: Record<string, string>;
  tenant_id: string;
  owner_id: string;
  group_ids: string[];
  allowed_users: string[];
  deploy_application?: boolean;
  agent_stats?: AgentStats | null;
}

export interface AgentStats {
  cpu_percent: number;
  memory_mb: number;
  goroutines: number;
  uptime_sec: number;
  version: string;
  open_tunnels: number;
  open_sessions: number;
  updated_at: string;
}

export interface LogEntry {
  id: string;
  machine_name: string;
  username: string;
  command: string;
  output?: string;  // Command output/response
  timestamp: string;
  success: boolean;
  session_id?: string;
  source?: string;  // "vscode", "cli", "ui"
  browser?: string;
  os_info?: string;
  ip_address?: string;
}

export interface Session {
  id: string;
  session_id: string;
  machine_id: string;
  agent_id: string;
  user_id: string;
  username: string;
  source: string;  // "vscode", "cli", "ui"
  browser: string;
  os_info: string;
  ip_address: string;
  status: 'active' | 'closed';
  command_count: number;
  created_at: string;
  closed_at?: string;
}

export interface DashboardStats {
  total_machines: number;
  online_machines: number;
  offline_machines: number;
  avg_cpu: number;
  avg_memory: number;
  avg_disk: number;
}

export interface AccessEvent {
  id: string;
  machine_id: string;
  agent_id: string;
  protocol: string;   // "ssh" | "rdp" | "console"
  os_user: string;
  source_ip: string;
  line: string;
  active: boolean;
  login_at: string;
  logout_at?: string;
  created_at: string;
}

export interface SessionRecording {
  id: string;
  session_id: string;
  machine_id: string;
  machine_name: string;
  tenant_id: string;
  username: string;
  s3_key: string;
  size_bytes: number;
  duration_seconds: number;
  created_at: string;
}

export interface CreateMachineResponse {
  id: string;
  name: string;
  description: string;
  registration_token: string;
  status: string;
  api_key: string;
}

export const machinesAPI = {
  async createPendingMachine(token: string, name: string, description: string, deployApplication = false, customScript = ''): Promise<CreateMachineResponse> {
    return apiRequest<CreateMachineResponse>('/machines', {
      method: 'POST',
      body: JSON.stringify({ name, description, deploy_application: deployApplication, custom_script: customScript }),
      token,
    });
  },

  async listMachines(token: string, opts: { tenantId?: string; search?: string; page?: number; limit?: number; forRequest?: boolean } = {}): Promise<{ machines: Machine[]; total: number; page: number; limit: number; total_pages: number }> {
    const params = new URLSearchParams();
    if (opts.page !== undefined) params.set('page', String(opts.page));
    if (opts.limit !== undefined) params.set('limit', String(opts.limit));
    if (opts.tenantId) params.set('tenant_id', opts.tenantId);
    if (opts.search) params.set('search', opts.search);
    if (opts.forRequest) params.set('for_request', 'true');
    return apiRequest(`/machines?${params}`, { method: 'GET', token });
  },

  async getMachineDetails(token: string, agentId: string): Promise<Machine> {
    return apiRequest<Machine>(`/machines/${agentId}`, {
      method: 'GET',
      token,
    });
  },

  async getMachineById(token: string, machineId: string): Promise<Machine & { registration_token?: string }> {
    return apiRequest<Machine & { registration_token?: string }>(`/machines/by-id/${machineId}`, {
      method: 'GET',
      token,
    });
  },

  async getMachineLogs(token: string, agentId: string, opts: { page?: number; limit?: number } = {}): Promise<{ logs: LogEntry[]; total: number; page: number; limit: number; total_pages: number }> {
    const params = new URLSearchParams({ page: String(opts.page ?? 1), limit: String(opts.limit ?? 25) });
    return apiRequest(`/machines/${agentId}/logs?${params}`, { method: 'GET', token });
  },

  async getMachineLogsByMachineId(token: string, machineId: string): Promise<{ logs: LogEntry[] }> {
    // First get machine to get agent_id
    const machine = await apiRequest<Machine>(`/machines/by-id/${machineId}`, {
      method: 'GET',
      token,
    });
    if (!machine.agent_id) {
      return { logs: [] };
    }
    return apiRequest<{ logs: LogEntry[] }>(`/machines/${machine.agent_id}/logs`, {
      method: 'GET',
      token,
    });
  },

  async executeCommand(
    token: string,
    agentId: string,
    command: string
  ): Promise<{ command_id: string; status: string }> {
    return apiRequest<{ command_id: string; status: string }>(
      `/machines/${agentId}/command`,
      {
        method: 'POST',
        body: JSON.stringify({ command }),
        token,
      }
    );
  },

  async getDashboardStats(token: string): Promise<DashboardStats> {
    return apiRequest<DashboardStats>('/dashboard/stats', {
      method: 'GET',
      token,
    });
  },

  async getRecentActivity(token: string): Promise<{ activities: LogEntry[] }> {
    return apiRequest<{ activities: LogEntry[] }>('/dashboard/recent-activity', {
      method: 'GET',
      token,
    });
  },

  async deleteMachine(token: string, agentId: string): Promise<{ message: string }> {
    return apiRequest<{ message: string }>(`/machines/${agentId}`, {
      method: 'DELETE',
      token,
    });
  },

  async checkAgentUpdate(token: string, agentId: string): Promise<{
    current_version: string;
    latest_version: string;
    update_available: boolean;
    is_connected: boolean;
  }> {
    return apiRequest(`/machines/${agentId}/update-check`, {
      method: 'GET',
      token,
    });
  },

  async updateAgent(token: string, agentId: string): Promise<{
    message: string;
    download_url: string;
    target_os: string;
    target_arch: string;
  }> {
    return apiRequest(`/machines/${agentId}/update`, {
      method: 'POST',
      token,
    });
  },

  async grantAccess(token: string, agentId: string, username: string): Promise<{ message: string }> {
    return apiRequest<{ message: string }>(`/machines/${agentId}/access/grant`, {
      method: 'POST',
      body: JSON.stringify({ username }),
      token,
    });
  },

  async revokeAccess(token: string, agentId: string, username: string): Promise<{ message: string }> {
    return apiRequest<{ message: string }>(`/machines/${agentId}/access/revoke`, {
      method: 'POST',
      body: JSON.stringify({ username }),
      token,
    });
  },

  async listAllUsers(token: string): Promise<{ users: Array<{ id: string; username: string; email: string; role: string }> }> {
    return apiRequest<{ users: Array<{ id: string; username: string; email: string; role: string }> }>('/users', {
      method: 'GET',
      token,
    });
  },

  async getMachineAccessUsers(token: string, agentId: string): Promise<{ users: Array<{ username: string; email: string; granted_at: string }>; total: number }> {
    return apiRequest<{ users: Array<{ username: string; email: string; granted_at: string }>; total: number }>(`/machines/${agentId}/access/users`, {
      method: 'GET',
      token,
    });
  },

  // External SSH/RDP access events (intrusion tracking)
  async getAccessEvents(token: string, agentId: string): Promise<{ events: AccessEvent[]; active: AccessEvent[]; total: number }> {
    return apiRequest<{ events: AccessEvent[]; active: AccessEvent[]; total: number }>(`/machines/${agentId}/access-events`, {
      method: 'GET',
      token,
    });
  },

  // Session APIs
  async getMachineSessions(token: string, agentId: string, opts: { page?: number; limit?: number } = {}): Promise<{ sessions: Session[]; total: number; page: number; limit: number; total_pages: number }> {
    const params = new URLSearchParams({ page: String(opts.page ?? 1), limit: String(opts.limit ?? 25) });
    return apiRequest(`/machines/${agentId}/sessions?${params}`, { method: 'GET', token });
  },

  async getActiveSessions(token: string, agentId: string): Promise<{ sessions: Session[] }> {
    return apiRequest<{ sessions: Session[] }>(`/machines/${agentId}/sessions/active`, {
      method: 'GET',
      token,
    });
  },

  async getSessionDetails(token: string, sessionId: string, opts: { page?: number; limit?: number } = {}): Promise<{ session: Session; logs: LogEntry[]; machine_name: string; logs_total: number; logs_page: number; logs_limit: number; logs_total_pages: number }> {
    const params = new URLSearchParams({ page: String(opts.page ?? 1), limit: String(opts.limit ?? 25) });
    return apiRequest(`/sessions/${sessionId}?${params}`, { method: 'GET', token });
  },

  async searchLogs(token: string, agentId: string, query: string, opts: { page?: number; limit?: number } = {}): Promise<{ logs: LogEntry[]; total: number; page: number; limit: number; total_pages: number }> {
    const params = new URLSearchParams({ q: query, page: String(opts.page ?? 1), limit: String(opts.limit ?? 25) });
    return apiRequest(`/machines/${agentId}/logs/search?${params}`, { method: 'GET', token });
  },

  // Session Recordings
  async getRecordings(token: string, agentId: string, opts: { limit?: number; skip?: number } = {}): Promise<{ recordings: SessionRecording[]; total: number }> {
    const params = new URLSearchParams({ limit: String(opts.limit ?? 50), skip: String(opts.skip ?? 0) });
    return apiRequest(`/machines/${agentId}/recordings?${params}`, { method: 'GET', token });
  },

  async getRecordingURL(token: string, recordingId: string): Promise<{ url: string; expires_in: number; recording: SessionRecording }> {
    return apiRequest(`/recordings/${recordingId}/url`, { method: 'GET', token });
  },
};
