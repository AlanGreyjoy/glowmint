import { Link } from 'react-router-dom';
import { Alert, Badge, Button, Group, Paper, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { RefreshCw } from 'lucide-react';

import { useDevices } from '../hooks/useDevices';
import { statusBadgeColor } from '../lib/utils';

interface DashboardPageProps {
  showSetupBanner?: boolean;
  onOpenSetup?: () => void;
}

export function DashboardPage({ showSetupBanner, onOpenSetup }: DashboardPageProps) {
  const { devices, health, loading, error, refresh } = useDevices();

  return (
    <Stack gap="lg">
      {showSetupBanner ? (
        <Alert color="yellow" title="Setup incomplete" variant="light">
          <Group justify="space-between" wrap="nowrap">
            <Text size="sm">Some Corsair features may not work yet.</Text>
            <Group gap="sm">
              <Text component={Link} to="/setup" size="sm" c="yellow.2">
                Setup page
              </Text>
              {onOpenSetup ? (
                <Button variant="subtle" size="compact-sm" onClick={onOpenSetup}>
                  Run wizard
                </Button>
              ) : null}
            </Group>
          </Group>
        </Alert>
      ) : null}

      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={2}>Dashboard</Title>
          <Text size="sm" c="dimmed">
            Corsair devices detected on this system
          </Text>
        </div>
        <Button
          variant="light"
          onClick={() => void refresh()}
          leftSection={<RefreshCw size={14} />}
        >
          Refresh
        </Button>
      </Group>

      {error ? (
        <Text size="sm" c="red.3">
          {error}
        </Text>
      ) : null}

      <SimpleGrid cols={{ base: 1, md: 3 }}>
        <Paper p="md" withBorder>
          <Title order={4} mb="sm">
            OpenRGB
          </Title>
          <Badge color={statusBadgeColor(health?.openrgb ?? 'unavailable')}>
            {health?.openrgb ?? '—'}
          </Badge>
        </Paper>
        <Paper p="md" withBorder>
          <Title order={4} mb="sm">
            liquidctl
          </Title>
          <Badge color={statusBadgeColor(health?.liquidctl ?? 'unavailable')}>
            {health?.liquidctl ?? '—'}
          </Badge>
        </Paper>
        <Paper p="md" withBorder>
          <Title order={4} mb="sm">
            ckb-next
          </Title>
          <Badge color={statusBadgeColor(health?.ckb_next ?? 'unavailable')}>
            {health?.ckb_next ?? '—'}
          </Badge>
        </Paper>
      </SimpleGrid>

      <Paper p="md" withBorder>
        <Title order={4} mb="md">
          Devices
        </Title>
        {loading ? (
          <Text size="sm" c="dimmed">
            Scanning...
          </Text>
        ) : devices.length === 0 ? (
          <Text size="sm" c="dimmed">
            No Corsair devices found. Check Setup for dependency installation.
          </Text>
        ) : (
          <Stack gap="xs">
            {devices.map((device) => (
              <Paper key={device.id} p="sm" withBorder bg="dark.8">
                <Group justify="space-between">
                  <div>
                    <Text fw={500}>{device.name}</Text>
                    <Text size="xs" c="dimmed">
                      {device.kind} · {device.backend}
                    </Text>
                  </div>
                  <Badge color={statusBadgeColor(device.status)}>{device.status}</Badge>
                </Group>
              </Paper>
            ))}
          </Stack>
        )}
      </Paper>
    </Stack>
  );
}
