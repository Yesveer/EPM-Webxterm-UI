'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, AlertTriangle, Eye, PhoneOff, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RemoteControlProps {
  agentId: string;
  token: string;
  /** View-only sessions render the screen but send no input. */
  viewOnly?: boolean;
  onStateChange?: (state: 'connecting' | 'connected' | 'disconnected' | 'error') => void;
  onExit?: () => void;
  /** Ends the session and releases the user's screen. */
  onEnd?: () => void;
}

// Guacamole client states (from guacamole-common-js).
const STATE_CONNECTED = 3;
const STATE_DISCONNECTED = 5;

function guacErrorMessage(status: { code?: number; message?: string } | undefined): string {
  switch (status?.code) {
    case 0x0301: // CLIENT_UNAUTHORIZED
      return 'The machine rejected the session key. Try starting the session again.';
    case 0x0202: // UPSTREAM_TIMEOUT
    case 0x0203: // UPSTREAM_ERROR
    case 0x0207: // UPSTREAM_UNAVAILABLE
    case 0x0204: // RESOURCE_NOT_FOUND
      return 'Could not reach the screen-sharing service on the machine.';
    case 0x0308: // CLIENT_TIMEOUT
      return 'The connection timed out.';
    default:
      return status?.message || 'The remote-control connection failed.';
  }
}

/**
 * RemoteControl renders the user's LIVE desktop in the browser.
 *
 * Unlike RemoteDesktop (which opens a fresh RDP session and locks the user
 * out), this attaches to the session the user is already sitting in front of:
 * they watch along, and the recording captures everything.
 *
 * The session must already be approved and active before this mounts — the
 * backend refuses the WebSocket otherwise. There are no credentials here
 * because there is nothing to log into; the machine's one-time session key
 * lives server-side and never reaches the browser.
 */
