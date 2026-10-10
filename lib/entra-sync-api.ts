import { apiRequest } from './api-client';

/** Microsoft Entra directory synchronisation.
 *
 *  This is what makes SSO usable without pre-creating every account by hand,
 *  and what lets application policy be scoped to directory groups. */
export interface EntraSyncSettings {
  enabled: boolean;
  directory_tenant_id: string;
  client_id: string;
  /** The secret is never returned — only whether one is stored. */
  has_client_secret: boolean;
  sync_users: boolean;
  sync_groups: boolean;
  interval_minutes: number;
  default_role: string;
  group_filter: string;
  /** True when the sync is falling back to the sign-in button's app
   *  registration, which usually carries only delegated permissions. */
  using_shared_credentials: boolean;

  last_run_at?: string;
  last_status?: string;
  last_error?: string;
  last_users_created: number;
  last_users_updated: number;
  last_users_disabled: number;
  last_groups_created: number;
  last_groups_updated: number;

  /** What the run attempted, not just what it achieved. Four zeros mean five
   *  different things without these — a switched-off toggle, an empty
   *  directory, everyone skipped, everyone failed, or nothing to do. */
  last_users_seen: number;
  last_users_skipped: number;
  last_users_failed: number;
  last_user_error?: string;
  last_users_sync_off: boolean;
}

export interface EntraSyncSavePayload {
  enabled: boolean;
  directory_tenant_id: string;
  client_id: string;
  /** Empty means "keep the stored secret". */
  client_secret: string;
  sync_users: boolean;
  sync_groups: boolean;
  interval_minutes: number;
  default_role: string;
  group_filter: string;
}

export interface EntraSyncRunResult {
  status: string;
  error?: string;
  users_created: number;
  users_updated: number;
  users_disabled: number;
  groups_created: number;
  groups_updated: number;

  users_seen: number;
  users_skipped: number;
  users_failed: number;
  user_error?: string;
  users_sync_off: boolean;
}

export const entraSyncAPI = {
  get: async (token: string): Promise<EntraSyncSettings> =>
    apiRequest<EntraSyncSettings>('/entra-sync', { token }),

  save: async (token: string, settings: EntraSyncSavePayload): Promise<{ message: string }> =>
    apiRequest<{ message: string }>('/entra-sync', {
      method: 'POST',
      token,
      body: JSON.stringify(settings),
    }),

  /** Reads one user, so it proves the application permissions were consented
   *  rather than only that the credentials authenticate. */
  test: async (token: string): Promise<{ message: string }> =>
    apiRequest<{ message: string }>('/entra-sync/test', { method: 'POST', token }),

  runNow: async (token: string): Promise<EntraSyncRunResult> =>
    apiRequest<EntraSyncRunResult>('/entra-sync/run', { method: 'POST', token }),
};
