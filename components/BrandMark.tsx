'use client';

import { Terminal } from 'lucide-react';
import { useBranding } from '@/contexts/BrandingContext';
import { cn } from '@/lib/utils';

interface BrandMarkProps {
  iconBoxClassName?: string;
  iconClassName?: string;
  logoSizeClassName?: string;
  textClassName?: string;
  textWrapperClassName?: string;
}

// Renders the product mark (logo + name) from the org's branding config, set by a
// super admin in Settings → Theme Configuration. Falls back to the default
// WebXterm terminal icon + name when nothing has been customized yet.
export function BrandMark({
  iconBoxClassName = 'w-10 h-10 rounded-xl bg-primary text-primary-foreground',
  iconClassName = 'w-6 h-6',
  // A custom logo has no surrounding box, so it needs its own size — matching
  // iconBoxClassName's footprint, not iconClassName's (much smaller) glyph
  // size. Without this, an uploaded logo rendered at iconClassName's size
  // looked tiny wherever the fallback icon otherwise sits inside a bigger box
  // (e.g. the sidebar's 16px glyph vs. its 32px box).
  logoSizeClassName = 'w-10 h-10',
  textClassName = 'text-2xl font-bold tracking-tight',
  textWrapperClassName,
}: BrandMarkProps) {
  const { branding } = useBranding();

  const icon = branding.logo_url ? (
    <img
      src={branding.logo_url}
      alt={`${branding.name_part1}${branding.name_part2}`}
      className={cn(logoSizeClassName, 'object-contain shrink-0')}
    />
  ) : (
    <div className={cn('flex items-center justify-center shrink-0', iconBoxClassName)}>
      <Terminal className={iconClassName} />
    </div>
  );

  // Neither part takes a custom colour: Part 1 inherits the surrounding text
  // colour, Part 2 always tracks the active theme accent colour.
  const name = (
    <span className={cn(textClassName, 'truncate')}>
      <span>{branding.name_part1}</span>
      <span className="text-primary">{branding.name_part2}</span>
    </span>
  );

  return (
    <>
      {icon}
      {textWrapperClassName ? <div className={textWrapperClassName}>{name}</div> : name}
    </>
  );
}
