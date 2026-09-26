export interface TerminalMessage {
  type: 'output' | 'error' | 'command_started' | 'session_ready';
  output?: string;
  error?: string;
  command_id?: string;
  command?: string;
  success?: boolean;
}

// How long a session may sit with no user-issued command/keystroke before this
// client proactively closes it. Relying on the network/agent to notice an idle
// connection was inconsistent — this makes idle timeout a deterministic,
// client-owned decision so "resume after being idle" always means a fresh
// session, never a silently-continued dead one.
// A super_admin can customize the number of minutes (Settings → Terminal
// Settings, stored in the org's branding config) — this is just the fallback
// when nothing has been configured yet.
const DEFAULT_IDLE_TIMEOUT_MINUTES = 2;
const IDLE_CHECK_INTERVAL_MS = 5 * 1000;

export class TerminalWebSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private token: string;
  private agentId: string;
  private sessionId: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private intentionalClose = false; // Flag to prevent reconnection on intentional close
  private lastActivityAt = Date.now();
  private idleTimeoutMs: number;
  private idleCheckTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  public onMessage: ((message: TerminalMessage) => void) | null = null;
  public onConnect: (() => void) | null = null;
  public onDisconnect: (() => void) | null = null;
  public onError: ((error: string) => void) | null = null;
  // Fired when a dropped connection is about to auto-reconnect with a brand
  // new session id (see onclose below) — lets the UI tell the user their old
  // session is gone rather than silently showing the same terminal as before.
  public onSessionRenewed: ((newSessionId: string) => void) | null = null;
  // Fired the moment this client decides a session has been idle too long,
  // right before it closes the connection (which then triggers the same
  // fresh-session reconnect as any other drop, via onSessionRenewed above).
  public onIdleTimeout: (() => void) | null = null;

  constructor(agentId: string, token: string, sessionId?: string, idleTimeoutMinutes?: number) {
    this.agentId = agentId;
    this.token = token;
    this.sessionId = sessionId || this.generateSessionId();
    this.idleTimeoutMs =
      (idleTimeoutMinutes && idleTimeoutMinutes > 0 ? idleTimeoutMinutes : DEFAULT_IDLE_TIMEOUT_MINUTES) * 60 * 1000;
    this.rebuildUrl();
    this.startIdleWatcher();
  }

  getIdleTimeoutMinutes(): number {
    return this.idleTimeoutMs / 60000;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private rebuildUrl(): void {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

    // Determine WebSocket protocol from API URL
    const wsProtocol = apiUrl.startsWith('https://') ? 'wss:' : 'ws:';
    const wsUrl = apiUrl.replace('http://', '').replace('https://', '');

    // Include source=ui for tracking
    this.url = `${wsProtocol}//${wsUrl}/terminal/${this.agentId}/ws?session_id=${this.sessionId}&source=ui`;
  }

  private markActivity(): void {
    this.lastActivityAt = Date.now();
  }

  private startIdleWatcher(): void {
    if (this.idleCheckTimer) return;
    this.idleCheckTimer = setInterval(() => {
      if (this.ws?.readyState !== WebSocket.OPEN) return;
      if (Date.now() - this.lastActivityAt < this.idleTimeoutMs) return;

      if (this.onIdleTimeout) {
        this.onIdleTimeout();
      }

      // Idle timeout is a deliberate policy close, not a dropped connection —
      // end the session for good rather than silently opening a replacement
      // behind the user's back. They must explicitly start a new session
      // (matches disconnect()'s "no auto-reconnect" behavior).
      this.intentionalClose = true;
      if (this.idleCheckTimer) {
        clearInterval(this.idleCheckTimer);
        this.idleCheckTimer = null;
      }
      this.ws.close(4000, 'Idle timeout');
    }, IDLE_CHECK_INTERVAL_MS);
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      this.intentionalClose = false; // Reset flag for new connection
      // Add token as query parameter since WebSocket doesn't support custom headers easily
      const urlWithToken = `${this.url}&token=${encodeURIComponent(this.token)}`;
      this.ws = new WebSocket(urlWithToken);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.markActivity(); // fresh connection shouldn't be judged idle from before it existed
        if (this.onConnect) {
          this.onConnect();
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const message: TerminalMessage = JSON.parse(event.data);
          if (this.onMessage) {
            this.onMessage(message);
          }
        } catch (error) {
          // Raw text output
          if (this.onMessage) {
            this.onMessage({
              type: 'output',
              output: event.data,
            });
          }
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        if (this.onError) {
          this.onError('Connection error occurred');
        }
      };

      this.ws.onclose = () => {
        if (this.onDisconnect) {
          this.onDisconnect();
        }

        // Only attempt to reconnect if not intentionally closed
        if (!this.intentionalClose && this.reconnectAttempts < this.maxReconnectAttempts) {
          // The connection that just dropped (idle timeout, network blip, etc.) may
          // already be dead server-side. Reconnecting with the same session_id
          // would make the backend silently *reactivate* that stale session
          // instead of starting a real one — so mint a fresh id before
          // reconnecting, guaranteeing a brand new shell rather than a
          // resumed/zombie one.
          this.sessionId = this.generateSessionId();
          this.rebuildUrl();
          if (this.onSessionRenewed) {
            this.onSessionRenewed(this.sessionId);
          }

          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.reconnectAttempts++;
            this.connect();
          }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts));
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      if (this.onError) {
        this.onError('Failed to establish connection');
      }
    }
  }

  sendCommand(command: string): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      if (this.onError) {
        this.onError('Not connected to terminal');
      }
      return;
    }

    this.markActivity();

    const message = {
      type: 'command',
      command,
    };

    this.ws.send(JSON.stringify(message));
  }

  sendInput(input: string): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      return;
    }

    this.markActivity();

    const message = {
      type: 'input',
      input,
    };

    this.ws.send(JSON.stringify(message));
  }

  resize(rows: number, cols: number): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      return;
    }

    const message = {
      type: 'resize',
      rows,
      cols,
    };

    this.ws.send(JSON.stringify(message));
  }

  disconnect(): void {
    this.intentionalClose = true; // Prevent reconnection

    if (this.idleCheckTimer) {
      clearInterval(this.idleCheckTimer);
      this.idleCheckTimer = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'User disconnected'); // Normal closure with reason
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  getSessionId(): string {
    return this.sessionId;
  }
}
