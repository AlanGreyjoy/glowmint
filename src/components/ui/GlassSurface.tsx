import type { CSSProperties, ReactNode } from 'react';
import { Paper, type PaperProps } from '@mantine/core';

export type GlassVariant = 'panel' | 'inset' | 'bar';

interface GlassSurfaceProps extends Omit<PaperProps, 'withBorder'> {
  variant?: GlassVariant;
  children: ReactNode;
}

export function glassClassName(variant: GlassVariant = 'panel') {
  return `glowmint-glass glowmint-glass--${variant}`;
}

export function glassStyle(variant: GlassVariant = 'panel'): CSSProperties {
  return {
    background: `var(--glowmint-glass-${variant}-bg)`,
    backdropFilter: `blur(var(--glowmint-glass-${variant}-blur))`,
    WebkitBackdropFilter: `blur(var(--glowmint-glass-${variant}-blur))`,
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
    <Paper
      withBorder={false}
      className={[glassClassName(variant), className].filter(Boolean).join(' ')}
      style={{ ...glassStyle(variant), ...style }}
      {...props}
    >
      {children}
    </Paper>
  );
}
