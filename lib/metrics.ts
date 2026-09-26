import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

// Use a global singleton so Hot Module Replacement doesn't re-register metrics.
const globalForMetrics = globalThis as typeof globalThis & {
  _vsayMetricsRegistry?: Registry;
  _vsayMetrics?: ReturnType<typeof createMetrics>;
};

function createMetrics() {
  const registry = new Registry();

  collectDefaultMetrics({ register: registry, prefix: 'vsay_terminal_' });

  const httpRequestsTotal = new Counter({
    name: 'vsay_terminal_http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'path', 'status_code'] as const,
    registers: [registry],
  });

  const httpRequestDuration = new Histogram({
    name: 'vsay_terminal_http_request_duration_seconds',
    help: 'HTTP request latency in seconds',
    labelNames: ['method', 'path'] as const,
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    registers: [registry],
  });

  const httpRequestsInFlight = new Gauge({
    name: 'vsay_terminal_http_requests_in_flight',
    help: 'Number of HTTP requests currently being processed',
    registers: [registry],
  });

  const wsConnectionsActive = new Gauge({
    name: 'vsay_terminal_ws_connections_active',
    help: 'Number of active WebSocket terminal sessions',
    registers: [registry],
  });

  const wsConnectionsTotal = new Counter({
    name: 'vsay_terminal_ws_connections_total',
    help: 'Total WebSocket terminal sessions opened',
    registers: [registry],
  });

  const buildInfo = new Gauge({
    name: 'vsay_terminal_build_info',
    help: 'Build information',
    labelNames: ['service', 'node_version'] as const,
    registers: [registry],
  });

  buildInfo.labels('vsay-terminal-next', process.version).set(1);

  return {
    registry,
    httpRequestsTotal,
    httpRequestDuration,
    httpRequestsInFlight,
    wsConnectionsActive,
    wsConnectionsTotal,
    buildInfo,
  };
}

if (!globalForMetrics._vsayMetricsRegistry) {
  const m = createMetrics();
  globalForMetrics._vsayMetricsRegistry = m.registry;
  globalForMetrics._vsayMetrics = m;
}

export const metrics = globalForMetrics._vsayMetrics!;
export const registry = globalForMetrics._vsayMetricsRegistry!;
