'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Globe,
  Copy,
  ExternalLink,
  Play,
  Square,
  Trash2,
  Loader2,
  ChevronLeft,
  Server,
  Clock,
  Link2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Plug,
  X,
} from 'lucide-react';
import { Breadcrumb } from '@/components/ui/page-breadcrumb';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { deploymentsAPI, Deployment, DeploymentStatus } from '@/lib/deployments-api';
import { cn } from '@/lib/utils';

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_COLORS: Record<DeploymentStatus, string> = {
  active:   'bg-green-500/15 text-green-600 border-green-500/30',
  pending:  'bg-yellow-500/15 text-yellow-600 border-yellow-500/30',
  inactive: 'bg-muted text-muted-foreground border-border',
  error:    'bg-red-500/15 text-red-600 border-red-500/30',
};

const STATUS_LABELS: Record<DeploymentStatus, string> = {
  active:   'Live',
  pending:  'Connecting…',
  inactive: 'Stopped',
  error:    'Disconnected',
};

function StatusIcon({ status }: { status: DeploymentStatus }) {
  switch (status) {
    case 'active':   return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case 'pending':  return <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />;
    case 'error':    return <XCircle className="w-4 h-4 text-red-500" />;
    default:         return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DeploymentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [dep, setDep]               = useState<Deployment | null>(null);
  const [loading, setLoading]       = useState(true);
  const [actionBusy, setActionBusy] = useState(false);

  // Custom domain form state
  const [domainInput, setDomainInput]   = useState('');
  const [savingDomain, setSavingDomain] = useState(false);
  const [showDomainForm, setShowDomainForm] = useState(false);

  const load = async () => {
    if (!token || !id) return;
    try {
      const d = await deploymentsAPI.get(token, id);
      setDep(d);
      setDomainInput(d.custom_domain ?? '');
    } catch (err: any) {
      toast({ title: 'Failed to load deployment', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [token, id]);

  // Auto-refresh while pending
  useEffect(() => {
    if (dep?.status !== 'pending') return;
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [dep?.status]);

  const copy = (text: string, label = 'Copied!') => {
    navigator.clipboard.writeText(text);
    toast({ title: label });
  };

  const handleStart = async () => {
    if (!token || !dep) return;
    setActionBusy(true);
    try {
      await deploymentsAPI.start(token, dep.id);
      await load();
    } catch (err: any) {
      toast({ title: 'Failed to start', description: err.message, variant: 'destructive' });
    } finally {
      setActionBusy(false);
    }
  };

  const handleStop = async () => {
    if (!token || !dep) return;
    setActionBusy(true);
    try {
      await deploymentsAPI.stop(token, dep.id);
      await load();
    } catch (err: any) {
      toast({ title: 'Failed to stop', description: err.message, variant: 'destructive' });
    } finally {
      setActionBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!token || !dep) return;
    if (!confirm(`Delete "${dep.name}"? This cannot be undone.`)) return;
    setActionBusy(true);
    try {
      await deploymentsAPI.delete(token, dep.id);
      toast({ title: 'Deployment deleted' });
      router.push('/deploy-applications');
    } catch (err: any) {
      toast({ title: 'Failed to delete', description: err.message, variant: 'destructive' });
      setActionBusy(false);
    }
  };

  const handleSaveDomain = async () => {
    if (!token || !dep) return;
    const cleaned = domainInput.trim();
    if (!cleaned) return;
    setSavingDomain(true);
    try {
      await deploymentsAPI.setCustomDomain(token, dep.id, cleaned);
      toast({ title: 'Custom domain saved', description: `Point your DNS CNAME to ${dep.subdomain} to activate it.` });
      setShowDomainForm(false);
      await load();
    } catch (err: any) {
      toast({ title: 'Failed to save domain', description: err.message, variant: 'destructive' });
    } finally {
      setSavingDomain(false);
    }
  };

  const handleRemoveDomain = async () => {
    if (!token || !dep) return;
    setSavingDomain(true);
    try {
      await deploymentsAPI.removeCustomDomain(token, dep.id);
      setDomainInput('');
      setShowDomainForm(false);
      await load();
    } catch (err: any) {
      toast({ title: 'Failed to remove domain', description: err.message, variant: 'destructive' });
    } finally {
      setSavingDomain(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!dep) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Deployment not found.{' '}
        <Link href="/deploy-applications" className="text-primary underline">Go back</Link>
      </div>
    );
  }

  const isActive  = dep.status === 'active';
  const isBusy    = actionBusy;

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto">
      <Breadcrumb items={[
        { label: 'Deploy Applications', href: '/deploy-applications' },
        { label: dep.name },
      ]} />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Globe className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              {dep.name}
              <Badge variant="outline" className={cn('text-xs ml-1', STATUS_COLORS[dep.status])}>
                <StatusIcon status={dep.status} />
                <span className="ml-1">{STATUS_LABELS[dep.status]}</span>
              </Badge>
            </h1>
            <p className="text-sm text-muted-foreground">Created {timeAgo(dep.created_at)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Refresh
          </Button>
          {dep.status === 'inactive' || dep.status === 'error' ? (
            <Button size="sm" onClick={handleStart} disabled={isBusy}
              className="text-green-600 border-green-500/30 bg-green-500/10 hover:bg-green-500/20">
              {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              <span className="ml-1">Start</span>
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={handleStop} disabled={isBusy}>
              {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Square className="w-3.5 h-3.5" />}
              <span className="ml-1">Stop</span>
            </Button>
          )}
          <Button variant="outline" size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleDelete} disabled={isBusy}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* ── Public URL ─────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Public URL
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn(
              'w-2 h-2 rounded-full shrink-0',
              isActive ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground/40'
            )} />
            <a
              href={isActive ? dep.public_url : undefined}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'font-mono text-base font-semibold truncate',
                isActive ? 'text-primary hover:underline' : 'text-foreground'
              )}
            >
              {dep.public_url}
            </a>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => copy(dep.public_url, 'URL copied!')}>
              <Copy className="w-3.5 h-3.5 mr-1" />
              Copy
            </Button>
            {isActive && (
              <Button variant="outline" size="sm" asChild>
                <a href={dep.public_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3.5 h-3.5 mr-1" />
                  Open
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Custom Domain ──────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Custom Domain
              </CardTitle>
              <CardDescription className="mt-0.5 text-xs">
                Point a CNAME record to your tunnel subdomain to use your own domain.
              </CardDescription>
            </div>
            {!showDomainForm && (
              <Button variant="outline" size="sm" onClick={() => setShowDomainForm(true)}>
                <Link2 className="w-3.5 h-3.5 mr-1" />
                {dep.custom_domain ? 'Change' : 'Add Domain'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {dep.custom_domain && !showDomainForm && (
            <div className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-2 min-w-0">
                <Globe className="w-4 h-4 text-primary shrink-0" />
                <span className="font-mono text-sm font-medium truncate">{dep.custom_domain}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="ghost" size="sm" onClick={() => copy(dep.custom_domain!, 'Domain copied!')}>
                  <Copy className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={handleRemoveDomain} disabled={savingDomain}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}

          {showDomainForm && (
            <div className="space-y-3">
              <div className="flex flex-col gap-1.5">
                <Label>Domain name</Label>
                <Input
                  placeholder="e.g. myapp.example.com"
                  value={domainInput}
                  onChange={e => setDomainInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveDomain()}
                />
              </div>

              {/* DNS instructions */}
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2 text-sm">
                <p className="font-medium">DNS Setup Instructions</p>
                <p className="text-muted-foreground">Add this CNAME record to your DNS provider:</p>
                <div className="font-mono text-xs grid grid-cols-[auto_1fr_1fr] gap-x-4 gap-y-1 mt-1">
                  <span className="text-muted-foreground">Type</span>
                  <span className="text-muted-foreground">Name</span>
                  <span className="text-muted-foreground">Value</span>
                  <span className="text-foreground font-semibold">CNAME</span>
                  <span className="text-foreground truncate">{domainInput || 'myapp'}</span>
                  <button
                    className="text-primary text-left hover:underline truncate"
                    onClick={() => copy(dep.subdomain, 'CNAME value copied!')}
                  >
                    {dep.subdomain} <Copy className="inline w-3 h-3 ml-1" />
                  </button>
                </div>
                <p className="text-muted-foreground text-xs">DNS changes may take up to 24 hours to propagate.</p>
              </div>

              <div className="flex items-center gap-2">
                <Button size="sm" onClick={handleSaveDomain} disabled={savingDomain || !domainInput.trim()}>
                  {savingDomain ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                  Save Domain
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setShowDomainForm(false); setDomainInput(dep.custom_domain ?? ''); }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {!dep.custom_domain && !showDomainForm && (
            <p className="text-sm text-muted-foreground">No custom domain configured.</p>
          )}
        </CardContent>
      </Card>

      {/* ── Deployment Info ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Connection Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Connection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow icon={<Server className="w-4 h-4" />} label="Machine" value={dep.machine_name || dep.machine_id} />
            <Separator />
            <InfoRow icon={<Plug className="w-4 h-4" />} label="Local Port" value={`:${dep.port}`} mono />
            <Separator />
            <InfoRow icon={<Globe className="w-4 h-4" />} label="Subdomain" value={dep.subdomain} mono
              onCopy={() => copy(dep.subdomain, 'Subdomain copied!')} />
          </CardContent>
        </Card>

        {/* Timestamps */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow icon={<Clock className="w-4 h-4" />} label="Created" value={formatDate(dep.created_at)} />
            <Separator />
            <InfoRow icon={<Clock className="w-4 h-4" />} label="Last updated" value={formatDate(dep.updated_at)} />
            <Separator />
            <InfoRow icon={<StatusIcon status={dep.status} />} label="Status" value={STATUS_LABELS[dep.status]} />
          </CardContent>
        </Card>
      </div>

      {/* ── How to connect (agent guide) ──────────────────────────────────── */}
      {dep.status === 'pending' && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-yellow-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              Waiting for agent to connect
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>Make sure <strong>vsay-agent</strong> is running on <strong>{dep.machine_name || dep.machine_id}</strong>.</p>
            <p>The agent will automatically poll for pending tunnels and connect. This page will update when the tunnel goes live.</p>
          </CardContent>
        </Card>
      )}

      {dep.status === 'error' && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-red-600">
              <XCircle className="w-4 h-4" />
              Agent disconnected
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>The agent on <strong>{dep.machine_name || dep.machine_id}</strong> disconnected unexpectedly.
              Click <strong>Start</strong> to make it reconnect, or check if vsay-agent is still running.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Sub-component ────────────────────────────────────────────────────────────

function InfoRow({
  icon, label, value, mono = false, onCopy,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
  onCopy?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-muted-foreground text-sm shrink-0">
        {icon}
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-1 min-w-0">
        <span className={cn('text-sm truncate', mono && 'font-mono text-xs')}>{value}</span>
        {onCopy && (
          <button onClick={onCopy} className="text-muted-foreground hover:text-foreground shrink-0 ml-1">
            <Copy className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}
