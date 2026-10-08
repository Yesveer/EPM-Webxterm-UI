'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Search, Download, AlertCircle, ShieldOff } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { TabHeader } from '@/components/TabHeader';
import { FilterField, SelectInput } from '@/components/FilterBar';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import {
  auditEventsAPI,
  AuditEvent,
  AuditFilters,
  labelFor,
} from '@/lib/audit-events-api';

const PAGE_SIZE = 50;

/** Everything recorded on the endpoint side: remote sessions, policy changes,
 *  inventory reports. */
export default function EndpointAuditEvents() {
  const { token } = useAuth();
  const { toast } = useToast();

  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [knownActions, setKnownActions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [page, setPage] = useState(0);

  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const filters = useCallback(
    (): AuditFilters => ({
      search: search.trim() || undefined,
      actions: action ? [action] : undefined,
      from: from || undefined,
      to: to || undefined,
    }),
    [search, action, from, to],
  );

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await auditEventsAPI.list(token, {
        ...filters(),
        limit: PAGE_SIZE,
        skip: page * PAGE_SIZE,
      });
      setEvents(res.events ?? []);
      setTotal(res.total ?? 0);
      if (res.known_actions?.length) setKnownActions(res.known_actions);
    } catch (err) {
      toast({
        title: 'Could not load events',
        description: err instanceof Error ? err.message : 'Error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [token, filters, page, toast]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  // Any filter change puts the reader back on the first page; leaving them on
  // page 7 of a narrower result set shows an empty table for no clear reason.
  useEffect(() => {
    setPage(0);
  }, [search, action, from, to]);

  const download = async () => {
    if (!token) return;
    setDownloading(true);
    try {
      // The export deliberately ignores paging and takes the whole filtered
      // range — a one-page CSV would be useless as an audit response.
      await auditEventsAPI.downloadCSV(token, filters());
      toast({ title: 'Export downloaded' });
    } catch (err) {
      toast({
        title: 'Export failed',
        description: err instanceof Error ? err.message : 'Error',
        variant: 'destructive',
      });
    } finally {
      setDownloading(false);
    }
  };

  const pages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      <TabHeader
        description="Remote sessions, policy changes and inventory reports from across your fleet."
        action={
          <Button variant="outline" onClick={download} disabled={downloading} className="gap-2">
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export CSV
          </Button>
        }
      />

      {/* Every field is labelled and every control is h-10, so the row shares
          one baseline. Mixing labelled and unlabelled controls in a grid is
          what had the search box and the dropdown sitting above the dates. */}
      <div className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <FilterField label="Search" className="lg:col-span-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Actor, machine or action…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </FilterField>

        <FilterField label="Event">
          <SelectInput value={action} onChange={setAction}>
            <option value="">All events</option>
            {knownActions.map(a => (
              <option key={a} value={a}>
                {labelFor(a)}
              </option>
            ))}
          </SelectInput>
        </FilterField>

        <FilterField label="From">
          <Input type="date" value={from} onChange={e => setFrom(e.target.value)} />
        </FilterField>

        <FilterField label="To">
          <Input type="date" value={to} onChange={e => setTo(e.target.value)} />
        </FilterField>
      </div>

      <p className="text-sm text-muted-foreground">
        {total} event{total === 1 ? '' : 's'}
      </p>

      {loading && events.length === 0 ? (
        <div className="flex items-center gap-2 py-8 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      ) : events.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="py-10 text-center">
            <ShieldOff className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="font-medium">No events recorded for this filter.</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              Remote sessions, policy changes and inventory reports appear here. Application
              block and elevation events will appear once enforcement is switched on.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border/60">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">When</th>
                  <th className="px-4 py-2.5 font-medium">Event</th>
                  <th className="px-4 py-2.5 font-medium">Who</th>
                  <th className="px-4 py-2.5 font-medium">Machine</th>
                  <th className="px-4 py-2.5 font-medium">Detail</th>
                </tr>
              </thead>
              <tbody>
                {events.map(e => (
                  <tr key={e.id} className="border-t border-border/40 align-top">
                    <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground">
                      {new Date(e.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{labelFor(e.action)}</span>
                        {e.status === 'denied' && (
                          // The refusals are the point of this log — they are
                          // the evidence a control did something.
                          <Badge
                            variant="outline"
                            className="border-red-500/30 bg-red-500/15 text-[10px] text-red-400"
                          >
                            denied
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      {e.actor_name || '—'}
                      {e.actor_role && (
                        <span className="ml-1.5 text-xs text-muted-foreground">{e.actor_role}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{e.machine_name || '—'}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {formatDetails(e.details)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page + 1} of {pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pages - 1}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Portal sign-ins and user management are recorded separately, under Portal Actions.
      </p>
    </div>
  );
}

function formatDetails(details?: Record<string, unknown>): string {
  if (!details) return '—';
  const entries = Object.entries(details).filter(([, v]) => v !== '' && v !== null);
  if (entries.length === 0) return '—';
  return entries
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}: ${v}`)
    .join(' · ');
}
