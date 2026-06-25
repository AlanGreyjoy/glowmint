import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type GlassVariant = 'panel' | 'inset' | 'bar';

interface GlassSurfaceProps extends HTMLAttributes<HTMLDivElement> {
  variant?: GlassVariant;
  children: ReactNode;
}

export function glassClassName(variant: GlassVariant = 'panel') {
  return `glowmint-glass glowmint-glass--${variant}`;
}

export function glassStyle(variant: GlassVariant = 'panel'): CSSProperties {
  return {
    background: `var(--glowmint-glass-${variant}-bg)`,
    backdropFilter: `var(--glowmint-glass-${variant}-backdrop)`,
    WebkitBackdropFilter: `var(--glowmint-glass-${variant}-backdrop)`,
    boxShadow: `var(--glowmint-glass-${variant}-shadow)`,
  };
}

export function GlassSurface({
  variant = 'panel',
  children,
  className,
  style,
  ...props
}: GlassSurfaceProps) {
  return (
    <div
      className={cn(glassClassName(variant), 'rounded-2xl', className)}
      style={{ ...glassStyle(variant), ...style }}
      {...props}
    >
      {children}
    </div>
  );
}
