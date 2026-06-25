import { Link } from 'react-router-dom';
import { Alert, Button, Group, SimpleGrid, Stack, Text } from '@mantine/core';
import { RefreshCw } from 'lucide-react';

import {
  EmptyState,
  ListItemCard,
  PageHeader,
  SectionCard,
  StatusBadge,
} from '../components/ui';
import { useDevices } from '../hooks/useDevices';

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

      <PageHeader
        title="Dashboard"
        description="Corsair devices detected on this system"
        actions={
          <Button
            variant="light"
            onClick={() => void refresh()}
            leftSection={<RefreshCw size={14} />}
          >
            Refresh
          </Button>
        }
      />

      {error ? (
        <Text size="sm" c="red.3">
          {error}
        </Text>
      ) : null}

      <SimpleGrid cols={{ base: 1, md: 3 }}>
        <SectionCard title="OpenRGB">
          <StatusBadge status={health?.openrgb ?? 'unavailable'} label={health?.openrgb ?? '—'} />
        </SectionCard>
        <SectionCard title="liquidctl">
          <StatusBadge
            status={health?.liquidctl ?? 'unavailable'}
            label={health?.liquidctl ?? '—'}
          />
        </SectionCard>
        <SectionCard title="ckb-next">
          <StatusBadge status={health?.ckb_next ?? 'unavailable'} label={health?.ckb_next ?? '—'} />
        </SectionCard>
      </SimpleGrid>

      <SectionCard title="Devices">
        {loading ? (
          <EmptyState message="" loading loadingMessage="Scanning..." />
        ) : devices.length === 0 ? (
          <EmptyState message="No Corsair devices found. Check Setup for dependency installation." />
        ) : (
          <Stack gap="xs">
            {devices.map((device) => (
              <ListItemCard key={device.id}>
                <Group justify="space-between">
                  <div>
                    <Text fw={500}>{device.name}</Text>
                    <Text size="xs" c="dimmed">
                      {device.kind} · {device.backend}
                    </Text>
                  </div>
                  <StatusBadge status={device.status} />
                </Group>
              </ListItemCard>
            ))}
          </Stack>
        )}
      </SectionCard>
    </Stack>
  );
}
