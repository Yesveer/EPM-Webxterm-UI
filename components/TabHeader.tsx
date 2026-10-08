'use client';

import { Info } from 'lucide-react';

/** One header row per tab: what the tab is for on the left, its actions on the
 *  right.
 *
 *  Shared across pages because the alternative is what happened before — each
 *  tab built its own row, so the primary button landed in a different place
 *  depending on which tab you were on, and one of them had an empty spacer
 *  where the description should have been. */
export function TabHeader({
  description,
  action,
}: {
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
      {/* A flex row of its own, so several buttons stay together on the right
          instead of spreading across the gap. */}
      {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}

/** A full-width explanatory banner.
 *
 *  Always below the header rather than inside it: putting it in the header row
 *  shortens the row the action button sits on, which is exactly how the button
 *  ends up at a different height on different tabs. */
export function InfoBanner({
  title,
  tone = 'info',
  children,
}: {
  title?: string;
  tone?: 'info' | 'warning';
  children: React.ReactNode;
}) {
  // Written out in full rather than interpolated: Tailwind scans source text
  // for class names, so a class assembled at runtime is never generated.
  const box =
    tone === 'warning'
      ? 'border-amber-500/40 bg-amber-500/10'
      : 'border-blue-500/40 bg-blue-500/10';
  const icon = tone === 'warning' ? 'text-amber-500' : 'text-blue-400';

  return (
    <div className={`flex items-start gap-3 rounded-lg border p-4 ${box}`}>
      <Info className={`mt-0.5 h-5 w-5 shrink-0 ${icon}`} />
      <div className="text-sm">
        {title && <p className="font-medium">{title}</p>}
        <div className={title ? 'mt-1 text-muted-foreground' : 'text-muted-foreground'}>
          {children}
        </div>
      </div>
    </div>
  );
}
