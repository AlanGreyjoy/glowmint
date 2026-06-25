import { Text } from '@mantine/core';

interface EmptyStateProps {
  message: string;
  loading?: boolean;
  loadingMessage?: string;
}

export function EmptyState({ message, loading, loadingMessage = 'Loading…' }: EmptyStateProps) {
  return (
    <Text size="sm" c="dimmed">
      {loading ? loadingMessage : message}
    </Text>
  );
}
