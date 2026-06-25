import { useCallback, useEffect, useState } from 'react';
import { Button, Group, Stack, Text, Title } from '@mantine/core';

import { SetupChecklist } from '../features/setup/SetupChecklist';
import { api } from '../lib/api';
import type { SetupReport } from '../lib/types';

interface WelcomePageProps {
  onComplete: (skipped: boolean) => void;
}

export function WelcomePage({ onComplete }: WelcomePageProps) {
  const [report, setReport] = useState<SetupReport | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const next = await api.runSetupChecks();
      setReport(next);
    } catch (err) {
      setMessage(String(err));
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
      setMessage(String(err));
    }
  };

  const handleSkip = async () => {
    try {
      await api.completeOnboarding(true);
      onComplete(true);
    } catch (err) {
      setMessage(String(err));
    }
  };

  return (
    <Stack mih="100vh" gap={0}>
      <div style={{ borderBottom: '1px solid var(--mantine-color-dark-4)', padding: '16px 24px' }}>
        <Title order={2} c="cyan.3">
          Welcome to Glowmint
        </Title>
        <Text size="sm" c="dimmed">
          Let&apos;s get your Corsair gear working on Linux — we&apos;ll check what&apos;s installed
          and what still needs setup.
        </Text>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        <div style={{ maxWidth: 768, margin: '0 auto' }}>
          {report ? (
            <SetupChecklist
              report={report}
              message={message}
              onRefresh={() => void refresh()}
              onMessage={setMessage}
              refreshing={refreshing}
            />
          ) : (
            <Text size="sm" c="dimmed">
              Running system checks…
            </Text>
          )}
        </div>
      </div>

      <div
        style={{
          borderTop: '1px solid var(--mantine-color-dark-4)',
          padding: '16px 24px',
        }}
      >
        <Group justify="space-between">
          <Button variant="light" onClick={() => void handleSkip()}>
            Skip for now
          </Button>
          <Group>
            <Button variant="light" onClick={() => void refresh()} disabled={refreshing}>
              Re-check
            </Button>
            <Button onClick={() => void handleContinue()} disabled={!report?.all_required_pass}>
              Continue to Glowmint
            </Button>
          </Group>
        </Group>
        {report && !report.all_required_pass ? (
          <Text size="xs" c="dimmed" ta="center" mt="sm">
            Fix required items above, or skip to explore the app with limited functionality.
          </Text>
        ) : null}
      </div>
    </Stack>
  );
}
