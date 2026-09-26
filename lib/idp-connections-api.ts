import { apiRequest } from './api-client';

// Generic identity provider federation — replaces the old hardcoded
// Microsoft/GitHub-only OIDC settings. vsay-iam supports any OIDC-compliant
// IdP (Okta, Azure AD/Entra, Google, Auth0, ...), any SAML 2.0 IdP (ADFS,
// PingFederate, Shibboleth, ...), and AWS IAM forward federation — all
// configured as "connections" distinguished by `protocol`.

export type IdPProtocol = 'oidc' | 'saml' | 'aws-iam';

export interface IdPConnection {
  id: string;
  tenant_id: string;
  alias: string;
  display_name: string;
  enabled: boolean;
  protocol: IdPProtocol;
  // OIDC
  issuer_url?: string;
  client_id?: string;
  client_secret_set?: boolean;
  scopes?: string[];
  // SAML
  saml_metadata_url?: string;
  saml_metadata_xml_set?: boolean;
  // AWS IAM
  aws_allowed_account_ids?: string[];
  updated_by?: string;
  updated_at: string;
}

// What the public, pre-login endpoints return — just enough to render an SSO button.
export interface PublicConnection {
  alias: string;
  display_name: string;
}

export interface CreateIdPConnectionPayload {
  tenant_id?: string; // "" / omitted = global/shared connection (super_admin only)
  alias: string;
  display_name: string;
  enabled: boolean;
  protocol: IdPProtocol;
  issuer_url?: string;
  client_id?: string;
  client_secret?: string;
  scopes?: string[];
  saml_metadata_url?: string;
  saml_metadata_xml?: string;
  aws_allowed_account_ids?: string[];
}

// Partial update — client_secret is only overwritten when non-empty, so a
// save never has to re-supply an already-configured secret.
export interface UpdateIdPConnectionPayload {
  display_name?: string;
  enabled?: boolean;
  issuer_url?: string;
  client_id?: string;
  client_secret?: string;
  scopes?: string[];
  saml_metadata_url?: string;
  saml_metadata_xml?: string;
  aws_allowed_account_ids?: string[];
}

export const idpConnectionsAPI = {
  // Public — no token. Needed pre-login on the login page. Cache-busted the
  // same way branding is, since a toggle should take effect immediately.
  async listPublicConnections(): Promise<{ oidc: PublicConnection[]; saml: PublicConnection[] }> {
    const fetchList = (path: string) =>
      apiRequest<{ connections: PublicConnection[] }>(`${path}?_=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      }).catch(() => ({ connections: [] as PublicConnection[] }));

    const [oidcRes, samlRes] = await Promise.all([
      fetchList('/auth/oidc/connections'),
      fetchList('/auth/saml/connections'),
    ]);
    return { oidc: oidcRes.connections, saml: samlRes.connections };
  },

  // super_admin sees every connection (optionally filtered by tenant_id);
  // company_admin sees their own tenant's plus any global ones.
  list(token: string, tenantId?: string): Promise<{ connections: IdPConnection[]; total: number }> {
    const qs = tenantId ? `?tenant_id=${encodeURIComponent(tenantId)}` : '';
    return apiRequest<{ connections: IdPConnection[]; total: number }>(`/admin/idp-connections${qs}`, {
      method: 'GET',
      token,
    });
  },

  create(token: string, payload: CreateIdPConnectionPayload): Promise<IdPConnection> {
    return apiRequest<IdPConnection>('/admin/idp-connections', {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    });
  },

  update(token: string, id: string, payload: UpdateIdPConnectionPayload): Promise<IdPConnection> {
    return apiRequest<IdPConnection>(`/admin/idp-connections/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(payload),
    });
  },

  delete(token: string, id: string): Promise<{ message: string }> {
    return apiRequest<{ message: string }>(`/admin/idp-connections/${id}`, {
      method: 'DELETE',
      token,
    });
  },
};

// Builds the login-redirect URL for one connection — protocol picks the URL
// namespace (/auth/oidc/:alias/login vs /auth/saml/:alias/login).
export function getSSOLoginURL(alias: string, protocol: 'oidc' | 'saml'): string {
  const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8082/api').replace(/\/$/, '');
  return `${base}/auth/${protocol}/${alias}/login`;
}
