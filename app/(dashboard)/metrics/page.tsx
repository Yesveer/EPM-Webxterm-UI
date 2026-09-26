'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import {
  Activity, RefreshCw, BarChart2, Wifi, Shield,
  Cpu, MemoryStick, Server, Zap, AlertTriangle,
  CheckCircle2, XCircle, Clock, Key, Terminal,
  Radio, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { Breadcrumb } from '@/components/ui/page-breadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { MetricsDataPoint, ServiceSnapshot } from '@/app/api/internal/metrics-data/route';

// ── Colour palette ────────────────────────────────────────────────────────────
const C = {
  auth:     '#06b6d4', // cyan
  backend:  '#8b5cf6', // purple
  terminal: '#f59e0b', // amber
  success:  '#22c55e',
  error:    '#ef4444',
  warning:  '#f59e0b',
  muted:    '#64748b',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number, decimals = 1): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(decimals) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(decimals) + 'K';
  return n.toFixed(n < 10 ? decimals : 0);
}
function fmtMB(mb: number): string { return mb < 1 ? '<1 MB' : `${mb.toFixed(0)} MB`; }
function fmtMs(ms: number): string { return ms < 1 ? '<1ms' : `${ms.toFixed(1)}ms`; }
function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

/** Rate in units/sec between two consecutive history points */
function ratePerSec(prev: MetricsDataPoint, curr: MetricsDataPoint, fn: (s: ServiceSnapshot) => number, svc: 'auth' | 'backend' | 'terminal'): number {
  const dt = (curr.timestamp - prev.timestamp) / 1000;
  if (dt <= 0) return 0;
  return Math.max(0, (fn(curr[svc]) - fn(prev[svc])) / dt);
}

interface ChartPoint {
  time: string;
  auth: number;
  backend: number;
  terminal: number;
}

function buildRateChart(history: MetricsDataPoint[], fn: (s: ServiceSnapshot) => number): ChartPoint[] {
  const out: ChartPoint[] = [];
  for (let i = 1; i < history.length; i++) {
    out.push({
      time:     fmtTime(history[i].timestamp),
      auth:     +ratePerSec(history[i - 1], history[i], fn, 'auth').toFixed(3),
      backend:  +ratePerSec(history[i - 1], history[i], fn, 'backend').toFixed(3),
      terminal: +ratePerSec(history[i - 1], history[i], fn, 'terminal').toFixed(3),
    });
  }
  return out;
}

function buildValueChart(history: MetricsDataPoint[], fn: (s: ServiceSnapshot) => number): ChartPoint[] {
  return history.map(p => ({
    time:     fmtTime(p.timestamp),
    auth:     +fn(p.auth).toFixed(2),
    backend:  +fn(p.backend).toFixed(2),
    terminal: +fn(p.terminal).toFixed(2),
  }));
}

