'use client';

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Numbered pagination.
 *
 *  Prev/Next alone tells you nothing about where you are or how far it goes,
 *  and reaching page 14 means clicking fourteen times. Numbers give both the
 *  position and a way to jump. */
export function PaginationBar({
  page,
  totalPages,
  total,
  onPageChange,
  label = 'items',
}: {
  page: number;
  totalPages: number;
  total?: number;
  onPageChange: (page: number) => void;
  label?: string;
}) {
  if (totalPages <= 1) {
    // One page needs no controls, but the count is still worth stating.
    return total !== undefined ? (
      <p className="text-sm text-muted-foreground">
        {total} {label}
      </p>
    ) : null;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">
        {total !== undefined ? `${total} ${label} · ` : ''}
        Page {page} of {totalPages}
      </p>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={page <= 1}
          onClick={() => onPageChange(1)}
          aria-label="First page"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {pageNumbers(page, totalPages).map((p, i) =>
          p === null ? (
            <span key={`gap-${i}`} className="px-1 text-sm text-muted-foreground">
              …
            </span>
          ) : (
            <Button
              key={p}
              variant={p === page ? 'default' : 'outline'}
              size="icon"
              className={cn('h-8 w-8 text-sm', p === page && 'pointer-events-none')}
              onClick={() => onPageChange(p)}
              aria-label={`Page ${p}`}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </Button>
          ),
        )}

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={page >= totalPages}
          onClick={() => onPageChange(totalPages)}
          aria-label="Last page"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/** The page numbers to show, with null marking a gap.
 *
 *  Always first and last, plus a window around the current page. A tenant with
 *  forty pages would otherwise render forty buttons and wrap the row. */
function pageNumbers(page: number, totalPages: number): (number | null)[] {
  const window = 1; // pages either side of the current one
  const pages = new Set<number>([1, totalPages, page]);

  for (let i = 1; i <= window; i++) {
    if (page - i >= 1) pages.add(page - i);
    if (page + i <= totalPages) pages.add(page + i);
  }

  // Near an end, extend the other way so the row keeps a steady width instead
  // of shrinking on the first and last pages.
  if (page <= 2) {
    for (let p = 1; p <= Math.min(4, totalPages); p++) pages.add(p);
  }
  if (page >= totalPages - 1) {
    for (let p = Math.max(1, totalPages - 3); p <= totalPages; p++) pages.add(p);
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const out: (number | null)[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) out.push(null);
    out.push(sorted[i]);
  }
  return out;
}
