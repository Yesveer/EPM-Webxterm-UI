import { NextResponse } from 'next/server';
import {
  parsePrometheusText,
  sumMetric,
  getMetric,
  sumMetricWhere,
  avgLatencyMs,
} from '@/lib/prometheus-parser';
import { registry } from '@/lib/metrics';

export const dynamic = 'force-dynamic';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ServiceSnapshot {
  name: string;
  status: 'up' | 'down';
  scrapeMs: number;
  // HTTP
  requestsTotal: number;
  requestErrors: number;
  requestsInFlight: number;
  avgLatencyMs: number;
  // Resources
  memoryMB: number;
  cpuSeconds: number;
  goroutines: number;
  // Auth-specific
  loginSuccess: number;
  loginFailure: number;
  jwtSuccess: number;
  jwtFailed: number;
  jwtExpired: number;
  // Backend-specific
  grpcActive: number;
  grpcTotal: number;
  heartbeats: number;
  certSignsSuccess: number;
  certSignsFailed: number;
  terminalSessionsActive: number;
  // Terminal-specific
  wsActive: number;
  wsTotal: number;
  heapUsedMB: number;
  eventLoopLagMs: number;
}

export interface MetricsDataPoint {
  timestamp: number;
  auth: ServiceSnapshot;
  backend: ServiceSnapshot;
  terminal: ServiceSnapshot;
}

// ── Ring buffer (global singleton, survives HMR) ─────────────────────────────

const HISTORY_MAX = 30;

const g = globalThis as typeof globalThis & {
  _metricsRingBuffer?: MetricsDataPoint[];
};
if (!g._metricsRingBuffer) g._metricsRingBuffer = [];

// ── Helpers ───────────────────────────────────────────────────────────────────

function empty(name: string): ServiceSnapshot {
  return {
    name, status: 'down', scrapeMs: 0,
    requestsTotal: 0, requestErrors: 0, requestsInFlight: 0, avgLatencyMs: 0,
    memoryMB: 0, cpuSeconds: 0, goroutines: 0,
    loginSuccess: 0, loginFailure: 0, jwtSuccess: 0, jwtFailed: 0, jwtExpired: 0,
    grpcActive: 0, grpcTotal: 0, heartbeats: 0,
    certSignsSuccess: 0, certSignsFailed: 0, terminalSessionsActive: 0,
    wsActive: 0, wsTotal: 0, heapUsedMB: 0, eventLoopLagMs: 0,
  };
}

async function fetchText(url: string): Promise<{ text: string; ms: number } | null> {
  const t0 = Date.now();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000), cache: 'no-store' });
    if (!res.ok) return null;
    return { text: await res.text(), ms: Date.now() - t0 };
  } catch {
    return null;
  }
}

// ── Per-service parsers ───────────────────────────────────────────────────────

function parseAuth(text: string, ms: number): ServiceSnapshot {
  const m = parsePrometheusText(text);
  return {
    name: 'vsay-auth', status: 'up', scrapeMs: ms,
    requestsTotal:    sumMetric(m, 'vsay_auth_http_requests_total'),
    requestErrors:    sumMetricWhere(m, 'vsay_auth_http_requests_total', l => (l.status_code ?? '').startsWith('5')),
    requestsInFlight: getMetric(m, 'vsay_auth_http_requests_in_flight'),
    avgLatencyMs:     avgLatencyMs(m, 'vsay_auth_http_request_duration_seconds_sum', 'vsay_auth_http_request_duration_seconds_count'),
    memoryMB:         getMetric(m, 'process_resident_memory_bytes') / 1_048_576,
    cpuSeconds:       getMetric(m, 'process_cpu_seconds_total'),
    goroutines:       getMetric(m, 'go_goroutines'),
    loginSuccess:     getMetric(m, 'vsay_auth_login_attempts_total', { status: 'success', provider: 'local' }),
    loginFailure:     getMetric(m, 'vsay_auth_login_attempts_total', { status: 'failure', provider: 'local' }),
    jwtSuccess:       getMetric(m, 'vsay_auth_jwt_validations_total', { result: 'success' }),
    jwtFailed:        getMetric(m, 'vsay_auth_jwt_validations_total', { result: 'failed' }),
    jwtExpired:       getMetric(m, 'vsay_auth_jwt_validations_total', { result: 'expired' }),
    // unused for this service
    grpcActive: 0, grpcTotal: 0, heartbeats: 0,
    certSignsSuccess: 0, certSignsFailed: 0, terminalSessionsActive: 0,
    wsActive: 0, wsTotal: 0, heapUsedMB: 0, eventLoopLagMs: 0,
  };
}

