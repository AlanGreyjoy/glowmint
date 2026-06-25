import { useCallback, useEffect, useState } from 'react';

import { api } from '../lib/api';
import type { SetupStatus } from '../lib/types';

export function useSetupGate() {
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await api.getSetupStatus();
      setStatus(next);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const completeWizard = useCallback(
    async (skipped: boolean) => {
      await api.completeOnboarding(skipped);
      await refresh();
    },
    [refresh],
  );

  const reopenWizard = useCallback(async () => {
    await api.resetOnboarding();
    await refresh();
  }, [refresh]);

  return {
    status,
    loading,
    error,
    needsWizard: status?.needs_wizard ?? false,
    showBanner:
      (status?.onboarding_skipped ?? false) && !(status?.report.all_required_pass ?? true),
    refresh,
    completeWizard,
    reopenWizard,
  };
}
