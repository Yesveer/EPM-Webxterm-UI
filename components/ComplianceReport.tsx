'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Printer, Info, RefreshCw } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TabHeader } from '@/components/TabHeader';
import { FilterField } from '@/components/FilterBar';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { auditEventsAPI, ComplianceReport as Report, labelFor } from '@/lib/audit-events-api';

/** A summary over a window, meant to be printed or saved as PDF.
 *
 *  PDF comes from the browser's own print dialog rather than a server-side
 *  renderer: it produces a real, selectable-text PDF, it picks up the reader's
 *  paper size, and it avoids carrying a PDF layout engine for one screen. */
export default function ComplianceReportView() {
  const { token } = useAuth();
  const { toast } = useToast();

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(defaultFrom());
  const [to, setTo] = useState(today());

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      setReport(await auditEventsAPI.report(token, from, to));
    } catch (err) {
      toast({
        title: 'Could not build the report',
        description: err instanceof Error ? err.message : 'Error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [token, from, to, toast]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !report) {
    return (
      <div className="flex items-center gap-2 py-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Building the report…
      </div>
    );
  }
  if (!report) return null;

  const coverage = report.inventory_coverage;
  const uncovered = coverage.machines_total - coverage.machines_reported;

  return (
    <div className="space-y-6">
      {/* Controls are hidden when printing — they are not part of the document. */}
      <div className="space-y-4 print:hidden">
        <TabHeader
          description="A summary of what was recorded over a period, and what this product does not yet record."
          action={
            <>
              <Button variant="outline" onClick={load} disabled={loading} className="gap-2">
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Refresh
              </Button>
              <Button onClick={() => window.print()} className="gap-2">
                <Printer className="h-4 w-4" />
                Print / Save as PDF
              </Button>
            </>
          }
        />

        <div className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <FilterField label="From">
            <Input type="date" value={from} onChange={e => setFrom(e.target.value)} />
          </FilterField>
          <FilterField label="To">
            <Input type="date" value={to} onChange={e => setTo(e.target.value)} />
          </FilterField>
        </div>
      </div>

      <Card className="glass-card print:border-none print:shadow-none">
        <CardHeader>
          <CardTitle>Compliance report</CardTitle>
          <CardDescription>
            {new Date(report.from).toLocaleDateString()} – {new Date(report.to).toLocaleDateString()}
            {' · '}
            {report.total} recorded event{report.total === 1 ? '' : 's'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Remote access</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="Sessions started" value={report.remote_access.sessions_started} />
              <Stat label="Sessions ended" value={report.remote_access.sessions_ended} />
              <Stat
                label="Refused by policy"
                value={report.remote_access.refused}
                tone={report.remote_access.refused > 0 ? 'notable' : undefined}
              />
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Application control</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat
                label="Policy violations detected"
                value={report.application_control.policy_violations_detected}
                tone={
                  report.application_control.policy_violations_detected > 0 ? 'notable' : undefined
                }
              />
              <Stat label="Blocked from running" value={report.application_control.blocked} />
              <Stat label="Elevated" value={report.application_control.elevated} />
            </div>
            <p className="text-xs text-muted-foreground">
              A violation is software matching a block or elevate rule, found installed on a
              machine. Nothing was prevented from running — see the final section.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Controls in place</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="Application policies" value={report.policies.application} />
              <Stat label="Remote access policies" value={report.policies.remote_access} />
              <Stat label="Policy changes in period" value={report.policy_changes} />
            </div>
            {!report.policies.enforcement_on && (
              <p className="text-xs text-amber-500">
                Application control is authored and projected, but not enforced on endpoints during
                this period.
              </p>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Fleet coverage</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="Machines" value={coverage.machines_total} />
              <Stat label="Reported software" value={coverage.machines_reported} />
              <Stat
                label="Never reported"
                value={uncovered > 0 ? uncovered : 0}
                tone={uncovered > 0 ? 'notable' : undefined}
              />
            </div>
            {(uncovered > 0 || coverage.machines_stale > 0) && (
              // Figures drawn from a partial fleet are not figures about the
              // fleet, and a reader has to be told which they are looking at.
              <p className="text-xs text-muted-foreground">
                {uncovered > 0 && `${uncovered} machine(s) have never reported their software. `}
                {coverage.machines_stale > 0 &&
                  `${coverage.machines_stale} last reported more than a day ago. `}
                Figures above cover only the machines that have reported.
              </p>
            )}
          </section>

          {(report.by_action?.length ?? 0) > 0 && (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Events by type</h3>
              <table className="w-full text-sm">
                <tbody>
                  {report.by_action!.map(row => (
                    <tr key={row.action} className="border-t border-border/40">
                      <td className="py-1.5">{labelFor(row.action)}</td>
                      <td className="py-1.5 text-right font-medium">{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {(report.by_actor?.length ?? 0) > 0 && (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Most active people</h3>
              <table className="w-full text-sm">
                <tbody>
                  {report.by_actor!.map(row => (
                    <tr key={row.actor} className="border-t border-border/40">
                      <td className="py-1.5">{row.actor || 'system'}</td>
                      <td className="py-1.5 text-right font-medium">{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {/* The most important section. An empty "applications blocked: 0" is
              indistinguishable from "nothing was blocked" unless the report
              says the control does not exist. */}
          <section className="space-y-2 rounded-lg border border-border/60 bg-muted/30 p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Info className="h-4 w-4" />
              What this report does not cover
            </h3>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              {report.not_yet_recorded.map((gap, i) => (
                <li key={i}>• {gap}</li>
              ))}
            </ul>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: 'notable';
}) {
  return (
    <div className="rounded-lg border border-border/60 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-0.5 text-2xl font-semibold ${tone === 'notable' ? 'text-amber-400' : ''}`}>
        {value}
      </p>
    </div>
  );
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function defaultFrom(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}
