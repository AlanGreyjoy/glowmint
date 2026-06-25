import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

import { GlassSurface } from './GlassSurface';

interface SectionCardProps {
  title: string;
  headerRight?: ReactNode;
  fillHeight?: boolean;
  children: ReactNode;
  className?: string;
}

export function SectionCard({
  title,
  headerRight,
  fillHeight,
  children,
  className,
}: SectionCardProps) {
  return (
    <GlassSurface variant="panel" className={cn('p-4', fillHeight && 'h-full', className)}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-white drop-shadow-sm">{title}</h2>
        {headerRight}
      </div>
      {children}
    </GlassSurface>
  );
}
