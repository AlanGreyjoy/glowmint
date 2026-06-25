import { useCallback, useEffect, useState } from 'react';
import { Box, Button, Group, Stack, Text } from '@mantine/core';

import { EmptyState, GlassSurface, PageHeader } from '../components/ui';
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
      <Box px="lg" py="md">
        <PageHeader
          title="Welcome to Glowmint"
          description="Let's get your Corsair gear working on Linux — we'll check what's installed and what still needs setup."
        />
      </Box>

      <Box flex={1} p="lg" style={{ overflow: 'auto' }}>
        <Box maw={1100} mx="auto">
          {report ? (
            <SetupChecklist
              report={report}
              message={message}
              onRefresh={refresh}
              onMessage={setMessage}
              refreshing={refreshing}
              layout="grid"
              showRefreshButton={false}
            />
          ) : (
            <EmptyState message="" loading loadingMessage="Running system checks…" />
          )}
        </Box>
      </Box>

      <GlassSurface variant="bar" className="glowmint-glass-footer" p="md" px="lg" radius={0}>
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
      </GlassSurface>
    </Stack>
  );
}
