import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

import { GlassSurface } from './GlassSurface';

type MetricTone = 'cyan' | 'emerald' | 'violet' | 'amber' | 'rose';

const toneClasses: Record<
  MetricTone,
  {
    icon: string;
    glow: string;
    meter: string;
  }
> = {
  cyan: {
    icon: 'bg-teal-300/18 text-teal-50',
    glow: 'from-teal-300/24',
    meter: 'bg-teal-200/80',
  },
  emerald: {
    icon: 'bg-emerald-300/18 text-emerald-50',
    glow: 'from-emerald-300/24',
    meter: 'bg-emerald-200/80',
  },
  violet: {
    icon: 'bg-green-300/18 text-green-50',
    glow: 'from-green-300/24',
    meter: 'bg-green-200/80',
  },
  amber: {
    icon: 'bg-amber-300/18 text-amber-50',
    glow: 'from-amber-300/24',
    meter: 'bg-amber-200/80',
  },
  rose: {
    icon: 'bg-rose-300/18 text-rose-50',
    glow: 'from-rose-300/24',
    meter: 'bg-rose-200/80',
  },
};

interface MetricCardProps {
  label: string;
  value: ReactNode;
  unit?: string;
  detail?: ReactNode;
  icon: LucideIcon;
  tone?: MetricTone;
  progress?: number | null;
  className?: string;
}

export function MetricCard({
  label,
  value,
  unit,
  detail,
  icon: Icon,
  tone = 'cyan',
  progress,
  className,
}: MetricCardProps) {
  const clampedProgress = progress == null ? null : Math.max(0, Math.min(100, progress));
  const toneClass = toneClasses[tone];

  return (
    <GlassSurface
      variant="panel"
      className={cn('relative min-h-36 overflow-hidden p-4', className)}
    >
      <div
        aria-hidden
        className={cn(
          'absolute -right-10 -top-10 size-32 rounded-full bg-linear-to-br to-transparent blur-2xl',
          toneClass.glow,
        )}
      />
      <div className="relative flex h-full flex-col justify-between gap-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-white/54">{label}</p>
            <div className="mt-3 flex items-baseline gap-2">
              <p className="text-4xl font-semibold leading-none tracking-tight text-white drop-shadow-sm">
                {value}
              </p>
              {unit ? <span className="text-sm font-medium text-white/58">{unit}</span> : null}
            </div>
          </div>
          <div
            className={cn(
              'flex size-11 shrink-0 items-center justify-center rounded-full',
              toneClass.icon,
            )}
          >
            <Icon size={20} />
          </div>
        </div>

        <div className="space-y-2">
          {detail ? <p className="text-sm text-white/64">{detail}</p> : null}
          {clampedProgress == null ? null : (
            <div className="h-1.5 overflow-hidden rounded-full bg-white/14">
              <div
                className={cn('h-full rounded-full transition-all duration-300', toneClass.meter)}
                style={{ width: `${clampedProgress}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </GlassSurface>
  );
}
