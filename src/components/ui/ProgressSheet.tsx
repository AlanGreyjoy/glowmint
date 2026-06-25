import { createPortal } from 'react-dom';
import { Center, Loader, Stack, Text, Title } from '@mantine/core';

import { GlassSurface } from './GlassSurface';

interface ProgressSheetProps {
  opened: boolean;
  title: string;
  message: string;
}

export function ProgressSheet({ opened, title, message }: ProgressSheetProps) {
  if (!opened || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <Center
      pos="fixed"
      inset={0}
      style={{
        zIndex: 10000,
        background: 'rgba(8, 10, 14, 0.72)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      <GlassSurface variant="panel" p="xl" maw={440} w="min(90vw, 440px)">
        <Stack align="center" gap="lg">
          <Loader color="cyan" size="lg" type="dots" />
          <Stack align="center" gap="xs">
            <Title order={3} ta="center">
              {title}
            </Title>
            <Text size="sm" c="dimmed" ta="center" style={{ whiteSpace: 'pre-wrap' }}>
              {message}
            </Text>
          </Stack>
        </Stack>
      </GlassSurface>
    </Center>,
    document.body,
  );
}
