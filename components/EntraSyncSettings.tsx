'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Loader2, Save, RefreshCw, PlugZap, AlertCircle, CheckCircle2, Users, Info,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { SelectInput } from '@/components/FilterBar';
import { useToast } from '@/components/ui/use-toast';
import {
  entraSyncAPI,
  EntraSyncSettings as Settings,
  EntraSyncRunResult,
} from '@/lib/entra-sync-api';

interface Props {
  token: string | null;
}

/** Microsoft Entra directory synchronisation.
 *
 *  Two things depend on this: SSO sign-in only works for people who already
 *  have an account here, and application policy can only be scoped to a group
 *  that exists here. */
export default function EntraSyncSettings({ token }: Props) {
  const { toast } = useToast();

  const [settings, setSettings] = useState<Settings | null>(null);
  const [secret, setSecret] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      setSettings(await entraSyncAPI.get(token));
    } catch (err) {
      toast({
        title: 'Could not load directory settings',
        description: err instanceof Error ? err.message : 'Error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const update = (patch: Partial<Settings>) =>
    setSettings(prev => (prev ? { ...prev, ...patch } : prev));

  const save = async () => {
    if (!token || !settings) return;
    setSaving(true);
    try {
      await entraSyncAPI.save(token, {
        enabled: settings.enabled,
        directory_tenant_id: settings.directory_tenant_id,
        client_id: settings.client_id,
        client_secret: secret, // empty keeps the stored one
        sync_users: settings.sync_users,
        sync_groups: settings.sync_groups,
        interval_minutes: settings.interval_minutes,
        default_role: settings.default_role,
        group_filter: settings.group_filter,
      });
      setSecret('');
      toast({ title: 'Directory settings saved' });
      load();
    } catch (err) {
      toast({
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    if (!token) return;
    setTesting(true);
    try {
      const res = await entraSyncAPI.test(token);
      toast({ title: 'Connected', description: res.message });
    } catch (err) {
      toast({
        title: 'Could not connect',
        description: err instanceof Error ? err.message : 'Error',
        variant: 'destructive',
      });
    } finally {
      setTesting(false);
    }
  };

  const runNow = async () => {
    if (!token) return;
    setRunning(true);
    try {
      const res = await entraSyncAPI.runNow(token);
      toast({
        title: res.status === 'success' ? 'Sync finished' : `Sync ${res.status}`,
        description: describeRun(res),
        // A run where every account failed is not a success, whatever the
        // status says — the operator should see that in the colour too.
        variant: res.status === 'failed' || res.users_failed > 0 ? 'destructive' : undefined,
      });
      load();
    } catch (err) {
      toast({
        title: 'Sync failed',
        description: err instanceof Error ? err.message : 'Error',
        variant: 'destructive',
      });
    } finally {
      setRunning(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Microsoft Entra Directory Sync
              </CardTitle>
              <CardDescription className="mt-1">
                Brings people and groups across from Entra, so they can sign in with Microsoft
                without being created here by hand — and so application policy can be scoped to
                your existing directory groups.
              </CardDescription>
            </div>
            <Switch checked={settings.enabled} onCheckedChange={v => update({ enabled: v })} />
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* The single most common half-configured state, and the one whose
              error message ("403") explains nothing on its own. */}
          <div className="flex items-start gap-3 rounded-lg border border-blue-500/40 bg-blue-500/10 p-4 text-sm">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />
            <div>
              <p className="font-medium">Before this works, in the Azure portal</p>
              <p className="mt-1 text-muted-foreground">
                The app registration needs the <strong>application</strong> permissions{' '}
                <span className="font-mono text-xs">User.Read.All</span> and{' '}
                <span className="font-mono text-xs">Group.Read.All</span>, with admin consent
                granted. The delegated permissions used by the sign-in button are not enough — a
                sync using those fails with a permission error that does not say why.
              </p>
            </div>
          </div>

          {settings.using_shared_credentials && settings.enabled && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
              <div>
                <p className="font-medium">Using the sign-in app registration.</p>
                <p className="mt-1 text-muted-foreground">
                  No separate credentials are configured, so the sync is reusing the one behind the
                  “Sign in with Microsoft” button. That works only if it has the application
                  permissions above; most sign-in registrations do not.
                </p>
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="entra-tenant">Directory (tenant) ID</Label>
              <Input
                id="entra-tenant"
                value={settings.directory_tenant_id}
                onChange={e => update({ directory_tenant_id: e.target.value })}
                placeholder="00000000-0000-0000-0000-000000000000"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="entra-client">Application (client) ID</Label>
              <Input
                id="entra-client"
                value={settings.client_id}
                onChange={e => update({ client_id: e.target.value })}
                placeholder="00000000-0000-0000-0000-000000000000"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="entra-secret">
                Client secret
                {settings.has_client_secret && !secret && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    (set — leave blank to keep)
                  </span>
                )}
              </Label>
              <Input
                id="entra-secret"
                type="password"
                value={secret}
                onChange={e => setSecret(e.target.value)}
                placeholder={settings.has_client_secret ? '••••••••' : 'Client secret value'}
                autoComplete="new-password"
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="font-medium">Synchronise users</Label>
                <p className="text-xs text-muted-foreground">
                  Creates an account for each person in the directory. Without this, signing in
                  with Microsoft fails for anyone not already created here.
                </p>
              </div>
              <Switch
                checked={settings.sync_users}
                onCheckedChange={v => update({ sync_users: v })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="font-medium">Synchronise groups</Label>
                <p className="text-xs text-muted-foreground">
                  Mirrors directory groups and their membership, so application policy can be
                  scoped to them.
                </p>
              </div>
              <Switch
                checked={settings.sync_groups}
                onCheckedChange={v => update({ sync_groups: v })}
              />
            </div>
          </div>

          <div className="grid gap-4 border-t pt-5 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="entra-interval">Run every (minutes)</Label>
              <Input
                id="entra-interval"
                type="number"
                min={5}
                value={settings.interval_minutes}
                onChange={e => update({ interval_minutes: Number(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">
                Default 60. Minimum 5 — each run reads the whole directory.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="entra-role">Role for new accounts</Label>
              <SelectInput
                id="entra-role"
                value={settings.default_role}
                onChange={v => update({ default_role: v })}
              >
                <option value="user">User</option>
                <option value="company_admin">Company admin</option>
              </SelectInput>
              <p className="text-xs text-muted-foreground">
                Applied when an account is created. Promoting someone here afterwards is never
                undone by a later sync.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="entra-filter">Only groups starting with</Label>
              <Input
                id="entra-filter"
                value={settings.group_filter}
                onChange={e => update({ group_filter: e.target.value })}
                placeholder="EPM-"
              />
              <p className="text-xs text-muted-foreground">
                Optional. A directory of distribution lists would otherwise bury the few you write
                policy against.
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/30 p-4 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">What this sync will and will not do</p>
            <ul className="mt-1.5 space-y-1">
              <li>• People who leave the directory are <strong>disabled, never deleted</strong> — what they did stays on the record.</li>
              <li>• Accounts created here by hand are <strong>never disabled</strong>, even if absent from the directory. Your break-glass admin is safe.</li>
              <li>• Nested groups are not expanded; only direct members are synced.</li>
              <li>• Which machines a group covers is set here, not in Entra, and is left untouched.</li>
            </ul>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={save} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Saving…' : 'Save'}
            </Button>
            <Button variant="outline" onClick={test} disabled={testing} className="gap-2">
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlugZap className="h-4 w-4" />}
              Test connection
            </Button>
            <Button
              variant="outline"
              onClick={runNow}
              disabled={running || !settings.enabled}
              className="gap-2"
            >
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {running ? 'Syncing…' : 'Sync now'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {settings.last_run_at && (
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              {settings.last_status === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-green-400" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-500" />
              )}
              Last sync
            </CardTitle>
            <CardDescription>
              {new Date(settings.last_run_at).toLocaleString()} · {settings.last_status}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
              <Stat label="Read from Entra" value={settings.last_users_seen} />
              <Stat label="Created" value={settings.last_users_created} />
              <Stat label="Updated" value={settings.last_users_updated} />
              <Stat label="Disabled" value={settings.last_users_disabled} />
              <Stat label="Groups added" value={settings.last_groups_created} />
              <Stat label="Groups updated" value={settings.last_groups_updated} />
            </div>

            {/* Why the user figures above are what they are. Without this a
                row of zeros is indistinguishable from a broken run. */}
            <UserOutcome settings={settings} />
            {settings.last_error && (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs">
                {settings.last_error}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border/60 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-xl font-semibold">{value}</p>
    </div>
  );
}

/** One line saying what a manual run actually did.
 *
 *  The old version listed only successes, so a run where every account failed
 *  to provision read identically to a run with nothing to do. */
function describeRun(res: EntraSyncRunResult): string {
  if (res.users_sync_off) {
    return `User synchronisation is switched off. ${res.groups_created + res.groups_updated} group(s) synced.`;
  }

  const parts = [`${res.users_seen} read from Entra`];
  if (res.users_created) parts.push(`${res.users_created} created`);
  if (res.users_updated) parts.push(`${res.users_updated} updated`);
  if (res.users_disabled) parts.push(`${res.users_disabled} disabled`);
  if (res.users_skipped) parts.push(`${res.users_skipped} skipped (no address)`);
  if (res.users_failed) parts.push(`${res.users_failed} FAILED`);
  parts.push(`${res.groups_created + res.groups_updated} group(s)`);

  let line = parts.join(', ');
  if (res.user_error) line += ` — ${res.user_error}`;
  if (res.error) line += ` — ${res.error}`;
  return line;
}

/** Explains the user figures on the last-sync card.
 *
 *  A row of zeros is the same picture whether the toggle is off, the directory
 *  is empty, every account was skipped, or every account failed. Saying which
 *  is the difference between a number and an answer. */
function UserOutcome({ settings }: { settings: Settings }) {
  if (settings.last_users_sync_off) {
    return (
      <p className="rounded-md border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
        User synchronisation is switched off, so the user figures above are a setting rather than a
        result. Turn on <span className="font-medium text-foreground">Synchronise users</span> to
        provision accounts.
      </p>
    );
  }

  if (settings.last_users_failed > 0) {
    return (
      <div className="flex items-start gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
        <div>
          <p className="font-medium">
            {settings.last_users_failed} of {settings.last_users_seen} accounts could not be
            provisioned.
          </p>
          {settings.last_user_error && (
            <p className="mt-1 font-mono text-muted-foreground">{settings.last_user_error}</p>
          )}
          <p className="mt-1 text-muted-foreground">
            Accounts are created in Keycloak first, so this is usually Keycloak being unreachable or
            a username already taken by another realm.
          </p>
        </div>
      </div>
    );
  }

  if (settings.last_users_seen === 0) {
    return (
      <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-muted-foreground">
        The directory returned no users. Groups synced, so the credentials and connection are fine —
        this is usually the app registration missing the{' '}
        <span className="font-mono">User.Read.All</span> application permission, or missing admin
        consent for it.
      </p>
    );
  }

  if (settings.last_users_skipped === settings.last_users_seen) {
    return (
      <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-muted-foreground">
        All {settings.last_users_seen} directory accounts were skipped because none has a mail
        address or userPrincipalName. There is nothing to match a local account by, and nothing to
        sign in with.
      </p>
    );
  }

  if (settings.last_users_created + settings.last_users_updated === 0) {
    return (
      <p className="rounded-md border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
        All {settings.last_users_seen} accounts were already in sync — nothing needed changing.
      </p>
    );
  }

  return null;
}