function parseBackend(text: string, ms: number): ServiceSnapshot {
  const m = parsePrometheusText(text);
  return {
    name: 'vsay-agent-backend', status: 'up', scrapeMs: ms,
    requestsTotal:    sumMetric(m, 'vsay_agent_http_requests_total'),
    requestErrors:    sumMetricWhere(m, 'vsay_agent_http_requests_total', l => (l.status_code ?? '').startsWith('5')),
    requestsInFlight: getMetric(m, 'vsay_agent_http_requests_in_flight'),
    avgLatencyMs:     avgLatencyMs(m, 'vsay_agent_http_request_duration_seconds_sum', 'vsay_agent_http_request_duration_seconds_count'),
    memoryMB:         getMetric(m, 'process_resident_memory_bytes') / 1_048_576,
    cpuSeconds:       getMetric(m, 'process_cpu_seconds_total'),
    goroutines:       getMetric(m, 'go_goroutines'),
    grpcActive:            getMetric(m, 'vsay_agent_grpc_active_connections'),
    grpcTotal:             getMetric(m, 'vsay_agent_grpc_connections_total'),
    heartbeats:            getMetric(m, 'vsay_agent_heartbeats_total'),
    certSignsSuccess:      getMetric(m, 'vsay_agent_cert_signs_total', { result: 'success' }),
    certSignsFailed:       getMetric(m, 'vsay_agent_cert_signs_total', { result: 'failed' }),
    terminalSessionsActive: getMetric(m, 'vsay_agent_terminal_sessions_active'),
    // unused
    loginSuccess: 0, loginFailure: 0, jwtSuccess: 0, jwtFailed: 0, jwtExpired: 0,
    wsActive: 0, wsTotal: 0, heapUsedMB: 0, eventLoopLagMs: 0,
  };
}

async function parseTerminal(): Promise<ServiceSnapshot> {
  const text = await registry.metrics();
  const m = parsePrometheusText(text);
  return {
    name: 'vsay-terminal', status: 'up', scrapeMs: 0,
    requestsTotal:    sumMetric(m, 'vsay_terminal_http_requests_total'),
    requestErrors:    sumMetricWhere(m, 'vsay_terminal_http_requests_total', l => (l.status_code ?? '').startsWith('5')),
    requestsInFlight: getMetric(m, 'vsay_terminal_http_requests_in_flight'),
    avgLatencyMs:     avgLatencyMs(m, 'vsay_terminal_http_request_duration_seconds_sum', 'vsay_terminal_http_request_duration_seconds_count'),
    memoryMB:         getMetric(m, 'vsay_terminal_process_resident_memory_bytes') / 1_048_576,
    cpuSeconds:       getMetric(m, 'vsay_terminal_process_cpu_seconds_total'),
    goroutines:       0,
    wsActive:         getMetric(m, 'vsay_terminal_ws_connections_active'),
    wsTotal:          getMetric(m, 'vsay_terminal_ws_connections_total'),
    heapUsedMB:       getMetric(m, 'vsay_terminal_nodejs_heap_size_used_bytes') / 1_048_576,
    eventLoopLagMs:   getMetric(m, 'vsay_terminal_nodejs_eventloop_lag_seconds') * 1000,
    // unused
    loginSuccess: 0, loginFailure: 0, jwtSuccess: 0, jwtFailed: 0, jwtExpired: 0,
    grpcActive: 0, grpcTotal: 0, heartbeats: 0,
    certSignsSuccess: 0, certSignsFailed: 0, terminalSessionsActive: 0,
  };
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET() {
  // Server-to-server URLs — use internal/Docker network addresses when set
  const authBase    = process.env.METRICS_AUTH_URL    ?? (process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, '') ?? 'http://localhost:8080');
  const backendBase = process.env.METRICS_BACKEND_URL ?? 'http://localhost:8081';

  const [authRaw, backendRaw, termSnap] = await Promise.all([
    fetchText(`${authBase}/metrics`),
    fetchText(`${backendBase}/metrics`),
    parseTerminal(),
  ]);

  const point: MetricsDataPoint = {
    timestamp: Date.now(),
    auth:     authRaw    ? parseAuth(authRaw.text, authRaw.ms)         : empty('vsay-auth'),
    backend:  backendRaw ? parseBackend(backendRaw.text, backendRaw.ms): empty('vsay-agent-backend'),
    terminal: termSnap,
  };

  const buf = g._metricsRingBuffer!;
  buf.push(point);
  if (buf.length > HISTORY_MAX) buf.shift();

  return NextResponse.json({ latest: point, history: [...buf] });
}
