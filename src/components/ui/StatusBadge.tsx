import { cn, statusBadgeColor } from '@/lib/utils';

import { Badge } from './badge';

interface StatusBadgeProps {
  status: string;
  label?: string;
  className?: string;
}

const statusStyles = {
  green: 'bg-emerald-300/20 text-emerald-50 shadow-[0_8px_22px_rgba(16,185,129,0.12)]',
  yellow: 'bg-yellow-300/20 text-yellow-50 shadow-[0_8px_22px_rgba(234,179,8,0.12)]',
  red: 'bg-rose-400/22 text-rose-50 shadow-[0_8px_22px_rgba(244,63,94,0.12)]',
  gray: 'bg-white/14 text-white/72 shadow-[0_8px_22px_rgba(255,255,255,0.08)]',
} as const;

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const tone = statusBadgeColor(status);

  return (
    <Badge variant="outline" className={cn(statusStyles[tone], className)}>
      {label ?? status}
    </Badge>
  );
}
