'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useTheme } from 'next-themes';
import dynamic from 'next/dynamic';
import { Plus, X, Terminal } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/contexts/BrandingContext';
import { machinesAPI, Machine } from '@/lib/machines-api';
import { TerminalWebSocket } from '@/lib/terminal-websocket';
import { cn } from '@/lib/utils';

const XTerminal = dynamic(
  () => import('@/components/XTerminal').then(mod => ({ default: mod.XTerminal })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Loading terminal...
      </div>
    ),
  }
);

// ── Canvas favicon with machine initials ─────────────────────────────────────
function setTabMeta(machineName: string) {
  // Title
  document.title = `${machineName} — Terminal`;

  // Build initials: "prod-server-01" → "PS", "myserver" → "MY"
  const parts = machineName.split(/[-_\s]+/).filter(Boolean);
  const initials =
    parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : machineName.slice(0, 2).toUpperCase();

  const size = 32;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Dark rounded-rect background
  const r = 6;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(size - r, 0);
  ctx.arcTo(size, 0, size, r, r);
  ctx.lineTo(size, size - r);
  ctx.arcTo(size, size, size - r, size, r);
  ctx.lineTo(r, size);
  ctx.arcTo(0, size, 0, size - r, r);
  ctx.lineTo(0, r);
  ctx.arcTo(0, 0, r, 0, r);
  ctx.closePath();
  ctx.fillStyle = '#0d1117';
  ctx.fill();

  // Initials text
  ctx.fillStyle = '#58a6ff';
  ctx.font = `bold ${initials.length === 1 ? 18 : 14}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initials, size / 2, size / 2);

  // Apply to <link rel="icon">
  let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = canvas.toDataURL('image/png');
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function StandaloneTerminal() {
  const params    = useParams();
  const machineId = params.id as string;
  const { token } = useAuth();
  const { branding } = useBranding();
  const { theme } = useTheme();

  const [machine, setMachine] = useState<Machine | null>(null);
  const [terminalSessions, setTerminalSessions] = useState<
    { id: string; name: string; connected: boolean; websocket: TerminalWebSocket | null }[]
  >([]);
  const terminalSessionsRef = useRef(terminalSessions);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Keep ref in sync
  useEffect(() => {
    terminalSessionsRef.current = terminalSessions;
  }, [terminalSessions]);

  // Load machine
  useEffect(() => {
    if (!token || !machineId) return;
    machinesAPI.getMachineById(token, machineId).then(setMachine).catch(console.error);
  }, [token, machineId]);

  // Set title + favicon once machine name is known
  useEffect(() => {
    if (machine?.name) setTabMeta(machine.name);
  }, [machine?.name]);

  // Open first session once machine is loaded
  useEffect(() => {
    if (machine && token && terminalSessionsRef.current.length === 0) {
      createNewSession(machine);
    }
  }, [machine, token]);

  // Disconnect all on unmount
  useEffect(() => {
    return () => {
      terminalSessionsRef.current.forEach(s => s.websocket?.disconnect());
    };
  }, []);

  const updateSessionConnection = (sessionId: string, connected: boolean) => {
    setTerminalSessions(prev =>
      prev.map(s => (s.id === sessionId ? { ...s, connected } : s))
    );
  };

  const writeToTerminal = (sessionId: string, data: string) => {
    const xtermInstance = (window as any)[`xterm_${sessionId}`];
    if (xtermInstance?.write) xtermInstance.write(data);
  };

  const createNewSession = (currentMachine?: Machine | null) => {
    const m = currentMachine ?? machine;
    if (!token || !m?.agent_id) return;

    const sessionId   = `session-${Date.now()}`;
    const sessionName = `Terminal ${terminalSessionsRef.current.length + 1}`;
    const ws          = new TerminalWebSocket(m.agent_id, token, undefined, branding.terminal_idle_timeout_minutes);

    ws.onConnect    = () => {
      updateSessionConnection(sessionId, true);
      writeToTerminal(sessionId, `Connected to ${m.name}\r\n`);
    };
    ws.onDisconnect = () => {
      updateSessionConnection(sessionId, false);
      writeToTerminal(sessionId, '\r\nDisconnected from terminal\r\n');
    };
    ws.onIdleTimeout = () => {
      const minutes = ws.getIdleTimeoutMinutes();
      writeToTerminal(
        sessionId,
        `\r\n[Session timed out after ${minutes} minute${minutes === 1 ? '' : 's'} of inactivity — click '+' to start a new session]\r\n`,
      );
    };
    ws.onSessionRenewed = () => {
      writeToTerminal(sessionId, '\r\n[Previous session expired — starting a new session]\r\n');
    };
    ws.onMessage    = (msg) => {
      if (msg.type === 'output' && msg.output)        writeToTerminal(sessionId, msg.output);
      else if (msg.type === 'error' && msg.error)     writeToTerminal(sessionId, `\r\n[ERROR] ${msg.error}\r\n`);
    };
    ws.onError      = (err) => writeToTerminal(sessionId, `\r\n[ERROR] ${err}\r\n`);
    ws.connect();

    const newSession = { id: sessionId, name: sessionName, connected: false, websocket: ws };
    setTerminalSessions(prev => [...prev, newSession]);
    setActiveSessionId(sessionId);

    setTimeout(() => {
      const xterm = (window as any)[`xterm_${sessionId}`];
      if (xterm?.fit) xterm.fit();
    }, 100);
  };

  const closeSession = (sessionId: string) => {
    const session = terminalSessionsRef.current.find(s => s.id === sessionId);
    session?.websocket?.disconnect();

    const updated = terminalSessionsRef.current.filter(s => s.id !== sessionId);
    setTerminalSessions(updated);

    if (activeSessionId === sessionId) {
      setActiveSessionId(updated.length > 0 ? updated[updated.length - 1].id : null);
    }
  };

  const handleTerminalData = (sessionId: string, data: string) => {
    const session = terminalSessionsRef.current.find(s => s.id === sessionId);
    session?.websocket?.sendInput(data);
  };

  const termTheme = theme === 'dark' || theme === 'system' ? 'dark' : 'light';

  return (
    <div className="h-screen w-screen flex flex-col terminal-bg overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-destructive" />
          <div className="w-3 h-3 rounded-full bg-warning" />
          <div className="w-3 h-3 rounded-full bg-success" />
          <span className="ml-2 text-muted-foreground text-xs font-mono">
            {machine ? `${machine.name} — ${machine.ip_address ?? 'terminal'}` : 'Loading…'}
          </span>
        </div>
        <button
          onClick={() => window.close()}
          className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-background/40"
          title="Close tab"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Session tabs ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 px-2 py-2 border-b border-border/20 overflow-x-auto shrink-0">
        {terminalSessions.map(session => (
          <div
            key={session.id}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer transition-all group min-w-fit',
              activeSessionId === session.id
                ? 'bg-background/80 text-foreground'
                : 'hover:bg-background/40 text-muted-foreground'
            )}
            onClick={() => {
              setActiveSessionId(session.id);
              setTimeout(() => {
                const xterm = (window as any)[`xterm_${session.id}`];
                if (xterm?.fit) xterm.fit();
              }, 50);
            }}
          >
            <div className={cn('w-2 h-2 rounded-full', session.connected ? 'bg-success' : 'bg-destructive')} />
            <span className="text-sm font-medium">{session.name}</span>
            <button
              onClick={e => { e.stopPropagation(); closeSession(session.id); }}
              className="opacity-0 group-hover:opacity-100 transition-opacity ml-1"
            >
              <X className="w-3.5 h-3.5 hover:text-destructive" />
            </button>
          </div>
        ))}

        <button
          onClick={() => createNewSession()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-background/40 transition-colors text-muted-foreground hover:text-foreground min-w-fit"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm">New</span>
        </button>
      </div>

      {/* ── Terminal area ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden relative">
        {terminalSessions.map(session => (
          <div
            key={session.id}
            className={cn('absolute inset-0', session.id === activeSessionId ? 'block' : 'hidden')}
          >
            <XTerminal
              sessionId={session.id}
              onData={data => handleTerminalData(session.id, data)}
              onConnect={() => {}}
              theme={termTheme}
            />
          </div>
        ))}

        {terminalSessions.length === 0 && (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <Terminal className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No active session</p>
              <button
                onClick={() => createNewSession()}
                className="mt-4 text-xs text-primary hover:underline"
              >
                Start a session
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
