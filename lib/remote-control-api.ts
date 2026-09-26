import { apiRequest } from './api-client';

/**
 * Remote control is the AnyDesk-style feature: an admin joins the user's LIVE
 * desktop session rather than opening a separate one the way RDP does. The
 * user sees everything that happens and the session is recorded.
 *
 * The flow is deliberately two-step. Starting a session only ASKS — the user
 * still has to approve a prompt on their own machine — so the caller polls
 * `getStatus` until the state settles rather than waiting on one long request.
 */

export type RemoteControlState =
  | 'idle'
  | 'awaiting_consent'
  | 'active'
  | 'denied'
  | 'timed_out'
  | 'error';

export interface RemoteControlSession {
  agent_id?: string;
  session_id?: string;
  state: RemoteControlState;
  error?: string;
  width?: number;
  height?: number;
  viewer?: string;
  admin_name?: string;
  reason?: string;
  view_only: boolean;
  /** What the machine is enforcing for this session. */
  idle_timeout_minutes?: number;
  started_at?: string;
  updated_at?: string;
}

export interface StartRemoteControlRequest {
  /** Shown to the user in the consent prompt, e.g. a ticket reference. */
  reason?: string;
  /** Watch without being able to type or click. */
  view_only?: boolean;
  /** How long to wait for the user to answer. The agent defaults to 60s. */
  consent_timeout_sec?: number;
  /**
   * Ends the session after this long with no input from the admin.
   *
   * Comes from the organisation's Idle Session Timeout setting. Unlike the
   * terminal — where the browser enforces it — the MACHINE enforces this one,
   * so a crashed or hung tab cannot leave somebody's screen shared.
   */
  idle_timeout_minutes?: number;
}

/** States from which nothing further will happen without starting again. */
export function isTerminalState(state: RemoteControlState): boolean {
  return state === 'idle' || state === 'denied' || state === 'timed_out' || state === 'error';
}

/** A sentence explaining the state, suitable for showing directly. */
export function describeState(session: RemoteControlSession): string {
  switch (session.state) {
    case 'awaiting_consent':
      return 'Waiting for the user to approve the session on their machine…';
    case 'active':
      return session.view_only
        ? 'Connected — view only. You can see the screen but not control it.'
        : 'Connected. The user can see everything you do.';
    case 'denied':
      return 'The user declined the request.';
    case 'timed_out':
      return 'Nobody answered the prompt on the machine, so the request expired.';
    case 'error':
      return session.error || 'The session could not be started.';
    default:
      return 'No session is running.';
  }
}

export const remoteControlAPI = {
  /**
   * Ask the machine to begin a session. Returns once the request has been
   * delivered — the user has NOT approved yet at this point.
   */
  async start(
    token: string,
    agentId: string,
    body: StartRemoteControlRequest = {}
  ): Promise<{ state: RemoteControlState; message?: string }> {
    return apiRequest(`/machines/${agentId}/remote-control/start`, {
      method: 'POST',
      token,
      body: JSON.stringify(body),
    });
  },

  async getStatus(token: string, agentId: string): Promise<RemoteControlSession> {
    return apiRequest(`/machines/${agentId}/remote-control/status`, { token });
  },

  async stop(token: string, agentId: string): Promise<{ state: RemoteControlState }> {
    return apiRequest(`/machines/${agentId}/remote-control/stop`, {
      method: 'POST',
      token,
    });
  },
};
