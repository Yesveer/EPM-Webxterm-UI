import { apiRequest } from './api-client';
import type { PolicyScope } from './policies-api';

/** A recurring span during which sessions may start.
 *
 *  Minutes from midnight rather than a "09:00" string, because that is what
 *  comparison needs. The timezone is the window's own — "business hours" is a
 *  statement about where the people are. */
export interface TimeWindow {
  /** 0 = Sunday. Empty means every day. */
  days?: number[];
  start_minute: number;
  end_minute: number;
  timezone?: string;
}

export interface RemoteAccessPolicy {
  id?: string;
  name: string;
  description?: string;
  enabled: boolean;
  scope: PolicyScope;
  priority: number;

  /** Empty means any role that already passes the ownership check. */
  allowed_roles?: string[];
  /** Empty means any group. These are the directory groups. */
  allowed_group_ids?: string[];

  allow_attended: boolean;
  allow_unattended: boolean;
  allow_terminal: boolean;

  time_windows?: TimeWindow[];

  require_consent: boolean;
  require_reason: boolean;
  /** Refuses the session outright when no recording storage is configured. */
  require_recording: boolean;
  /** Zero means no cap. */
  max_session_minutes: number;

  created_at?: string;
  updated_at?: string;
}

export interface RemoteAccessPolicyListResponse {
  policies: RemoteAccessPolicy[] | null;
  /** Whether recording is actually possible — a "require recording" policy
   *  refuses every session when this is false. */
  recording_available: boolean;
}

export const remoteAccessPoliciesAPI = {
  list: async (token: string): Promise<RemoteAccessPolicyListResponse> =>
    apiRequest<RemoteAccessPolicyListResponse>('/remote-access-policies', { token }),

  create: async (token: string, policy: RemoteAccessPolicy): Promise<RemoteAccessPolicy> =>
    apiRequest<RemoteAccessPolicy>('/remote-access-policies', {
      method: 'POST',
      token,
      body: JSON.stringify(policy),
    }),

  update: async (
    token: string,
    id: string,
    policy: RemoteAccessPolicy,
  ): Promise<RemoteAccessPolicy> =>
    apiRequest<RemoteAccessPolicy>(`/remote-access-policies/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(policy),
    }),

  remove: async (token: string, id: string): Promise<{ message: string }> =>
    apiRequest<{ message: string }>(`/remote-access-policies/${id}`, { method: 'DELETE', token }),
};

export function newRemoteAccessPolicy(): RemoteAccessPolicy {
  return {
    name: '',
    enabled: true,
    scope: { kind: 'tenant' },
    priority: 0,
    // All three ways in default to permitted, so saving a policy never
    // silently cuts off a route nobody thought about.
    allow_attended: true,
    allow_unattended: true,
    allow_terminal: true,
    time_windows: [],
    require_consent: true,
    require_reason: false,
    require_recording: false,
    max_session_minutes: 0,
  };
}

/** "09:00" ⇄ minutes from midnight. */
export function minutesToClock(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function clockToMinutes(value: string): number {
  const [h, m] = value.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
