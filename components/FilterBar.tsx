'use client';

import { ChevronDown } from 'lucide-react';

import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/** One labelled control in a filter row.
 *
 *  Every field gets a label, even an obvious one, because a grid row mixes
 *  labelled and unlabelled controls at different heights — the unlabelled ones
 *  ride up by exactly the height of a label and nothing lines up. */
export function FilterField({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

/** A native select whose arrow is the same icon the rest of the UI uses.
 *
 *  The browser draws its own arrow at its own size and inset, which next to a
 *  lucide icon reads as misaligned. Suppressing it and positioning ours keeps
 *  a row coherent, and `pr-9` leaves room so a long option never runs
 *  underneath it.
 *
 *  Still a native select: it keeps keyboard behaviour, mobile pickers and
 *  accessibility for free, which a div-based menu would have to reimplement.
 *
 *  The height is overridable — `cn` merges Tailwind conflicts — so a dense
 *  form row can pass h-9 without this needing a second variant.
 */
export function SelectInput({
  id,
  value,
  onChange,
  children,
  className,
  'aria-label': ariaLabel,
}: {
  // Carried through so a <Label htmlFor> still finds its control — clicking
  // the label focuses the select, and a screen reader announces the pair.
  id?: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
  'aria-label'?: string;
}) {
  return (
    <div className="relative">
      <select
        id={id}
        aria-label={ariaLabel}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={cn(
          // h-10 matches the Input component's default, which is what the
          // other controls in these rows are.
          'h-10 w-full appearance-none rounded-md border border-input bg-background pl-3 pr-9 text-sm',
          'focus:outline-none focus:ring-1 focus:ring-ring',
          className,
        )}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}
