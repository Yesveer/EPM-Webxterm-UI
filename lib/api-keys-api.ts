import { apiRequest } from './api-client';

export interface APIKeyInfo {
  id: string;
  name: string;
  key_prefix: string;
  expires_at: string | null;
  last_used_at: string | null;
  created_at: string;
}

// Only present on the response to create() — the raw key is shown exactly
// once and is not recoverable afterwards.
export interface CreatedAPIKey extends APIKeyInfo {
  key: string;
}

export const MAX_API_KEYS = 5;

export const apiKeysAPI = {
  list(token: string): Promise<{ keys: APIKeyInfo[]; total: number }> {
    return apiRequest<{ keys: APIKeyInfo[]; total: number }>('/api-keys', {
      method: 'GET',
      token,
    });
  },

  // expiresInDays: undefined/0 means "never expires".
  create(token: string, name: string, expiresInDays?: number): Promise<CreatedAPIKey> {
    return apiRequest<CreatedAPIKey>('/api-keys', {
      method: 'POST',
      body: JSON.stringify({ name, expires_in_days: expiresInDays ?? 0 }),
      token,
    });
  },

  revoke(token: string, id: string): Promise<{ message: string }> {
    return apiRequest<{ message: string }>(`/api-keys/${id}`, {
      method: 'DELETE',
      token,
    });
  },
};