export function RemoteControl({ agentId, token, viewOnly = false, onStateChange, onExit, onEnd }: RemoteControlProps) {
  const displayRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const [errorMsg, setErrorMsg] = useState('');

  // The toolbar floats over the remote screen, so wherever it sits it covers
  // something. Letting it be dragged means it can always be moved off whatever
  // the admin needs to see, instead of forcing a fixed corner to be the least
  // bad one.
  const [toolbar, setToolbar] = useState({ x: 16, y: 16 });
  const [dragging, setDragging] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  // Distinguishes a drag from a click, so releasing a drag over the End Session
  // button does not end the session.
  const draggedRef = useRef(false);

  // Start at the top-right, matching where it used to be fixed.
  useEffect(() => {
    const el = toolbarRef.current;
    if (!el) return;
    setToolbar((t) => (t.x === 16 && t.y === 16 ? { x: Math.max(16, window.innerWidth - el.offsetWidth - 16), y: 16 } : t));
  }, [status]);

  const startDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = toolbarRef.current;
    if (!el) return;

    draggedRef.current = false;
    const startX = e.clientX;
    const startY = e.clientY;
    const originX = el.offsetLeft;
    const originY = el.offsetTop;

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      // A few pixels of slop so a slightly shaky click still counts as a click.
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        draggedRef.current = true;
        setDragging(true);
      }
      const parent = el.parentElement;
      const maxX = (parent?.clientWidth ?? window.innerWidth) - el.offsetWidth;
      const maxY = (parent?.clientHeight ?? window.innerHeight) - el.offsetHeight;
      setToolbar({
        // Clamped so the toolbar can never be dragged off-screen and stranded.
        x: Math.min(Math.max(0, originX + dx), Math.max(0, maxX)),
        y: Math.min(Math.max(0, originY + dy), Math.max(0, maxY)),
      });
    };

    const onUp = () => {
      setDragging(false);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      // Clear on the next tick so the click handler still sees it.
      setTimeout(() => {
        draggedRef.current = false;
      }, 0);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let client: { disconnect: () => void } | null = null;
    let keyboard: { onkeydown: unknown; onkeyup: unknown } | null = null;
    let onWindowResize: (() => void) | null = null;

    // React StrictMode mounts, unmounts and remounts in development. Only one
    // viewer is allowed at a time, so an eager connect on the throwaway first
    // mount would take the slot and the surviving mount would be refused.
    // Scheduling on a timer the cleanup cancels means only the real mount
    // ever connects.
    const connectTimer = setTimeout(() => {
      (async () => {
        // guacamole-common-js touches window, so it stays a client-only import.
        const mod = await import('guacamole-common-js');
        const Guacamole = (mod as { default?: unknown }).default ?? mod;
        if (cancelled || !displayRef.current) return;

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8082/api';
        const wsBase = apiUrl.replace(/^http/, 'ws');
        const rect = displayRef.current.getBoundingClientRect();
        const width = Math.max(640, Math.round(rect.width) || 1280);
        const height = Math.max(480, Math.round(rect.height) || 800);

        const params = new URLSearchParams({
          token,
          width: String(width),
          height: String(height),
        });
        const wsUrl = `${wsBase}/machines/${agentId}/remote-control/ws?${params.toString()}`;

        /* eslint-disable @typescript-eslint/no-explicit-any */
        const G = Guacamole as any;
        const tunnel = new G.WebSocketTunnel(wsUrl);
        client = new G.Client(tunnel);
        const c = client as any;

        const display = c.getDisplay();
        const displayEl = display.getElement();
        displayRef.current.innerHTML = '';
        displayRef.current.appendChild(displayEl);

        // Scale to fit, letterboxed. Only Display and Client callbacks are
        // hooked here — the Client owns the tunnel's own callbacks internally
        // and overriding them stops all rendering.
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

        c.onstatechange = (state: number) => {
          if (state === STATE_CONNECTED) {
            reachedConnected = true;
            setStatus('connected');
            onStateChange?.('connected');
          } else if (state === STATE_DISCONNECTED) {
            if (!reachedConnected) {
              setStatus('error');
              setErrorMsg((m) => m || 'Disconnected before the session started.');
              onStateChange?.('error');
            } else {
              // The usual cause is the user ending the session from their
              // side, which they are entitled to do at any moment.
              setStatus('disconnected');
              setErrorMsg('The session ended. The user can close it from their machine at any time.');
              onStateChange?.('disconnected');
            }
          }
        };
        c.onerror = (err: { code?: number; message?: string }) => {
          setStatus('error');
          setErrorMsg(guacErrorMessage(err));
          onStateChange?.('error');
        };
        tunnel.onerror = (err: { code?: number; message?: string }) => {
          setStatus('error');
          setErrorMsg(guacErrorMessage(err));
          onStateChange?.('error');
        };

        c.connect('');

        // In a view-only session nothing is wired up at all. Hiding the
        // controls would not be enough — not attaching the listeners is what
        // makes "view only" true rather than cosmetic.
        if (!viewOnly) {
          const mouse = new G.Mouse(displayEl);
          const sendMouse = (mouseState: any) => {
            // Divide by the current scale so clicks land where they look like
            // they land when the view is shrunk to fit.
            const scale = display.getScale() || 1;
            c.sendMouseState(
              new G.Mouse.State(
                mouseState.x / scale,
                mouseState.y / scale,
                mouseState.left,
                mouseState.middle,
                mouseState.right,
                mouseState.up,
                mouseState.down,
              ),
            );
          };
          mouse.onmousedown = sendMouse;
          mouse.onmouseup = sendMouse;
          mouse.onmousemove = sendMouse;

          keyboard = new G.Keyboard(document);
          const kb = keyboard as any;
          kb.onkeydown = (keysym: number) => c.sendKeyEvent(1, keysym);
          kb.onkeyup = (keysym: number) => c.sendKeyEvent(0, keysym);
        }
        /* eslint-enable @typescript-eslint/no-explicit-any */
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
        /* the socket may already be gone */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId, token, viewOnly]);

  return (
    <div className="relative w-full h-full min-h-[600px] bg-black">
      {status === 'connecting' && (
        <div className="absolute inset-0 z-10 flex items-center justify-center text-white/80">
          <Loader2 className="mr-2 h-6 w-6 animate-spin" />
          Connecting to the live session…
        </div>
      )}

      {status === 'connected' && (
        <div
          ref={toolbarRef}
          onPointerDown={startDrag}
          style={{ left: toolbar.x, top: toolbar.y }}
          className={cn(
            'absolute z-20 flex select-none items-center gap-2',
            dragging ? 'cursor-grabbing' : 'cursor-grab',
          )}
        >
          <div
            title="Drag to move"
            className="flex items-center rounded-full bg-black/60 px-1.5 py-1.5 text-white/60 backdrop-blur"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </div>

          {viewOnly && (
            <div className="flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur">
              <Eye className="h-3.5 w-3.5" />
              View only
            </div>
          )}

          {onEnd && (
            <button
              // A drag that ends on the button must not also trigger it.
              onClick={() => {
                if (!draggedRef.current) onEnd();
              }}
              title="End the session and release the user's screen"
              className="flex items-center gap-2 rounded-full bg-destructive/90 px-3.5 py-1.5 text-xs font-medium text-white shadow-lg backdrop-blur transition-colors hover:bg-destructive"
            >
              <PhoneOff className="h-3.5 w-3.5" />
              End Session
            </button>
          )}
        </div>
      )}

      {(status === 'error' || status === 'disconnected') && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70">
          <div className="max-w-md px-6 text-center text-white/90">
            <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-warning" />
            <p className="mb-1 font-medium">
              {status === 'error' ? 'Could not connect' : 'Session ended'}
            </p>
            <p className="mb-4 text-sm text-white/60">{errorMsg}</p>
            {onExit && (
              <button
                onClick={onExit}
                className="rounded-md bg-white/10 px-4 py-2 text-sm font-medium transition-colors hover:bg-white/20"
              >
                Back
              </button>
            )}
          </div>
        </div>
      )}

      <div
        ref={displayRef}
        className="absolute inset-0 flex items-center justify-center overflow-hidden"
        tabIndex={0}
      />
    </div>
  );
}
