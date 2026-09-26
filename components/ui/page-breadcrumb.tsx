'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBreadcrumbContext } from '@/contexts/BreadcrumbContext';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

// Rendered inside the Header by BreadcrumbDisplay — this component just registers items.
export function Breadcrumb({ items }: BreadcrumbProps) {
  const { setItems } = useBreadcrumbContext();

  useEffect(() => {
    setItems(items);
    return () => setItems([]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(items)]);

  return null;
}

// Rendered inside the Header
export function BreadcrumbDisplay({ className }: { className?: string }) {
  const { items } = useBreadcrumbContext();

  return (
    <nav className={cn('flex items-center text-sm', className)}>
      <Link
        href="/dashboard"
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        <Home className="w-4 h-4" />
      </Link>

      {items.map((item, index) => (
        <div key={index} className="flex items-center">
          <ChevronRight className="w-4 h-4 mx-2 text-muted-foreground" />
          {item.href && index < items.length - 1 ? (
            <Link
              href={item.href}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}