interface SingleChart {
  time: string;
  value: number;
}
function buildSingle(history: MetricsDataPoint[], fn: (p: MetricsDataPoint) => number): SingleChart[] {
  return history.map(p => ({ time: fmtTime(p.timestamp), value: +fn(p).toFixed(2) }));
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon: Icon, color = 'text-primary', trend,
}: {
  label: string; value: string; sub?: string; icon: React.ElementType;
  color?: string; trend?: 'up' | 'down' | 'neutral';
}) {
  return (
    <Card className="glass-card">
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            <p className="text-2xl font-bold mt-0.5 leading-none">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className={cn('p-2 rounded-lg bg-muted/50', color)}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
        {trend && (
          <div className={cn('flex items-center gap-1 mt-2 text-xs', trend === 'up' ? 'text-success' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground')}>
            {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : trend === 'down' ? <ArrowDownRight className="w-3 h-3" /> : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ServicePill({ snap }: { snap: ServiceSnapshot }) {
  const colors: Record<string, string> = {
    'vsay-auth': C.auth,
    'vsay-agent-backend': C.backend,
    'vsay-terminal': C.terminal,
  };
  const col = colors[snap.name] ?? C.muted;
  const label: Record<string, string> = {
    'vsay-auth': 'vsay-auth',
    'vsay-agent-backend': 'vsay-backend',
    'vsay-terminal': 'vsay-terminal',
  };
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border">
      <span
        className={cn('w-2 h-2 rounded-full flex-shrink-0', snap.status === 'up' ? 'animate-pulse' : '')}
        style={{ backgroundColor: snap.status === 'up' ? col : C.error }}
      />
      <span className="text-sm font-medium">{label[snap.name] ?? snap.name}</span>
      <Badge variant="outline" className={cn('text-xs px-1.5 py-0', snap.status === 'up' ? 'text-success border-success/30 bg-success/10' : 'text-destructive border-destructive/30 bg-destructive/10')}>
        {snap.status === 'up' ? 'UP' : 'DOWN'}
      </Badge>
      {snap.status === 'up' && snap.scrapeMs > 0 && (
        <span className="text-xs text-muted-foreground">{snap.scrapeMs}ms</span>
      )}
    </div>
  );
}

function ChartCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={cn('glass-card', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {children}
      </CardContent>
    </Card>
  );
}

const TICK_STYLE = { fontSize: 10, fill: '#94a3b8' };
const TT_STYLE = { backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 };

function EmptyChart() {
  return (
    <div className="h-[160px] flex items-center justify-center text-muted-foreground text-sm">
      Collecting data… (refreshes every 30s)
    </div>
  );
}

function MultiLineChart({ data, lines }: { data: ChartPoint[]; lines: { key: 'auth' | 'backend' | 'terminal'; color: string; label: string }[] }) {
  if (data.length < 2) return <EmptyChart />;
  return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          {lines.map(l => (
            <linearGradient key={l.key} id={`grad-${l.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={l.color} stopOpacity={0.25} />
              <stop offset="95%" stopColor={l.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
        <XAxis dataKey="time" tick={TICK_STYLE} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis tick={TICK_STYLE} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={TT_STYLE} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {lines.map(l => (
          <Area key={l.key} type="monotone" dataKey={l.key} name={l.label}
            stroke={l.color} strokeWidth={1.5} fill={`url(#grad-${l.key})`} dot={false} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

function SingleAreaChart({ data, color, label, unit = '' }: { data: SingleChart[]; color: string; label: string; unit?: string }) {
  if (data.length < 2) return <EmptyChart />;
  return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id={`grad-single-${label}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
        <XAxis dataKey="time" tick={TICK_STYLE} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis tick={TICK_STYLE} tickLine={false} axisLine={false} unit={unit} />
        <Tooltip contentStyle={TT_STYLE} formatter={(v: number) => [`${v.toFixed(2)}${unit}`, label]} />
        <Area type="monotone" dataKey="value" name={label}
          stroke={color} strokeWidth={1.5} fill={`url(#grad-single-${label})`} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function StackedBarChart({ data, bars }: {
  data: { label: string; [k: string]: number | string }[];
  bars: { key: string; color: string; label: string }[];
}) {
  if (!data.length) return <EmptyChart />;
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
        <XAxis dataKey="label" tick={TICK_STYLE} tickLine={false} axisLine={false} />
        <YAxis tick={TICK_STYLE} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={TT_STYLE} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {bars.map(b => <Bar key={b.key} dataKey={b.key} name={b.label} fill={b.color} radius={[3, 3, 0, 0]} />)}
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Overview tab ──────────────────────────────────────────────────────────────
function OverviewTab({ latest, history }: { latest: MetricsDataPoint; history: MetricsDataPoint[] }) {
  const reqRateData = buildRateChart(history, s => s.requestsTotal);
  const memData     = buildValueChart(history, s => s.memoryMB);
  const cpuRateData = buildRateChart(history, s => s.cpuSeconds);

  const totalReqs = latest.auth.requestsTotal + latest.backend.requestsTotal + latest.terminal.requestsTotal;
  const totalErrs = latest.auth.requestErrors + latest.backend.requestErrors + latest.terminal.requestErrors;
  const errRate   = totalReqs > 0 ? ((totalErrs / totalReqs) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Requests" value={fmt(totalReqs)} sub="all services" icon={Activity} color="text-primary" />
        <StatCard label="Error Rate" value={`${errRate}%`} sub={`${fmt(totalErrs)} errors`} icon={AlertTriangle} color={Number(errRate) > 5 ? 'text-destructive' : 'text-success'} />
        <StatCard label="Active gRPC" value={String(latest.backend.grpcActive)} sub="agent connections" icon={Wifi} color="text-purple-400" />
        <StatCard label="Terminal Sessions" value={String(latest.backend.terminalSessionsActive)} sub="open sessions" icon={Terminal} color="text-amber-400" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <ChartCard title="HTTP Request Rate (req/s) — all services">
          <MultiLineChart data={reqRateData} lines={[
            { key: 'auth', color: C.auth, label: 'auth' },
            { key: 'backend', color: C.backend, label: 'backend' },
            { key: 'terminal', color: C.terminal, label: 'terminal' },
          ]} />
        </ChartCard>
        <ChartCard title="Memory Usage (MB) — all services">
          <MultiLineChart data={memData} lines={[
            { key: 'auth', color: C.auth, label: 'auth' },
            { key: 'backend', color: C.backend, label: 'backend' },
            { key: 'terminal', color: C.terminal, label: 'terminal' },
          ]} />
        </ChartCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <ChartCard title="CPU Usage Rate (cores/s) — all services">
          <MultiLineChart data={cpuRateData} lines={[
            { key: 'auth', color: C.auth, label: 'auth' },
            { key: 'backend', color: C.backend, label: 'backend' },
            { key: 'terminal', color: C.terminal, label: 'terminal' },
          ]} />
        </ChartCard>

        <ChartCard title="Business Metrics Snapshot">
          <StackedBarChart
            data={[
              { label: 'Heartbeats', value: latest.backend.heartbeats },
              { label: 'gRPC Total', value: latest.backend.grpcTotal },
              { label: 'Cert Signs', value: latest.backend.certSignsSuccess + latest.backend.certSignsFailed },
              { label: 'JWT Valid', value: latest.auth.jwtSuccess },
              { label: 'Logins', value: latest.auth.loginSuccess + latest.auth.loginFailure },
            ].map(d => ({ label: d.label, count: d.value }))}
            bars={[{ key: 'count', color: C.auth, label: 'count' }]}
          />
        </ChartCard>
      </div>
    </div>
  );
}

// ── Auth tab ──────────────────────────────────────────────────────────────────
function AuthTab({ latest, history }: { latest: MetricsDataPoint; history: MetricsDataPoint[] }) {
  const s = latest.auth;
  const reqRateData = buildRateChart(history, svc => svc.requestsTotal);
  const memData     = buildSingle(history, p => p.auth.memoryMB);
  const errRate     = s.requestsTotal > 0 ? ((s.requestErrors / s.requestsTotal) * 100).toFixed(1) : '0';

  const loginBar = [
    { label: 'Success', success: s.loginSuccess, failure: 0 },
    { label: 'Failure', success: 0, failure: s.loginFailure },
  ];
  const jwtBar = [
    { label: 'Valid', valid: s.jwtSuccess, expired: 0, failed: 0 },
    { label: 'Expired', valid: 0, expired: s.jwtExpired, failed: 0 },
    { label: 'Failed', valid: 0, expired: 0, failed: s.jwtFailed },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Requests" value={fmt(s.requestsTotal)} sub={`${s.requestsInFlight} in-flight`} icon={Activity} color="text-cyan-400" />
        <StatCard label="Error Rate" value={`${errRate}%`} sub={`${s.requestErrors} errors`} icon={AlertTriangle} color={Number(errRate) > 5 ? 'text-destructive' : 'text-success'} />
        <StatCard label="Avg Latency" value={fmtMs(s.avgLatencyMs)} sub="HTTP avg" icon={Clock} color="text-cyan-400" />
        <StatCard label="Memory" value={fmtMB(s.memoryMB)} sub={`${s.goroutines} goroutines`} icon={MemoryStick} color="text-cyan-400" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <ChartCard title="Request Rate (req/s)">
          <SingleAreaChart data={buildSingle(history, p => {
            if (history.indexOf(p) === 0) return 0;
            const prev = history[history.indexOf(p) - 1];
            const dt = (p.timestamp - prev.timestamp) / 1000;
            return dt > 0 ? Math.max(0, (p.auth.requestsTotal - prev.auth.requestsTotal) / dt) : 0;
          })} color={C.auth} label="req/s" unit="/s" />
        </ChartCard>
        <ChartCard title="Memory Usage (MB)">
          <SingleAreaChart data={memData} color={C.auth} label="MB" unit=" MB" />
        </ChartCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <ChartCard title="Login Attempts">
          <StackedBarChart data={loginBar} bars={[
            { key: 'success', color: C.success, label: 'Success' },
            { key: 'failure', color: C.error,   label: 'Failure' },
          ]} />
        </ChartCard>
        <ChartCard title="JWT Validations">
          <StackedBarChart data={jwtBar} bars={[
            { key: 'valid',   color: C.success,  label: 'Valid'   },
            { key: 'expired', color: C.warning,  label: 'Expired' },
            { key: 'failed',  color: C.error,    label: 'Failed'  },
          ]} />
        </ChartCard>
      </div>

      {/* Totals table */}
      <Card className="glass-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Auth Metrics Summary</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'Login Success', value: s.loginSuccess, icon: CheckCircle2, color: 'text-success' },
              { label: 'Login Failure', value: s.loginFailure, icon: XCircle,      color: 'text-destructive' },
              { label: 'JWT Valid',     value: s.jwtSuccess,   icon: Key,          color: 'text-success' },
              { label: 'JWT Expired',   value: s.jwtExpired,   icon: Clock,        color: 'text-warning'  },
              { label: 'JWT Failed',    value: s.jwtFailed,    icon: XCircle,      color: 'text-destructive' },
              { label: 'Goroutines',    value: s.goroutines,   icon: Cpu,          color: 'text-cyan-400' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                <Icon className={cn('w-4 h-4 flex-shrink-0', color)} />
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-semibold">{fmt(value)}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Backend tab ───────────────────────────────────────────────────────────────
function BackendTab({ latest, history }: { latest: MetricsDataPoint; history: MetricsDataPoint[] }) {
  const s = latest.backend;
  const grpcData    = buildSingle(history, p => p.backend.grpcActive);
  const memData     = buildSingle(history, p => p.backend.memoryMB);
  const hbRateData  = buildSingle(history, p => {
    const i = history.indexOf(p);
    if (i === 0) return 0;
    const prev = history[i - 1];
    const dt = (p.timestamp - prev.timestamp) / 1000;
    return dt > 0 ? Math.max(0, (p.backend.heartbeats - prev.backend.heartbeats) / dt) : 0;
  });
  const errRate = s.requestsTotal > 0 ? ((s.requestErrors / s.requestsTotal) * 100).toFixed(1) : '0';

  const certBar = [
    { label: 'Success', success: s.certSignsSuccess, failed: 0 },
    { label: 'Failed',  success: 0, failed: s.certSignsFailed  },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total HTTP Reqs" value={fmt(s.requestsTotal)} sub={`${errRate}% error rate`} icon={Activity} color="text-purple-400" />
        <StatCard label="Active gRPC" value={String(s.grpcActive)} sub={`${fmt(s.grpcTotal)} total`} icon={Wifi} color="text-purple-400" />
        <StatCard label="Heartbeats" value={fmt(s.heartbeats)} sub="total received" icon={Radio} color="text-purple-400" />
        <StatCard label="Cert Signs" value={fmt(s.certSignsSuccess)} sub={`${s.certSignsFailed} failed`} icon={Shield} color={s.certSignsFailed > 0 ? 'text-warning' : 'text-success'} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <ChartCard title="Active gRPC Connections">
          <SingleAreaChart data={grpcData} color={C.backend} label="connections" />
        </ChartCard>
        <ChartCard title="Memory Usage (MB)">
          <SingleAreaChart data={memData} color={C.backend} label="MB" unit=" MB" />
        </ChartCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <ChartCard title="Heartbeat Rate (per sec)">
          <SingleAreaChart data={hbRateData} color={C.backend} label="hb/s" unit="/s" />
        </ChartCard>
        <ChartCard title="Certificate Signs">
          <StackedBarChart data={certBar} bars={[
            { key: 'success', color: C.success, label: 'Success' },
            { key: 'failed',  color: C.error,   label: 'Failed'  },
          ]} />
        </ChartCard>
      </div>

      <Card className="glass-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Backend Metrics Summary</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'gRPC Active',      value: s.grpcActive,            icon: Wifi,         color: 'text-purple-400' },
              { label: 'gRPC Total',       value: s.grpcTotal,             icon: ArrowUpRight,  color: 'text-purple-400' },
              { label: 'Heartbeats',       value: s.heartbeats,            icon: Radio,         color: 'text-purple-400' },
              { label: 'Cert Signs OK',    value: s.certSignsSuccess,      icon: CheckCircle2,  color: 'text-success'    },
              { label: 'Cert Signs Fail',  value: s.certSignsFailed,       icon: XCircle,       color: 'text-destructive' },
              { label: 'Terminal Sessions',value: s.terminalSessionsActive,icon: Terminal,      color: 'text-purple-400' },
              { label: 'Goroutines',       value: s.goroutines,            icon: Cpu,           color: 'text-purple-400' },
              { label: 'In-Flight Reqs',   value: s.requestsInFlight,      icon: Zap,           color: 'text-purple-400' },
              { label: 'Memory',           value: s.memoryMB,              icon: MemoryStick,   color: 'text-purple-400', isFloat: true },
            ].map(({ label, value, icon: Icon, color, isFloat }) => (
              <div key={label} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                <Icon className={cn('w-4 h-4 flex-shrink-0', color)} />
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-semibold">{isFloat ? fmtMB(value) : fmt(value)}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Terminal tab ──────────────────────────────────────────────────────────────
function TerminalTab({ latest, history }: { latest: MetricsDataPoint; history: MetricsDataPoint[] }) {
  const s = latest.terminal;
  const heapData  = buildSingle(history, p => p.terminal.heapUsedMB);
  const memData   = buildSingle(history, p => p.terminal.memoryMB);
  const lagData   = buildSingle(history, p => p.terminal.eventLoopLagMs);
  const reqData   = buildSingle(history, p => {
    const i = history.indexOf(p);
    if (i === 0) return 0;
    const prev = history[i - 1];
    const dt = (p.timestamp - prev.timestamp) / 1000;
    return dt > 0 ? Math.max(0, (p.terminal.requestsTotal - prev.terminal.requestsTotal) / dt) : 0;
  });
  const errRate = s.requestsTotal > 0 ? ((s.requestErrors / s.requestsTotal) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total API Reqs" value={fmt(s.requestsTotal)} sub={`${errRate}% error rate`} icon={Activity} color="text-amber-400" />
        <StatCard label="Heap Used" value={fmtMB(s.heapUsedMB)} sub="Node.js heap" icon={Server} color="text-amber-400" />
        <StatCard label="Resident Mem" value={fmtMB(s.memoryMB)} sub="process RSS" icon={MemoryStick} color="text-amber-400" />
        <StatCard label="Event Loop Lag" value={fmtMs(s.eventLoopLagMs)} sub="avg lag" icon={Clock} color={s.eventLoopLagMs > 100 ? 'text-warning' : 'text-success'} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <ChartCard title="Heap Used (MB)">
          <SingleAreaChart data={heapData} color={C.terminal} label="MB" unit=" MB" />
        </ChartCard>
        <ChartCard title="Resident Memory (MB)">
          <SingleAreaChart data={memData} color={C.terminal} label="MB" unit=" MB" />
        </ChartCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <ChartCard title="API Request Rate (req/s)">
          <SingleAreaChart data={reqData} color={C.terminal} label="req/s" unit="/s" />
        </ChartCard>
        <ChartCard title="Event Loop Lag (ms)">
          <SingleAreaChart data={lagData} color={s.eventLoopLagMs > 100 ? C.error : C.terminal} label="ms" unit="ms" />
        </ChartCard>
      </div>

      <Card className="glass-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Terminal Service Summary</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'API Requests',  value: s.requestsTotal,    icon: Activity,  color: 'text-amber-400', isFloat: false },
              { label: 'Errors',        value: s.requestErrors,    icon: XCircle,   color: 'text-destructive', isFloat: false },
              { label: 'In-Flight',     value: s.requestsInFlight, icon: Zap,       color: 'text-amber-400', isFloat: false },
              { label: 'WS Active',     value: s.wsActive,         icon: Wifi,      color: 'text-amber-400', isFloat: false },
              { label: 'WS Total',      value: s.wsTotal,          icon: Radio,     color: 'text-amber-400', isFloat: false },
              { label: 'Avg Latency',   value: s.avgLatencyMs,     icon: Clock,     color: 'text-amber-400', isFloat: true, fmtFn: fmtMs },
            ].map(({ label, value, icon: Icon, color, isFloat, fmtFn }) => (
              <div key={label} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                <Icon className={cn('w-4 h-4 flex-shrink-0', color)} />
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-semibold">{fmtFn ? fmtFn(value) : isFloat ? fmtMB(value) : fmt(value)}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function MetricsPage() {
  const [data, setData] = useState<{ latest: MetricsDataPoint; history: MetricsDataPoint[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/internal/metrics-data', { cache: 'no-store' });
      if (!res.ok) throw new Error('metrics fetch failed');
      const json = await res.json();
      setData(json);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('metrics error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(fetchData, 30_000);
    return () => clearInterval(id);
  }, [autoRefresh, fetchData]);

  if (loading) {
    return (
      <div className="animate-fade-in">
        <Breadcrumb items={[{ label: 'Metrics' }]} className="mb-6" />
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const latest = data?.latest;
  const history = data?.history ?? [];

  return (
    <div className="animate-fade-in">
      <Breadcrumb items={[{ label: 'Metrics' }]} className="mb-6" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-primary" />
            Observability
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time metrics from all services
            {lastUpdated && (
              <span className="ml-2 text-xs">
                · Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(v => !v)}
            className={cn(autoRefresh && 'border-primary text-primary')}
          >
            <Radio className="w-4 h-4 mr-1.5" />
            {autoRefresh ? 'Auto ON' : 'Auto OFF'}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={refreshing}>
            <RefreshCw className={cn('w-4 h-4 mr-1.5', refreshing && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Service health pills */}
      {latest && (
        <div className="flex flex-wrap gap-2 mb-6">
          <ServicePill snap={latest.auth} />
          <ServicePill snap={latest.backend} />
          <ServicePill snap={latest.terminal} />
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-card border border-border text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            {history.length} snapshots · {Math.round((history.length * 30) / 60)}m window
          </div>
        </div>
      )}

      {!latest ? (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <BarChart2 className="w-12 h-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">No metrics data yet — click Refresh to load</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="overview">
          <TabsList className="mb-4 flex-wrap h-auto gap-1">
            <TabsTrigger value="overview" className="gap-1.5">
              <Activity className="w-3.5 h-3.5" /> Overview
            </TabsTrigger>
            <TabsTrigger value="auth" className="gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: C.auth }} />
              vsay-auth
              {latest.auth.status === 'down' && <XCircle className="w-3 h-3 text-destructive" />}
            </TabsTrigger>
            <TabsTrigger value="backend" className="gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: C.backend }} />
              vsay-backend
              {latest.backend.status === 'down' && <XCircle className="w-3 h-3 text-destructive" />}
            </TabsTrigger>
            <TabsTrigger value="terminal" className="gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: C.terminal }} />
              vsay-terminal
              {latest.terminal.status === 'down' && <XCircle className="w-3 h-3 text-destructive" />}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab latest={latest} history={history} />
          </TabsContent>
          <TabsContent value="auth">
            {latest.auth.status === 'down' ? (
              <Card className="glass-card"><CardContent className="flex items-center gap-3 py-8 justify-center text-destructive">
                <XCircle className="w-5 h-5" /> vsay-auth is unreachable — check METRICS_AUTH_URL
              </CardContent></Card>
            ) : (
              <AuthTab latest={latest} history={history} />
            )}
          </TabsContent>
          <TabsContent value="backend">
            {latest.backend.status === 'down' ? (
              <Card className="glass-card"><CardContent className="flex items-center gap-3 py-8 justify-center text-destructive">
                <XCircle className="w-5 h-5" /> vsay-agent-backend is unreachable — check METRICS_BACKEND_URL
              </CardContent></Card>
            ) : (
              <BackendTab latest={latest} history={history} />
            )}
          </TabsContent>
          <TabsContent value="terminal">
            <TerminalTab latest={latest} history={history} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
