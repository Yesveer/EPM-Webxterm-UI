'use client';

import { X, AlertTriangle, Info } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SimulationResponse } from '@/lib/policies-api';

/** What a policy would do, if it were enforced.
 *
 *  Deliberately labelled a projection rather than a result: it is computed
 *  from what is INSTALLED, not from what people run, and a number labelled
 *  "simulation" gets read as a guarantee. */
export default function PolicySimulation({
  result,
  onClose,
}: {
  result: SimulationResponse;
  onClose: () => void;
}) {
  const { simulation, coverage } = result;
  const blocked = simulation.by_action?.block;
  const elevated = simulation.by_action?.elevate;
  const topApps = simulation.top_apps ?? [];
  const machines = simulation.machines ?? [];
  const conflicts = simulation.conflicts ?? [];

  const uncovered = coverage.machines_total - coverage.machines_reported;

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Projected impact</CardTitle>
            <CardDescription className="mt-1">
              What this policy would do if enforcement were switched on. Nothing has been sent to
              any machine.
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-4">
          <Stat label="Machines evaluated" value={simulation.summary.machines_evaluated} />
          <Stat label="Machines affected" value={simulation.summary.machines_affected} />
          <Stat
            label="Would be blocked"
            value={blocked?.installs ?? 0}
            detail={blocked ? `${blocked.apps} app(s) on ${blocked.machines} machine(s)` : undefined}
            tone="danger"
          />
          <Stat
            label="Would be elevated"
            value={elevated?.installs ?? 0}
            detail={
              elevated ? `${elevated.apps} app(s) on ${elevated.machines} machine(s)` : undefined
            }
            tone="warning"
          />
        </div>

        {/* The headline numbers mean something different when a third of the
            fleet has never reported, so coverage sits next to them. */}
        {(uncovered > 0 || coverage.machines_stale > 0) && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            <div>
              <p className="font-medium">These numbers do not cover your whole fleet.</p>
              <p className="mt-1 text-muted-foreground">
                {coverage.machines_reported} of {coverage.machines_total} machines have reported
                their software
                {uncovered > 0 && `; ${uncovered} never have, and are not counted above`}
                {coverage.machines_stale > 0 &&
                  `; ${coverage.machines_stale} last reported more than a day ago`}
                .
              </p>
            </div>
          </div>
        )}

        {conflicts.length > 0 && (
          <div className="space-y-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
            <p className="text-sm font-medium">
              {conflicts.length} policy conflict{conflicts.length === 1 ? '' : 's'}
            </p>
            {conflicts.map((c, i) => (
              <p key={i} className="text-xs text-muted-foreground">
                {c.explanation}
              </p>
            ))}
          </div>
        )}

        {topApps.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Applications this would act on</p>
            <div className="overflow-x-auto rounded-lg border border-border/60">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Application</th>
                    <th className="px-4 py-2.5 font-medium">Action</th>
                    <th className="px-4 py-2.5 font-medium">Machines</th>
                    <th className="px-4 py-2.5 font-medium">Because of</th>
                  </tr>
                </thead>
                <tbody>
                  {topApps.map(app => (
                    <tr key={`${app.name}|${app.publisher}`} className="border-t border-border/40">
                      <td className="px-4 py-2.5">
                        <span className="font-medium">{app.name}</span>
                        {app.publisher && (
                          <span className="ml-2 text-xs text-muted-foreground">{app.publisher}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant="outline" className="text-[10px]">
                          {app.action}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5">{app.machine_count}</td>
                      {/* Saying which rule caused it is what turns a number
                          into something an operator can act on. */}
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {app.rule_name}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {machines.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Most affected machines</p>
            <div className="flex flex-wrap gap-2">
              {machines.slice(0, 12).map(m => (
                <Badge key={m.agent_id} variant="outline" className="font-normal">
                  {m.machine_name}
                  {m.blocked > 0 && ` · ${m.blocked} blocked`}
                  {m.elevated > 0 && ` · ${m.elevated} elevated`}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {simulation.summary.installs_matched === 0 && (
          <div className="rounded-lg border border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
            This policy would not act on anything currently reported. Either the rules match
            nothing installed, or the machines it targets have not reported their software.
          </div>
        )}

        {/* Returned by the backend rather than written here, so this list
            cannot drift out of step with what the projection actually does. */}
        <div className="space-y-2 rounded-lg border border-border/60 bg-muted/30 p-4">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Info className="h-4 w-4" />
            What this projection cannot tell you
          </p>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {simulation.limits.map((limit, i) => (
              <li key={i}>• {limit}</li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: number;
  detail?: string;
  tone?: 'danger' | 'warning';
}) {
  const colour =
    tone === 'danger' ? 'text-red-400' : tone === 'warning' ? 'text-amber-400' : 'text-foreground';
  return (
    <div className="rounded-lg border border-border/60 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${colour}`}>{value}</p>
      {detail && <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>}
    </div>
  );
}
