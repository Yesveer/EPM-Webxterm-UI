import { apiRequest } from './api-client';

export interface DashboardStats {
  total_machines: number;
  active_machines: number;
  inactive_machines: number;
  total_sessions: number;
  avg_cpu: number;
  avg_memory: number;
  avg_disk: number;
  avg_network_in: number;
  avg_network_out: number;
}

export interface RecentMachine {
  id: string;
  agent_id: string;
  name: string;
  status: string;
  last_active: string;
  os: string;
  ip_address: string;
}

export interface RecentActivity {
  id: string;
  machine_id: string;
  machine_name: string;
  command: string;
  output: string;
  success: boolean;
  timestamp: string;
}

export const dashboardApi = {
  async getStats(token: string): Promise<DashboardStats> {
    return apiRequest<DashboardStats>('/dashboard/stats', {
      method: 'GET',
      token,
    });
  },

  async getRecentMachines(token: string): Promise<{ machines: RecentMachine[] }> {
    return apiRequest<{ machines: RecentMachine[] }>('/dashboard/recent-machines', {
      method: 'GET',
      token,
    });
  },

  async getRecentActivity(token: string): Promise<{ activities: RecentActivity[] }> {
    return apiRequest<{ activities: RecentActivity[] }>('/dashboard/recent-activity', {
      method: 'GET',
      token,
    });
  },
};
