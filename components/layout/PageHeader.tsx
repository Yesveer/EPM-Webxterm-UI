'use client';

import { cn } from '@/lib/utils';

/** The top of a page: what it is on the left, what you can do to it on the right.
 *
 *  One component rather than a hand-built row per page, for the reason
 *  TabHeader exists one level down — built separately, the primary button
 *  lands at a different height on every page, and the description gets
 *  dropped on the pages where somebody was in a hurry.
 *
 *  The title is an <h1>: it is the page's heading, and it is the first thing a
 *  screen reader looks for when somebody asks "where am I".
 */
export function PageHeader({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-6 flex flex-wrap items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {/* Its own flex row, so two or three buttons stay together on the right
          rather than spreading across the gap. */}
      {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}
