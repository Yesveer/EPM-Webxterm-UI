export interface MetricSample {
  name: string;
  labels: Record<string, string>;
  value: number;
}

export type ParsedMetrics = Record<string, MetricSample[]>;

const LINE_RE =
  /^([a-zA-Z_:][a-zA-Z0-9_:]*)(?:\{([^}]*)\})?\s+([-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?|[+-]?Inf|NaN)(?:\s+\d+)?$/;

export function parsePrometheusText(text: string): ParsedMetrics {
  const result: ParsedMetrics = {};
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = LINE_RE.exec(line);
    if (!m) continue;
    const value = parseFloat(m[3]);
    if (isNaN(value)) continue;
    const labels: Record<string, string> = {};
    if (m[2]) {
      for (const lm of m[2].matchAll(/(\w+)="([^"]*)"/g)) {
        labels[lm[1]] = lm[2];
      }
    }
    const name = m[1];
    if (!result[name]) result[name] = [];
    result[name].push({ name, labels, value });
  }
  return result;
}

export function sumMetric(m: ParsedMetrics, name: string): number {
  return (m[name] ?? []).reduce((s, x) => s + x.value, 0);
}

export function getMetric(
  m: ParsedMetrics,
  name: string,
  labels?: Record<string, string>,
): number {
  const samples = m[name] ?? [];
  if (!labels) return samples[0]?.value ?? 0;
  const match = samples.find(s =>
    Object.entries(labels).every(([k, v]) => s.labels[k] === v),
  );
  return match?.value ?? 0;
}

export function sumMetricWhere(
  m: ParsedMetrics,
  name: string,
  pred: (labels: Record<string, string>) => boolean,
): number {
  return (m[name] ?? []).filter(s => pred(s.labels)).reduce((s, x) => s + x.value, 0);
}

export function avgLatencyMs(m: ParsedMetrics, sumName: string, countName: string): number {
  const total = sumMetric(m, countName);
  if (total === 0) return 0;
  return (sumMetric(m, sumName) / total) * 1000;
}
