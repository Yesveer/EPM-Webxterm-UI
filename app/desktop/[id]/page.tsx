'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthContext';

// Client-only (guacamole-common-js touches window).
const RemoteDesktop = dynamic(
  () => import('@/components/RemoteDesktop').then((m) => ({ default: m.RemoteDesktop })),
  { ssr: false },
);

interface RdpSession {
  agentId: string;
  username: string;
  password: string;
  domain?: string;
  protocol?: 'rdp' | 'vnc';
  name?: string;
}

/**
 * Full-screen remote desktop, opened in its own tab from the machine page. The
 * connection details are handed over via localStorage (same-origin) so the password
 * never travels in the URL. This route lives outside the (dashboard) group, so there's
 * no sidebar/chrome — just the desktop filling the viewport.
 */
export default function FullscreenDesktopPage() {
  const params = useParams();
  const machineId = (params?.id as string) || '';
  const { token } = useAuth();
  const [cfg, setCfg] = useState<RdpSession | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`vsay-rdp-${machineId}`);
      if (raw) setCfg(JSON.parse(raw));
      else setMissing(true);
    } catch {
      setMissing(true);
    }
  }, [machineId]);

  useEffect(() => {
    if (cfg?.name) document.title = `${cfg.name} — Desktop`;
  }, [cfg]);

  if (missing) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black text-white/80 text-center px-6">
        Session details not found. Open the desktop from the machine page and click “Full screen” again.
      </div>
    );
  }
  if (!cfg || !token) {
    return <div className="fixed inset-0 flex items-center justify-center bg-black text-white/80">Loading…</div>;
  }

  return (
    <div className="fixed inset-0 bg-black">
      <RemoteDesktop
        agentId={cfg.agentId}
        token={token}
        username={cfg.username}
        password={cfg.password}
        domain={cfg.domain}
        protocol={cfg.protocol}
        onExit={() => window.close()}
      />
    </div>
  );
}
