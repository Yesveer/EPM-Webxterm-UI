'use client';

import { BreadcrumbDisplay } from '@/components/ui/page-breadcrumb';

export function Header() {
  return (
    <header className="sticky top-0 z-30 h-14 shrink-0 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="flex items-center h-full px-4 lg:px-6">
        <BreadcrumbDisplay />
      </div>
    </header>
  );
}
