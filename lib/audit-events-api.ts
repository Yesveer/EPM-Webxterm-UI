import { apiRequest } from './api-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

/** One endpoint-side event: a remote session, a policy change, an inventory
 *  report. Distinct from the portal's own sign-in log, which the auth service
 *  keeps — merging two trails with different actors and retention would make
 *  both harder to trust. */
export interface AuditEvent {
  id: string;
  actor_name: string;
  actor_role: string;
  action: string;
  resource: string;
  resource_id: string;
  machine_name?: string;
  agent_id?: string;
  details?: Record<string, unknown>;
  ip_address: string;
  status: string;
  timestamp: string;
}

export interface AuditEventsResponse {
  events: AuditEvent[] | null;
  total: number;
  /** The whole taxonomy, so the filter offers every event the product claims
   *  to record — not only those present in this tenant's data today. */
  known_actions: string[];
}

export interface AuditFilters {
  actions?: string[];
  actor?: string;
  agentId?: string;
  status?: string;
  search?: string;
  from?: string;
  to?: string;
  limit?: number;
  skip?: number;
}

export interface ComplianceReport {
  from: string;
  to: string;
  total: number;
  by_action: { action: string; count: number }[] | null;
  by_actor: { actor: string; count: number }[] | null;
  remote_access: { sessions_started: number; sessions_ended: number; refused: number };
  policy_changes: number;
  application_control: {
    /** Real today: software matching a block rule found installed. */
    policy_violations_detected: number;
    /** Zero until enforcement exists. */
    blocked: number;
    elevated: number;
    allowed: number;
  };
  policies: { application: number; remote_access: number; enforcement_on: boolean };
  inventory_coverage: {
    machines_total: number;
    machines_reported: number;
    machines_stale: number;
  };
  /** Controls the product does not enforce yet and therefore cannot produce
   *  events for. Returned by the server so the report cannot be rendered
   *  without them. */
  not_yet_recorded: string[];
}

function toQuery(f: AuditFilters): URLSearchParams {
  const q = new URLSearchParams();
  if (f.actions?.length) q.set('actions', f.actions.join(','));
  if (f.actor) q.set('actor', f.actor);
  if (f.agentId) q.set('agent_id', f.agentId);
  if (f.status) q.set('status', f.status);
  if (f.search) q.set('search', f.search);
  if (f.from) q.set('from', f.from);
  if (f.to) q.set('to', f.to);
  if (f.limit) q.set('limit', String(f.limit));
  if (f.skip) q.set('skip', String(f.skip));
  return q;
}

export const auditEventsAPI = {
  list: async (token: string, filters: AuditFilters = {}): Promise<AuditEventsResponse> =>
    apiRequest<AuditEventsResponse>(`/audit-events?${toQuery(filters).toString()}`, { token }),

  report: async (token: string, from?: string, to?: string): Promise<ComplianceReport> => {
    const q = new URLSearchParams();
    if (from) q.set('from', from);
    if (to) q.set('to', to);
    return apiRequest<ComplianceReport>(`/compliance-report?${q.toString()}`, { token });
  },

  /** Downloads the CSV.
   *
   *  Fetched rather than opened as a link, because the download needs the
   *  bearer token and an <a href> cannot carry one. The blob is handed to the
   *  browser the same way a direct link would be. */
  downloadCSV: async (token: string, filters: AuditFilters = {}): Promise<void> => {
    const res = await fetch(`${API_URL}/audit-events/export?${toQuery(filters).toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new Error(`Export failed (${res.status})`);
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `epm-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },
};

/** Human labels for the event taxonomy. */
export const ACTION_LABELS: Record<string, string> = {
  'remote_control.start': 'Remote session started',
  'remote_control.stop': 'Remote session ended',
  'remote_access.refused': 'Remote session refused',
  'policy.created': 'Policy created',
  'policy.updated': 'Policy changed',
  'policy.deleted': 'Policy deleted',
  'policy.synchronized': 'Policy synchronised to agent',
  'inventory.reported': 'Software inventory reported',
  'agent.registered': 'Agent registered',
  'agent.updated': 'Agent updated',
  'application.policy_violation': 'Policy violation detected',
  'application.allowed': 'Application allowed',
  'application.blocked': 'Application blocked',
  'application.elevated': 'Application elevated',
  'jit.requested': 'JIT access requested',
  'jit.approved': 'JIT access approved',
  'jit.rejected': 'JIT access rejected',
  'jit.expired': 'JIT access expired',
  'sudo.executed': 'Sudo command run',
  'sudo.denied': 'Sudo command denied',
};

export function labelFor(action: string): string {
  return ACTION_LABELS[action] ?? action;
}
