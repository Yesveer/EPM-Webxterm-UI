import { apiRequest } from './api-client';

export interface OIDCProviders {
  microsoft_enabled: boolean;
  github_enabled: boolean;
}

export interface OIDCSettings {
  microsoft_enabled: boolean;
  microsoft_client_id: string;
  // Never carries the real secret — only whether one is currently stored.
  microsoft_client_secret_set: boolean;
  microsoft_tenant_id: string;
  github_enabled: boolean;
  github_client_id: string;
  github_client_secret_set: boolean;
  updated_at: string;
  updated_by?: string;
}

// Payload for a save. The *_client_secret fields are optional — omit them (or
// send '') to keep whatever secret is already stored; only send when changing it.
export interface UpdateOIDCSettingsPayload {
  microsoft_enabled?: boolean;
  microsoft_client_id?: string;
  microsoft_client_secret?: string;
  microsoft_tenant_id?: string;
  github_enabled?: boolean;
  github_client_id?: string;
  github_client_secret?: string;
}

export const oidcProvidersAPI = {
  // Public — no token. Needed pre-login on the login page. Cache-busted the
  // same way branding is, since a toggle should take effect immediately.
  getProviders(): Promise<OIDCProviders> {
    return apiRequest<OIDCProviders>(`/oidc/providers?_=${Date.now()}`, {
      method: 'GET',
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });
  },
};

export const oidcSettingsAPI = {
  // super_admin only.
  get(token: string): Promise<OIDCSettings> {
    return apiRequest<OIDCSettings>('/admin/oidc-settings', {
      method: 'GET',
      token,
    });
  },

  // super_admin only.
  update(token: string, payload: UpdateOIDCSettingsPayload): Promise<OIDCSettings> {
    return apiRequest<OIDCSettings>('/admin/oidc-settings', {
      method: 'PUT',
      token,
      body: JSON.stringify(payload),
    });
  },
};
