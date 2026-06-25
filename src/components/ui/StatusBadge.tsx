import { Badge, type BadgeProps } from '@mantine/core';

import { statusBadgeColor } from '../../lib/utils';

interface StatusBadgeProps extends Omit<BadgeProps, 'color' | 'children'> {
  status: string;
  label?: string;
}

export function StatusBadge({ status, label, variant = 'light', ...props }: StatusBadgeProps) {
  return (
    <Badge color={statusBadgeColor(status)} variant={variant} {...props}>
      {label ?? status}
    </Badge>
  );
}
