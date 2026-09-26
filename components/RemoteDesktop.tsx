'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';

interface RemoteDesktopProps {
  agentId: string;
  token: string;
  username: string;
  password: string;
  domain?: string;
  /** "rdp" (Windows Pro) or "vnc" (Windows Home). Defaults to rdp. */
  protocol?: 'rdp' | 'vnc';
  /** Called when the connection state changes so the parent can show status. */
  onStateChange?: (state: 'connecting' | 'connected' | 'disconnected' | 'error') => void;
  /** Called when the user clicks "Back" on the error screen (return to the form). */
  onExit?: () => void;
}

// Guacamole client states (from guacamole-common-js).
const STATE_CONNECTED = 3;
const STATE_DISCONNECTED = 5;

// Map a Guacamole status code to a human message.
function guacErrorMessage(status: any): string {
  const code = status?.code;
  switch (code) {
    case 0x0301: // CLIENT_UNAUTHORIZED
      return 'Authentication failed — the username or password is wrong.';
    case 0x0202: // UPSTREAM_TIMEOUT
    case 0x0203: // UPSTREAM_ERROR
    case 0x0207: // UPSTREAM_UNAVAILABLE
    case 0x0204: // RESOURCE_NOT_FOUND
      return 'Could not reach the desktop server on the machine (is RDP/VNC running?).';
    case 0x0308: // CLIENT_TIMEOUT
      return 'The connection timed out.';
    default:
      return status?.message || 'Remote desktop connection failed.';
  }
}

/**
 * RemoteDesktop renders a live Windows desktop in the browser using
 * guacamole-common-js. It opens a WebSocket to the backend RDP endpoint, which
 * bridges through guacd → the agent tunnel → Windows RDP (port 3389).
 *
 * Mouse and keyboard are captured on the display element and streamed to the host.
 */
