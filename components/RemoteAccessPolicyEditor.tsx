'use client';

import { useState } from 'react';
import { Plus, Trash2, Save, X, AlertTriangle, Clock } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ScopePicker } from '@/components/PolicyEditor';
import {
  RemoteAccessPolicy,
  TimeWindow,
  minutesToClock,
  clockToMinutes,
  DAY_NAMES,
} from '@/lib/remote-access-policies-api';

interface Props {
  policy: RemoteAccessPolicy;
  recordingAvailable: boolean;
  onCancel: () => void;
  onSave: (policy: RemoteAccessPolicy) => void;
}

export default function RemoteAccessPolicyEditor({
  policy,
  recordingAvailable,
  onCancel,
  onSave,
}: Props) {
  const [draft, setDraft] = useState<RemoteAccessPolicy>({
    ...policy,
    time_windows: [...(policy.time_windows ?? [])],
  });

  const update = (patch: Partial<RemoteAccessPolicy>) =>
    setDraft(prev => ({ ...prev, ...patch }));

  const addWindow = () =>
    update({
      time_windows: [
        ...(draft.time_windows ?? []),
        {
          days: [1, 2, 3, 4, 5],
          start_minute: 9 * 60,
          end_minute: 18 * 60,
          // The browser's zone is the operator's own, which is nearly always
          // what they mean by "business hours".
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        },
      ],
    });

  const updateWindow = (index: number, patch: Partial<TimeWindow>) =>
    update({
      time_windows: (draft.time_windows ?? []).map((w, i) =>
        i === index ? { ...w, ...patch } : w,
      ),
    });

  const removeWindow = (index: number) =>
    update({ time_windows: (draft.time_windows ?? []).filter((_, i) => i !== index) });

  const noWayIn = !draft.allow_attended && !draft.allow_unattended && !draft.allow_terminal;
  const nameMissing = draft.name.trim() === '';
  const scopeEmpty =
    (draft.scope.kind === 'group' && (draft.scope.group_ids?.length ?? 0) === 0) ||
    (draft.scope.kind === 'machine' && (draft.scope.agent_ids?.length ?? 0) === 0);
  const canSave = !nameMissing && !noWayIn && !scopeEmpty;

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>{policy.id ? 'Edit remote access policy' : 'New remote access policy'}</CardTitle>
            <CardDescription className="mt-1">
              Narrows who may connect to these machines and how. It never widens access —
              somebody who is not already entitled to a machine cannot be let in by a policy.
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onCancel} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-1.5">
          <Label htmlFor="ra-name">Name</Label>
          <Input
            id="ra-name"
            value={draft.name}
            onChange={e => update({ name: e.target.value })}
            placeholder="Support team, business hours only"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ra-description">Description</Label>
          <Textarea
            id="ra-description"
            value={draft.description ?? ''}
            onChange={e => update({ description: e.target.value })}
            rows={2}
            placeholder="Why this exists, so the next person knows whether they may change it."
          />
        </div>

        <ScopePicker scope={draft.scope} onChange={scope => update({ scope })} />

        <div className="space-y-3 rounded-lg border border-border/60 p-4">
          <Label className="text-base font-semibold">Ways in</Label>
          <div className="space-y-3">
            <Toggle
              label="Attended remote control"
              hint="Joining the user's live session, with their consent. Real-time support."
              checked={draft.allow_attended}
              onChange={v => update({ allow_attended: v })}
            />
            <Toggle
              label="Unattended desktop"
              hint="A separate desktop session over RDP or VNC. No one has to be present."
              checked={draft.allow_unattended}
              onChange={v => update({ allow_unattended: v })}
            />
            <Toggle
              label="Terminal"
              hint="A shell on the machine."
              checked={draft.allow_terminal}
              onChange={v => update({ allow_terminal: v })}
            />
          </div>
          {noWayIn && (
            <p className="flex items-start gap-2 text-xs text-amber-500">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              This forbids every way in, which would make these machines unreachable. Allow at
              least one.
            </p>
          )}
        </div>

        <div className="space-y-3 rounded-lg border border-border/60 p-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="flex items-center gap-2 text-base font-semibold">
                <Clock className="h-4 w-4" />
                When sessions may start
              </Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Leave empty for any time. These gate the <strong>start</strong> of a session — a
                session already running is not cut off because the clock struck six.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={addWindow} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Add window
            </Button>
          </div>

          {(draft.time_windows ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Any time.</p>
          ) : (
            (draft.time_windows ?? []).map((w, i) => (
              <div key={i} className="space-y-3 rounded-md border border-border/50 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  {DAY_NAMES.map((name, day) => {
                    const on = (w.days ?? []).includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() =>
                          updateWindow(i, {
                            days: on
                              ? (w.days ?? []).filter(d => d !== day)
                              : [...(w.days ?? []), day].sort(),
                          })
                        }
                        className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
                          on
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border/50 bg-muted/30'
                        }`}
                      >
                        {name}
                      </button>
                    );
                  })}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-auto"
                    onClick={() => removeWindow(i)}
                    aria-label="Remove window"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <Label className="text-xs">From</Label>
                    <Input
                      type="time"
                      value={minutesToClock(w.start_minute)}
                      onChange={e => updateWindow(i, { start_minute: clockToMinutes(e.target.value) })}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">To</Label>
                    <Input
                      type="time"
                      value={minutesToClock(w.end_minute)}
                      onChange={e => updateWindow(i, { end_minute: clockToMinutes(e.target.value) })}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Timezone</Label>
                    <Input
                      value={w.timezone ?? ''}
                      onChange={e => updateWindow(i, { timezone: e.target.value })}
                      placeholder="Asia/Kolkata"
                      className="h-9"
                    />
                  </div>
                </div>

                {w.end_minute < w.start_minute && (
                  <p className="text-xs text-muted-foreground">
                    This window crosses midnight — a night shift from {minutesToClock(w.start_minute)}{' '}
                    to {minutesToClock(w.end_minute)} the next day.
                  </p>
                )}
                {(w.days ?? []).length === 0 && (
                  <p className="text-xs text-muted-foreground">No days selected — applies every day.</p>
                )}
              </div>
            ))
          )}
        </div>

        <div className="space-y-3 rounded-lg border border-border/60 p-4">
          <Label className="text-base font-semibold">Conditions</Label>

          <Toggle
            label="Require the user's consent"
            hint="The person at the machine must approve before anything is shown."
            checked={draft.require_consent}
            onChange={v => update({ require_consent: v })}
          />
          <Toggle
            label="Require a reason"
            hint="The operator must say why they are connecting. It is recorded with the session."
            checked={draft.require_reason}
            onChange={v => update({ require_reason: v })}
          />
          <Toggle
            label="Require session recording"
            hint={
              recordingAvailable
                ? 'Sessions are refused if recording is unavailable.'
                : 'No recording storage is configured, so turning this on will refuse every session until S3 is set up under Log Management.'
            }
            checked={draft.require_recording}
            onChange={v => update({ require_recording: v })}
          />

          {draft.require_recording && !recordingAvailable && (
            <p className="flex items-start gap-2 text-xs text-amber-500">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Recording storage is not configured. This policy will refuse every session, which is
              the honest behaviour — a policy that says sessions are recorded has to mean it.
            </p>
          )}

          <div className="max-w-[220px] space-y-1.5 pt-2">
            <Label htmlFor="ra-max">Maximum session length (minutes)</Label>
            <Input
              id="ra-max"
              type="number"
              min={0}
              value={draft.max_session_minutes}
              onChange={e => update({ max_session_minutes: Number(e.target.value) })}
            />
            <p className="text-xs text-muted-foreground">
              0 means no limit. This is an absolute cap from when the session starts — not an
              idle timeout, so a busy session is ended too. Checked once a minute, so it can
              overrun by up to that.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
          <div className="space-y-0.5">
            <Label className="font-medium">Enabled</Label>
            <p className="text-xs text-muted-foreground">A disabled policy is kept but ignored.</p>
          </div>
          <Switch checked={draft.enabled} onCheckedChange={v => update({ enabled: v })} />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => onSave(draft)} disabled={!canSave} className="gap-2">
            <Save className="h-4 w-4" />
            Save policy
          </Button>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          {nameMissing && <span className="text-xs text-muted-foreground">A name is required.</span>}
        </div>
      </CardContent>
    </Card>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-0.5">
        <Label className="font-medium">{label}</Label>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
