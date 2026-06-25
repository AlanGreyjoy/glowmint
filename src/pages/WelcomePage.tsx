import { useCallback, useEffect, useState } from 'react';

import { Button, EmptyState, GlassSurface, PageHeader, toast } from '../components/ui';
import { SetupChecklist } from '../features/setup/SetupChecklist';
import { api } from '../lib/api';
import type { SetupReport } from '../lib/types';

interface WelcomePageProps {
  onComplete: (skipped: boolean) => void;
}

export function WelcomePage({ onComplete }: WelcomePageProps) {
  const [report, setReport] = useState<SetupReport | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const next = await api.runSetupChecks();
      setReport(next);
    } catch (err) {
      toast.error(String(err));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleContinue = async () => {
    try {
      await api.completeOnboarding(false);
      onComplete(false);
    } catch (err) {
      toast.error(String(err));
    }
  };

  const handleSkip = async () => {
    try {
      await api.completeOnboarding(true);
      onComplete(true);
    } catch (err) {
      toast.error(String(err));
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <div className="px-6 py-4">
        <PageHeader
          title="Welcome to Glowmint"
          description="Let's get your Corsair gear working on Linux — we'll check what's installed and what still needs setup."
        />
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-[1100px]">
          {report ? (
            <SetupChecklist
              report={report}
              onRefresh={refresh}
              refreshing={refreshing}
              layout="grid"
              showRefreshButton={false}
            />
          ) : (
            <EmptyState message="" loading loadingMessage="Running system checks…" />
          )}
        </div>
      </div>

      <GlassSurface variant="bar" className="glowmint-glass-footer rounded-none px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="secondary" onClick={() => void handleSkip()}>
            Skip for now
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => void refresh()} disabled={refreshing}>
              Re-check
            </Button>
            <Button onClick={() => void handleContinue()} disabled={!report?.all_required_pass}>
              Continue to Glowmint
            </Button>
          </div>
        </div>
        {report && !report.all_required_pass ? (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Fix required items above, or skip to explore the app with limited functionality.
          </p>
        ) : null}
      </GlassSurface>
    </div>
  );
}
