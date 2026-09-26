'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Globe,
  Plus,
  Trash2,
  Play,
  Square,
  Copy,
  RefreshCw,
  ExternalLink,
  Server,
  Loader2,
} from 'lucide-react';
import { Breadcrumb } from '@/components/ui/page-breadcrumb';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { deploymentsAPI, Deployment, DeploymentStatus } from '@/lib/deployments-api';
import { cn } from '@/lib/utils';

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
  error:    'Error',
};

export default function DeployApplicationsPage() {
  const { token } = useAuth();
  const { toast } = useToast();

  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading]         = useState(true);

  const loadAll = async () => {
    if (!token) return;
    try {
      const deps = await deploymentsAPI.list(token);
      setDeployments(deps);
    } catch (err: any) {
      toast({ title: 'Failed to load', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, [token]);

  const handleStart = async (id: string) => {
    if (!token) return;
    try {
      await deploymentsAPI.start(token, id);
      loadAll();
    } catch (err: any) {
      toast({ title: 'Failed to start', description: err.message, variant: 'destructive' });
    }
  };

  const handleStop = async (id: string) => {
    if (!token) return;
    try {
      await deploymentsAPI.stop(token, id);
      loadAll();
    } catch (err: any) {
      toast({ title: 'Failed to stop', description: err.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    try {
      await deploymentsAPI.delete(token, id);
      toast({ title: 'Deployment deleted' });
      loadAll();
    } catch (err: any) {
      toast({ title: 'Failed to delete', description: err.message, variant: 'destructive' });
    }
  };

  const copyURL = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: 'URL copied!' });
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <Breadcrumb items={[{ label: 'Deploy Applications' }]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="w-6 h-6 text-primary" />
            Deploy Applications
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Expose applications running on your machines to the internet with a public URL.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadAll}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" asChild>
            <Link href="/deploy-applications/add">
              <Plus className="w-4 h-4 mr-2" />
              New Deployment
            </Link>
          </Button>
        </div>
      </div>

      {/* How it works banner */}
      <Card className="p-4 bg-primary/5 border-primary/20">
        <div className="flex items-start gap-3">
          <Server className="w-5 h-5 text-primary mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-foreground">How it works</p>
            <p className="text-muted-foreground mt-0.5">
              Select a machine and the port your application is running on.
              A public URL is created instantly — traffic is tunneled securely through vsay-agent
              running on that machine. No firewall rules needed.
            </p>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : deployments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Globe className="w-10 h-10 opacity-30" />
            <p className="text-sm">No deployments yet</p>
            <Button size="sm" variant="outline" asChild>
              <Link href="/deploy-applications/add">
                <Plus className="w-4 h-4 mr-2" />
                Create your first deployment
              </Link>
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Machine</TableHead>
                <TableHead>Port</TableHead>
                <TableHead>Public URL</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deployments.map(dep => (
                <TableRow key={dep.id} className="cursor-pointer"
                  onClick={(e) => {
                    // Don't navigate when clicking action buttons
                    if ((e.target as HTMLElement).closest('button, a')) return;
                    window.location.href = `/deploy-applications/${dep.id}`;
                  }}>
                  <TableCell className="font-medium">{dep.name}</TableCell>
                  <TableCell className="text-muted-foreground">{dep.machine_name}</TableCell>
                  <TableCell className="font-mono text-sm">{dep.port}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-primary truncate max-w-[220px]">
                        {dep.public_url}
                      </span>
                      <button
                        onClick={() => copyURL(dep.public_url)}
                        className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                        title="Copy URL"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      {dep.status === 'active' && (
                        <a
                          href={dep.public_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                          title="Open in browser"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn('text-xs', STATUS_COLORS[dep.status])}
                    >
                      {STATUS_LABELS[dep.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {dep.status === 'inactive' ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-500/10"
                          title="Start"
                          onClick={() => handleStart(dep.id)}
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Stop"
                          onClick={() => handleStop(dep.id)}
                        >
                          <Square className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Delete"
                        onClick={() => handleDelete(dep.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
