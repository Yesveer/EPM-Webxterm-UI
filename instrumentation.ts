// Next.js server instrumentation hook — runs once on server startup.
// Importing lib/metrics initialises collectDefaultMetrics (CPU, memory, GC, event-loop).
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./lib/metrics');
  }
}
