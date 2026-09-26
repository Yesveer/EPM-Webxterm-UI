export type DeploymentStatus = 'pending' | 'active' | 'inactive' | 'error';

export interface Deployment {
  id: string;
  tenant_id: string;
  user_id: string;
  machine_id: string;
  machine_name: string;
  name: string;
  port: number;
  subdomain: string;
  public_url: string;
  custom_domain?: string;
  status: DeploymentStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateDeploymentRequest {
  machine_id: string;
  machine_name: string;
  name: string;
  port: number;
}

// Deployments go through vsay-auth (same as all other APIs) which proxies to vsay-tunnel.
// vsay-auth validates the JWT and forwards user context to vsay-tunnel.
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8082/api';

async function request<T>(
  path: string,
  options: RequestInit = {},
  token: string
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const deploymentsAPI = {
  list: async (token: string): Promise<Deployment[]> => {
    const data = await request<{ deployments: Deployment[] }>(
      '/deployments',
      {},
      token
    );
    return data.deployments ?? [];
  },

  create: async (token: string, req: CreateDeploymentRequest): Promise<Deployment> => {
    const data = await request<{ deployment: Deployment }>(
      '/deployments',
      { method: 'POST', body: JSON.stringify(req) },
      token
    );
    return data.deployment;
  },

  start: async (token: string, id: string): Promise<void> => {
    await request(`/deployments/${id}/start`, { method: 'PUT' }, token);
  },

  stop: async (token: string, id: string): Promise<void> => {
    await request(`/deployments/${id}/stop`, { method: 'PUT' }, token);
  },

  delete: async (token: string, id: string): Promise<void> => {
    await request(`/deployments/${id}`, { method: 'DELETE' }, token);
  },

  get: async (token: string, id: string): Promise<Deployment> => {
    const data = await request<{ deployment: Deployment }>(
      `/deployments/${id}`,
      {},
      token
    );
    return data.deployment;
  },

  setCustomDomain: async (token: string, id: string, domain: string): Promise<void> => {
    await request(`/deployments/${id}/custom-domain`, {
      method: 'POST',
      body: JSON.stringify({ domain }),
    }, token);
  },

  removeCustomDomain: async (token: string, id: string): Promise<void> => {
    await request(`/deployments/${id}/custom-domain`, { method: 'DELETE' }, token);
  },

  checkSubdomain: async (token: string, subdomain: string): Promise<boolean> => {
    const data = await request<{ available: boolean }>(
      `/deployments/check/${subdomain}`,
      {},
      token
    );
    return data.available;
  },
};
