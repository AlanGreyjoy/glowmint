import { Box } from '@mantine/core';

interface PageBackgroundProps {
  seed: string;
}

export function PageBackground({ seed }: PageBackgroundProps) {
  return (
    <>
      <Box
        aria-hidden
        pos="fixed"
        inset={0}
        style={{
          zIndex: 0,
          backgroundImage: `url(https://picsum.photos/seed/${seed}/1920/1080)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <Box
        aria-hidden
        pos="fixed"
        inset={0}
        style={{ zIndex: 0, background: 'rgba(15, 17, 23, 0.42)' }}
      />
    </>
  );
}
