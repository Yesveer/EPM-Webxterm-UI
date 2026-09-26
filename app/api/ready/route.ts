import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Readiness: verify the upstream auth service is reachable.
// Falls back to "ok" if NEXT_PUBLIC_API_URL is not set (dev mode).
export async function GET() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL;

  if (!apiUrl) {
    return NextResponse.json({ status: 'ok', service: 'vsay-terminal-next' });
  }

  try {
    const res = await fetch(`${apiUrl}/health`, {
      signal: AbortSignal.timeout(3000),
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json(
        { status: 'error', service: 'vsay-terminal-next', detail: `upstream returned ${res.status}` },
        { status: 503 },
      );
    }

    return NextResponse.json({ status: 'ok', service: 'vsay-terminal-next' });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { status: 'error', service: 'vsay-terminal-next', detail },
      { status: 503 },
    );
  }
}
