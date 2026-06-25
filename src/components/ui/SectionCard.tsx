import type { ReactNode } from 'react';
import { Group, Title } from '@mantine/core';

import { GlassSurface } from './GlassSurface';

interface SectionCardProps {
  title: string;
  headerRight?: ReactNode;
  fillHeight?: boolean;
  children: ReactNode;
}

export function SectionCard({ title, headerRight, fillHeight, children }: SectionCardProps) {
  return (
    <GlassSurface variant="panel" p="md" h={fillHeight ? '100%' : undefined}>
      <Group justify="space-between" align="center" mb="md">
        <Title order={4}>{title}</Title>
        {headerRight}
      </Group>
      {children}
    </GlassSurface>
  );
}
