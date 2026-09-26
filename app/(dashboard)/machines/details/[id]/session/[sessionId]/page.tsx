'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  Monitor,
  Activity,
  Terminal,
  FileText,
  Cpu,
  Globe,
  Clock,
  User,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { Breadcrumb } from '@/components/ui/page-breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { machinesAPI, LogEntry, Session } from '@/lib/machines-api';
import { useToast } from '@/hooks/use-toast';

// Dynamically import the XTerm-based terminal to avoid SSR issues
const ReadOnlyTerminal = dynamic(
  () => import('@/components/ReadOnlyTerminal').then(m => ({ default: m.ReadOnlyTerminal })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[600px] bg-[#0d1117] rounded-b-lg">
        <RefreshCw className="w-6 h-6 animate-spin text-[#8b949e]" />
      </div>
    ),
  }
);

export default function SessionDetails() {
  const params = useParams();
  const machineId = params.id as string;
  const sessionId = params.sessionId as string;
  const { token } = useAuth();
  const { toast } = useToast();

  const [session, setSession] = useState<Session | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [machineName, setMachineName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Pagination state
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsTotalPages, setLogsTotalPages] = useState(0);
  const itemsPerPage = 50;

  const loadSessionDetails = async (page = 1) => {
    if (!token || !sessionId) return;

    try {
      setLoading(true);
      const data = await machinesAPI.getSessionDetails(token, sessionId, { page, limit: itemsPerPage });
      setSession(data.session);
      setLogs(data.logs || []);
      setMachineName(data.machine_name || '');
      setLogsTotal(data.logs_total ?? 0);
      setLogsTotalPages(data.logs_total_pages ?? 0);
      setLogsPage(page);
    } catch (error) {
      console.error('Failed to load session details:', error);
      toast({
        title: "Error",
        description: "Failed to load session details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessionDetails(1);
  }, [sessionId, token]);

  // Auto-refresh every 5s if session is still active
  useEffect(() => {
    if (!session || session.status !== 'active') return;
    const interval = setInterval(() => loadSessionDetails(logsPage), 5000);
    return () => clearInterval(interval);
  }, [session?.status, logsPage]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)]">
        <FileText className="w-16 h-16 text-muted-foreground/50 mb-4" />
        <h2 className="text-xl font-medium mb-2">Session not found</h2>
        <p className="text-muted-foreground mb-4">The requested session could not be found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Machines', href: '/machines' },
          { label: machineName || 'Machine', href: `/machines/details/${machineId}` },
          { label: 'Session Details' },
        ]}
      />

      {/* Session Info Card */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl flex items-center gap-3">
              <div className={cn(
                "w-4 h-4 rounded-full",
                session.status === 'active' ? "bg-green-500 animate-pulse" : "bg-gray-400"
              )} />
              Session Details
            </CardTitle>
            <Badge variant={session.status === 'active' ? 'default' : 'secondary'} className="text-sm">
              {session.status.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <User className="w-4 h-4" />
                User
              </div>
              <p className="font-medium">{session.username}</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Terminal className="w-4 h-4" />
                Source
              </div>
              <Badge variant="outline" className={cn(
                session.source === 'vscode' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                session.source === 'cli' ? "bg-green-500/10 text-green-500 border-green-500/20" :
                "bg-purple-500/10 text-purple-500 border-purple-500/20"
              )}>
                {session.source?.toUpperCase() || 'UI'}
              </Badge>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Cpu className="w-4 h-4" />
                Operating System
              </div>
              <p className="font-medium">{session.os_info || 'Unknown'}</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Globe className="w-4 h-4" />
                Browser/Client
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <p className="font-medium truncate max-w-[200px]">{session.browser || 'Unknown'}</p>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs max-w-md break-all">{session.browser}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Monitor className="w-4 h-4" />
                IP Address
              </div>
              <p className="font-medium font-mono">{session.ip_address || 'Unknown'}</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Activity className="w-4 h-4" />
                Commands Executed
              </div>
              <p className="font-medium text-2xl">{session.command_count}</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Clock className="w-4 h-4" />
                Started At
              </div>
              <p className="font-medium">{new Date(session.created_at).toLocaleString()}</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Clock className="w-4 h-4" />
                Ended At
              </div>
              <p className="font-medium">
                {session.closed_at ? new Date(session.closed_at).toLocaleString() : 'Still Active'}
              </p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t">
            <p className="text-sm text-muted-foreground">Session ID</p>
            <p className="font-mono text-sm bg-muted px-3 py-2 rounded mt-1">{session.session_id}</p>
          </div>
        </CardContent>
      </Card>

      {/* Terminal Replay Card */}
      <Card className="glass-card overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b">
          <CardTitle className="text-lg flex items-center gap-2">
            <Terminal className="w-5 h-5" />
            Session Replay
            <span className="text-muted-foreground font-normal text-sm">({logsTotal} commands)</span>
          </CardTitle>
          <div className="flex items-center gap-2">
            {session.status === 'active' && (
              <div className="flex items-center gap-1.5 text-xs text-green-500">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Live
              </div>
            )}
            <Button size="sm" variant="outline" onClick={() => loadSessionDetails(logsPage)}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>

        {/* macOS-style terminal chrome */}
        <div className="bg-[#1c1c1e] flex items-center gap-2 px-4 py-2.5 border-b border-[#2d2d2d]">
          <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e]" />
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123]" />
          <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29]" />
          <span className="ml-2 text-[#8b8b8b] text-xs font-medium">
            {session.username}@{machineName} — read only
          </span>
        </div>

        <CardContent className="p-0 bg-[#0d1117]">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <Terminal className="w-10 h-10 text-[#8b949e] mb-3" />
              <p className="text-[#8b949e] text-sm">No commands logged yet</p>
            </div>
          ) : (
            <ReadOnlyTerminal
              logs={logs}
              sessionUsername={session.username}
              machineName={machineName}
            />
          )}
        </CardContent>

        {/* Pagination */}
        {logsTotalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <p className="text-sm text-muted-foreground">
              Showing {((logsPage - 1) * itemsPerPage) + 1}–{Math.min(logsPage * itemsPerPage, logsTotal)} of {logsTotal} commands
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                disabled={logsPage === 1}
                onClick={() => loadSessionDetails(logsPage - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {Array.from({ length: Math.min(logsTotalPages, 5) }, (_, i) => i + 1).map(p => (
                <Button
                  key={p}
                  variant={logsPage === p ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => loadSessionDetails(p)}
                >
                  {p}
                </Button>
              ))}
              {logsTotalPages > 5 && <span className="text-muted-foreground">...</span>}
              <Button
                variant="outline"
                size="icon"
                disabled={logsPage === logsTotalPages}
                onClick={() => loadSessionDetails(logsPage + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
