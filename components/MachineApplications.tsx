'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Search, Package, AlertCircle, User, Monitor } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  applicationsAPI,
  InstalledApp,
  InventoryScan,
} from '@/lib/applications-api';

interface Props {
  token: string | null;
  agentId: string | undefined;
}

/** Software installed on one machine, as last reported by its agent.
 *
 *  Kept out of the machine details page because that file is already ~2,700
 *  lines; it loads lazily when its tab is opened. */
export default function MachineApplications({ token, agentId }: Props) {
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [total, setTotal] = useState(0);
  const [scan, setScan] = useState<InventoryScan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [includeRemoved, setIncludeRemoved] = useState(false);

  const load = useCallback(async () => {
    if (!token || !agentId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await applicationsAPI.forMachine(token, agentId, {
        search: search.trim(),
        includeRemoved,
        limit: 500,
      });
      setApps(res.applications ?? []);
      setTotal(res.total ?? 0);
      setScan(res.last_scan ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  }, [token, agentId, search, includeRemoved]);

  // Debounced so typing in the search box does not fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  if (loading && apps.length === 0) {
    return (
      <div className="flex items-center gap-2 py-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading applications…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  // A machine that has never reported and a machine with no software look
  // identical in a list. Saying which is which is the whole reason the last
  // scan is fetched alongside the applications.
  if (!scan) {
    return (
      <div className="rounded-lg border border-border/60 bg-muted/30 p-6 text-center">
        <Package className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <p className="font-medium">This machine has not reported its software yet.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Agents scan on connect and then every 12 hours. A machine that has just been
          enrolled, or one running an older agent, will not appear here yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name or publisher…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <Switch id="include-removed" checked={includeRemoved} onCheckedChange={setIncludeRemoved} />
          <Label htmlFor="include-removed" className="text-sm font-normal text-muted-foreground">
            Show uninstalled
          </Label>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>
          <span className="font-medium text-foreground">{total}</span> application
          {total === 1 ? '' : 's'}
        </span>
        <span>Last scanned {formatWhen(scan.finished_at ?? scan.started_at)}</span>
        {scan.collect_error && (
          // A scan that errored has holes in it. Nothing was marked removed on
          // its strength, and the reader should know the list may be short.
          <span className="text-amber-500">
            Last scan reported an error — this list may be incomplete
          </span>
        )}
      </div>

      {apps.length === 0 ? (
        <div className="rounded-lg border border-border/60 bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          {search ? `Nothing matching “${search}”.` : 'No applications reported.'}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border/60">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Application</th>
                <th className="px-4 py-2.5 font-medium">Version</th>
                <th className="px-4 py-2.5 font-medium">Publisher</th>
                <th className="px-4 py-2.5 font-medium">Installed for</th>
              </tr>
            </thead>
            <tbody>
              {apps.map(app => (
                <tr
                  key={app.id}
                  className={cn('border-t border-border/40', !app.present && 'opacity-50')}
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{app.name}</span>
                      {!app.present && (
                        <Badge variant="outline" className="text-[10px]">
                          uninstalled
                        </Badge>
                      )}
                    </div>
                    {app.exe_path && (
                      <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                        {app.exe_path}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{app.version || '—'}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{app.publisher || '—'}</td>
                  <td className="px-4 py-2.5">
                    {app.scope === 'user' ? (
                      // Worth calling out: this is software installed without
                      // admin rights, which is exactly what least-privilege
                      // policy is aimed at.
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <User className="h-3.5 w-3.5 text-amber-500" />
                        {app.os_user || 'one user'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Monitor className="h-3.5 w-3.5" />
                        All users
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function formatWhen(iso: string): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return 'at an unknown time';

  const minutes = Math.floor((Date.now() - then.getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
