import { apiRequest } from './api-client';

export interface AccessRequest {
  id: string;
  machine_id: string;
  machine_name: string;
  machine_agent_id: string;
  requester_id: string;
  requester_username: string;
  requester_email: string;
  tenant_id: string;
  owner_id: string;
  owner_email: string;
  request_note: string;
  duration_hours: number;
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'revoked';
  approved_by?: string;
  approved_at?: string;
  expires_at?: string;
  rejected_by?: string;
  reject_comment?: string;
  revoked_by?: string;
  revoked_at?: string;
  requested_at: string;
  updated_at: string;
}

export interface AccessRequestListResponse {
  requests: AccessRequest[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export const accessRequestsAPI = {
  async create(token: string, machineId: string, durationHours: number, requestNote: string): Promise<AccessRequest> {
    return apiRequest<AccessRequest>('/access-requests', {
      method: 'POST',
      body: JSON.stringify({ machine_id: machineId, duration_hours: durationHours, request_note: requestNote }),
      token,
    });
  },

  async getMy(token: string): Promise<{ requests: AccessRequest[]; total: number }> {
    return apiRequest<{ requests: AccessRequest[]; total: number }>('/access-requests/my', {
      method: 'GET',
      token,
    });
  },

  async getMachineRequests(token: string, agentId: string): Promise<{ requests: AccessRequest[]; total: number }> {
    return apiRequest<{ requests: AccessRequest[]; total: number }>(`/machines/${agentId}/access-requests`, {
      method: 'GET',
      token,
    });
  },

  async getPendingCount(token: string, agentId: string): Promise<{ count: number }> {
    return apiRequest<{ count: number }>(`/machines/${agentId}/pending-requests-count`, {
      method: 'GET',
      token,
    });
  },

  async approve(token: string, requestId: string): Promise<{ message: string; request: AccessRequest }> {
    return apiRequest<{ message: string; request: AccessRequest }>(`/access-requests/${requestId}/approve`, {
      method: 'POST',
      body: JSON.stringify({}),
      token,
    });
  },

  async reject(token: string, requestId: string, comment: string): Promise<{ message: string; request: AccessRequest }> {
    return apiRequest<{ message: string; request: AccessRequest }>(`/access-requests/${requestId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
      token,
    });
  },

  // Admin-only — GET /api/access-requests (list-all across machines, one status tab at a time)
  async list(
    token: string,
    params: { status: AccessRequest['status']; search?: string; page?: number; limit?: number; tenantId?: string },
  ): Promise<AccessRequestListResponse> {
    const query = new URLSearchParams({ status: params.status });
    if (params.search) query.set('search', params.search);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.tenantId) query.set('tenant_id', params.tenantId);
    return apiRequest<AccessRequestListResponse>(`/access-requests?${query.toString()}`, {
      method: 'GET',
      token,
    });
  },

  // Admin-only — cuts short an active (approved) grant mid-session
  async revoke(token: string, requestId: string): Promise<{ message: string; request: AccessRequest }> {
    return apiRequest<{ message: string; request: AccessRequest }>(`/access-requests/${requestId}/revoke`, {
      method: 'POST',
      body: JSON.stringify({}),
      token,
    });
  },
};

export function formatDuration(hours: number): string {
  if (hours === 0) return 'No Expiration';
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  const rem = hours % 24;
  return rem > 0 ? `${days}d ${rem}h` : `${days}d`;
}
