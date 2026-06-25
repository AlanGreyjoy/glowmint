import { Spinner } from './Spinner';

interface EmptyStateProps {
  message: string;
  loading?: boolean;
  loadingMessage?: string;
}

export function EmptyState({ message, loading, loadingMessage = 'Loading…' }: EmptyStateProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner size="sm" />
        <span>{loadingMessage}</span>
      </div>
    );
  }

  return <p className="text-sm text-muted-foreground">{message}</p>;
}
