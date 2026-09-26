import { apiRequest } from './api-client';

export interface AuditLog {
  id: string;
  user_id: string;
  username: string;
  tenant_id: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  method: string;
  endpoint: string;
  response_status: number;
  source: string;
  ip_address: string;
  browser?: string;
  os?: string;
  error?: string;
  timestamp: string;
}

export interface AuditLogsResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface TenantOption {
  tenant_id: string;
  tenant_name: string;
}

export interface TenantsResponse {
  tenants: TenantOption[];
}

export const auditAPI = {
  getLogs(
    token: string,
    opts: { tenantId?: string; page?: number; limit?: number } = {}
  ): Promise<AuditLogsResponse> {
    const params = new URLSearchParams({
      page: String(opts.page ?? 1),
      limit: String(opts.limit ?? 25),
    });
    if (opts.tenantId) params.set('tenant_id', opts.tenantId);
    return apiRequest<AuditLogsResponse>(`/audit-logs?${params.toString()}`, { token });
  },

  getTenants(token: string): Promise<TenantsResponse> {
    return apiRequest<TenantsResponse>('/audit-logs/tenants', { token });
  },
};
