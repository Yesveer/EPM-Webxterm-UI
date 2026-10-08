'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Search, Package, AlertTriangle, ChevronRight, X } from 'lucide-react';

import { Breadcrumb } from '@/components/ui/page-breadcrumb';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import {
  applicationsAPI,
  CatalogEntry,
  InstalledApp,
  InventoryCoverage,
} from '@/lib/applications-api';

/** The fleet-wide view of what software is installed, which is what
 *  application-control policy gets written against. */
export default function ApplicationsPage() {
  const { token } = useAuth();
  const { toast } = useToast();

  const [entries, setEntries] = useState<CatalogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [coverage, setCoverage] = useState<InventoryCoverage | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [selected, setSelected] = useState<CatalogEntry | null>(null);
  const [installs, setInstalls] = useState<InstalledApp[]>([]);
  const [installsLoading, setInstallsLoading] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await applicationsAPI.catalog(token, { search: search.trim(), limit: 200 });
      setEntries(res.applications ?? []);
      setTotal(res.total ?? 0);
      setCoverage(res.coverage ?? null);
    } catch (err) {
      toast({
        title: 'Could not load applications',
        description: err instanceof Error ? err.message : 'Error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [token, search, toast]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const openEntry = useCallback(
    async (entry: CatalogEntry) => {
      setSelected(entry);
      if (!token) return;
      setInstallsLoading(true);
      try {
        const res = await applicationsAPI.machinesWith(token, entry.name, entry.publisher, {
          limit: 200,
        });
        setInstalls(res.installs ?? []);
      } catch {
        setInstalls([]);
      } finally {
        setInstallsLoading(false);
      }
    },
    [token],
  );

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Applications' }]} />

      <div>
        <h1 className="text-2xl font-semibold">Applications</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every application installed across your machines. This is what application-control
          policy is written against.
        </p>
      </div>

      {coverage && <CoverageNotice coverage={coverage} />}

      <Card className="glass-card">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Fleet catalogue
              </CardTitle>
              <CardDescription className="mt-1">
                {total} distinct application{total === 1 ? '' : 's'}
              </CardDescription>
            </div>
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search name or publisher…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading && entries.length === 0 ? (
            <div className="flex items-center gap-2 py-8 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : entries.length === 0 ? (
            <EmptyCatalogue search={search} coverage={coverage} />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border/60">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Application</th>
                    <th className="px-4 py-2.5 font-medium">Publisher</th>
                    <th className="px-4 py-2.5 font-medium">Machines</th>
                    <th className="px-4 py-2.5 font-medium">Versions</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {entries.map(entry => (
                    <tr
                      key={`${entry.name}|${entry.publisher}`}
                      onClick={() => openEntry(entry)}
                      className="cursor-pointer border-t border-border/40 transition-colors hover:bg-muted/40"
                    >
                      <td className="px-4 py-2.5 font-medium">{entry.name}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {entry.publisher || '—'}
                      </td>
                      <td className="px-4 py-2.5">{entry.machine_count}</td>
                      <td className="px-4 py-2.5">
                        {/* Several versions of one product across the fleet is
                            the thing that makes hash-based rules brittle, so it
                            is surfaced rather than hidden behind a click. */}
                        {entry.version_count > 1 ? (
                          <Badge variant="outline" className="text-[10px]">
                            {entry.version_count} versions
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">
                            {entry.versions[0] || '—'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        <ChevronRight className="h-4 w-4" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {selected && (
        <AppDetail
          entry={selected}
          installs={installs}
          loading={installsLoading}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

/** Says how much of the fleet these numbers actually cover.
 *
 *  Without it the catalogue reads as the whole estate, when it may be two
 *  thirds of it — and every policy decision taken from it inherits that error. */
function CoverageNotice({ coverage }: { coverage: InventoryCoverage }) {
  const missing = coverage.machines_total - coverage.machines_reported;
  if (missing <= 0 && coverage.machines_stale === 0) return null;

  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
      <div className="text-sm">
        <p className="font-medium">This list does not cover your whole fleet.</p>
        <p className="mt-1 text-muted-foreground">
          {coverage.machines_reported} of {coverage.machines_total} machines have reported
          their software
          {missing > 0 && `; ${missing} never have`}
          {coverage.machines_stale > 0 &&
            `; ${coverage.machines_stale} last reported more than a day ago`}
          . Machines that are offline, newly enrolled, or running an older agent will be missing.
        </p>
      </div>
    </div>
  );
}

function EmptyCatalogue({
  search,
  coverage,
}: {
  search: string;
  coverage: InventoryCoverage | null;
}) {
  if (search) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        Nothing matching “{search}”.
      </div>
    );
  }
  return (
    <div className="py-10 text-center">
      <Package className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
      <p className="font-medium">No applications reported yet.</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        {coverage && coverage.machines_total === 0
          ? 'Enrol a machine first — its agent reports installed software on connect.'
          : 'Agents report installed software when they connect and then every 12 hours. Machines running an older agent will not report at all until they are updated.'}
      </p>
    </div>
  );
}

function AppDetail({
  entry,
  installs,
  loading,
  onClose,
}: {
  entry: CatalogEntry;
  installs: InstalledApp[];
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>{entry.name}</CardTitle>
            <CardDescription className="mt-1">
              {entry.publisher || 'Unknown publisher'} · on {entry.machine_count} machine
              {entry.machine_count === 1 ? '' : 's'}
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {entry.versions.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Versions:</span>
            {entry.versions.map(v => (
              <Badge key={v} variant="outline" className="text-[10px]">
                {v || 'unknown'}
              </Badge>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading machines…
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border/60">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Machine</th>
                  <th className="px-4 py-2.5 font-medium">Version</th>
                  <th className="px-4 py-2.5 font-medium">Installed for</th>
                </tr>
              </thead>
              <tbody>
                {installs.map(install => (
                  <tr key={install.id} className="border-t border-border/40">
                    <td className="px-4 py-2.5 font-medium">{install.machine_name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {install.version || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {install.scope === 'user' ? install.os_user || 'one user' : 'All users'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
