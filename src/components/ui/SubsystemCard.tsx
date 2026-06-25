import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

import { GlassSurface } from './GlassSurface';

type SubsystemTone = 'cyan' | 'emerald' | 'violet' | 'amber';

const toneClasses: Record<SubsystemTone, string> = {
  cyan: 'bg-teal-300/18 text-teal-50',
  emerald: 'bg-emerald-300/18 text-emerald-50',
  violet: 'bg-green-300/18 text-green-50',
  amber: 'bg-amber-300/18 text-amber-50',
};

interface SubsystemCardProps {
  title: string;
  value: ReactNode;
  description: ReactNode;
  icon: LucideIcon;
  tone?: SubsystemTone;
  badge?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function SubsystemCard({
  title,
  value,
  description,
  icon: Icon,
  tone = 'cyan',
  badge,
  footer,
  className,
}: SubsystemCardProps) {
  return (
    <GlassSurface variant="inset" className={cn('p-4', className)}>
      <div className="flex items-start justify-between gap-4">
        <div
          className={cn(
            'flex size-11 shrink-0 items-center justify-center rounded-full',
            toneClasses[tone],
          )}
        >
          <Icon size={20} />
        </div>
        {badge}
      </div>
      <div className="mt-5">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-white/50">{title}</p>
        <p className="mt-2 text-3xl font-semibold leading-none text-white drop-shadow-sm">
          {value}
        </p>
        <p className="mt-2 text-sm text-white/64">{description}</p>
      </div>
      {footer ? <div className="mt-4">{footer}</div> : null}
    </GlassSurface>
  );
}