export function RemoteDesktop({ agentId, token, username, password, domain, protocol = 'rdp', onStateChange, onExit }: RemoteDesktopProps) {
  const displayRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<any>(null);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let cancelled = false;
    let client: any;
    let keyboard: any;
    let onWindowResize: (() => void) | null = null;

    // Debounce the actual connect. React StrictMode (dev) mounts → unmounts →
    // remounts, which otherwise opens TWO RDP sessions in quick succession; Windows
    // is single-session, so the second kicks the first ("Disconnected by other
    // connection") and the desktop never finishes painting → black screen. Scheduling
    // the connect on a short timer that the cleanup cancels means the throwaway first
    // mount never connects — only the surviving mount opens exactly one session.
    const connectTimer = setTimeout(() => {
    (async () => {
      // Dynamic import — guacamole-common-js touches window, so keep it client-only.
      const Guacamole: any = (await import('guacamole-common-js')).default ?? (await import('guacamole-common-js'));
      if (cancelled || !displayRef.current) return;

      // Build the WS URL to the backend RDP endpoint (through the vsay-auth gateway).
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8082/api';
      const wsBase = apiUrl.replace(/^http/, 'ws');
      const rect = displayRef.current.getBoundingClientRect();
      const width = Math.max(640, Math.round(rect.width) || 1280);
      const height = Math.max(480, Math.round(rect.height) || 800);

      const params = new URLSearchParams({
        token,
        username,
        password,
        protocol,
        width: String(width),
        height: String(height),
      });
      if (domain) params.set('domain', domain);

      const wsUrl = `${wsBase}/machines/${agentId}/rdp/ws?${params.toString()}`;

      const tunnel = new Guacamole.WebSocketTunnel(wsUrl);
      client = new Guacamole.Client(tunnel);
      clientRef.current = client;

      // Mount the display canvas.
      const display = client.getDisplay();
      const displayEl = display.getElement();
      displayRef.current.innerHTML = '';
      displayRef.current.appendChild(displayEl);

      // Keep the remote desktop scaled to fit the container (letterboxed). IMPORTANT:
      // only hook Display and Client callbacks here — NOT tunnel.oninstruction /
      // tunnel.onstatechange, which the Guacamole.Client owns internally to draw the
      // screen (overriding them stops all rendering).
      const fit = () => {
        const box = displayRef.current?.getBoundingClientRect();
        const w = display.getWidth();
        const h = display.getHeight();
        if (box && box.width > 0 && box.height > 0 && w > 0 && h > 0) {
          const scale = Math.min(box.width / w, box.height / h);
          if (scale > 0) display.scale(scale);
        }
      };
      display.onresize = () => fit();
      onWindowResize = () => fit();
      window.addEventListener('resize', onWindowResize);

      let reachedConnected = false;

      client.onstatechange = (state: number) => {
        if (state === STATE_CONNECTED) {
          reachedConnected = true;
          setStatus('connected');
          onStateChange?.('connected');
        } else if (state === STATE_DISCONNECTED) {
          if (!reachedConnected) {
            // Disconnected before ever connecting → the desktop server refused us
            // (commonly a wrong password). Surface it instead of hanging on "Connecting".
            setStatus((s) => (s === 'error' ? s : 'error'));
            setErrorMsg((m) => m || 'Disconnected before the session started — check the password.');
            onStateChange?.('error');
          } else {
            // Was connected, now dropped. On a Windows client only ONE desktop session
            // can be live, so the usual cause is that someone else opened a connection
            // to this machine and took it over. Show a clear caution.
            setStatus('disconnected');
            setErrorMsg('Someone else connected to this machine, so this session was closed. Only one desktop session can be active at a time.');
            onStateChange?.('disconnected');
          }
        }
      };
      client.onerror = (err: any) => {
        setStatus('error');
        setErrorMsg(guacErrorMessage(err));
        onStateChange?.('error');
      };
      tunnel.onerror = (err: any) => {
        setStatus('error');
        setErrorMsg(guacErrorMessage(err));
        onStateChange?.('error');
      };

      client.connect('');

      // Mouse → host. Divide by the current display scale so clicks land at the right
      // spot on the remote desktop even when the view is scaled down to fit.
      const mouse = new Guacamole.Mouse(displayEl);
      mouse.onmousedown = mouse.onmouseup = mouse.onmousemove = (mouseState: any) => {
        const scale = display.getScale() || 1;
        const s = new Guacamole.Mouse.State(
          mouseState.x / scale,
          mouseState.y / scale,
          mouseState.left, mouseState.middle, mouseState.right, mouseState.up, mouseState.down,
        );
        client.sendMouseState(s);
      };

      // Keyboard → host (attached to document so it works once focused).
      keyboard = new Guacamole.Keyboard(document);
      keyboard.onkeydown = (keysym: number) => client.sendKeyEvent(1, keysym);
      keyboard.onkeyup = (keysym: number) => client.sendKeyEvent(0, keysym);
    })();
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(connectTimer);
      if (onWindowResize) window.removeEventListener('resize', onWindowResize);
      try {
        if (keyboard) {
          keyboard.onkeydown = null;
          keyboard.onkeyup = null;
        }
        client?.disconnect();
      } catch {
        /* ignore */
      }
      clientRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId, token, username, password, domain, protocol]);

  return (
    <div className="relative w-full h-full min-h-[600px] bg-black">
      {status === 'connecting' && (
        <div className="absolute inset-0 flex items-center justify-center text-white/80 z-10">
          <Loader2 className="w-6 h-6 mr-2 animate-spin" />
          Connecting to Windows desktop…
        </div>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center text-white/90 max-w-md px-6">
            <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-warning" />
            <p className="font-medium mb-1">Could not connect</p>
            <p className="text-sm text-white/60 mb-4">{errorMsg || 'Check credentials, that the agent is online, and that guacd is running.'}</p>
            {onExit && (
              <button
                onClick={onExit}
                className="px-4 py-2 rounded-md bg-white/10 hover:bg-white/20 text-sm font-medium transition-colors"
              >
                Back
              </button>
            )}
          </div>
        </div>
      )}
      {status === 'disconnected' && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/70">
          <div className="text-center text-white/90 max-w-md px-6">
            <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-warning" />
            <p className="font-medium mb-1">Session closed</p>
            <p className="text-sm text-white/60 mb-4">{errorMsg || 'This desktop session has ended.'}</p>
            {onExit && (
              <button
                onClick={onExit}
                className="px-4 py-2 rounded-md bg-white/10 hover:bg-white/20 text-sm font-medium transition-colors"
              >
                Back
              </button>
            )}
          </div>
        </div>
      )}
      <div ref={displayRef} className="absolute inset-0 overflow-hidden flex items-center justify-center" tabIndex={0} />
    </div>
  );
}
