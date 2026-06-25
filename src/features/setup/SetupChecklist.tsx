import { CheckCircle2, CircleAlert, CircleHelp, XCircle } from 'lucide-react';
import { Badge, Button, Code, Group, Paper, Stack, Text, Title } from '@mantine/core';

import { api } from '../../lib/api';
import { statusBadgeColor } from '../../lib/utils';
import type { CheckStatus, SetupCheck, SetupReport } from '../../lib/types';

function StatusIcon({ status }: { status: CheckStatus }) {
  if (status === 'pass') return <CheckCircle2 color="var(--mantine-color-green-4)" size={18} />;
  if (status === 'fail') return <XCircle color="var(--mantine-color-red-4)" size={18} />;
  if (status === 'warn') return <CircleAlert color="var(--mantine-color-yellow-4)" size={18} />;
  return <CircleHelp color="var(--mantine-color-gray-5)" size={18} />;
}

function productHint(productId: number): string {
  const hex = productId.toString(16).padStart(4, '0');
  if (hex === '0c39' || hex === '0c33') return 'Elite LCD';
  if (hex === '0c1c' || hex === '0c32') return 'Commander Core (AIO)';
  return 'Corsair device';
}

async function copyText(text: string) {
  await navigator.clipboard.writeText(text);
}

interface SetupChecklistProps {
  report: SetupReport;
  message?: string | null;
  onRefresh: () => void;
  onMessage?: (msg: string) => void;
  refreshing?: boolean;
}

export function SetupChecklist({
  report,
  message,
  onRefresh,
  onMessage,
  refreshing,
}: SetupChecklistProps) {
  const handleAutoFix = async (check: SetupCheck) => {
    try {
      if (check.id === 'udev_rules') {
        await api.installUdevRules();
        onMessage?.('udev rules installed — replug USB if needed');
      } else if (check.id === 'openrgb_server') {
        await api.startOpenrgbServer();
        onMessage?.('OpenRGB server starting…');
      }
      onRefresh();
    } catch (err) {
      onMessage?.(String(err));
    }
  };

  return (
    <Stack gap="md">
      {message ? (
        <Text size="sm" c="cyan.2">
          {message}
        </Text>
      ) : null}

      <Paper p="md" withBorder>
        <Title order={4} mb="md">
          Detected hardware
        </Title>
        {report.corsair_devices.length === 0 ? (
          <Text size="sm" c="dimmed">
            No Corsair USB devices found yet.
          </Text>
        ) : (
          <Stack gap="xs">
            {report.corsair_devices.map((d) => (
              <Text
                key={`${d.bus}-${d.device}`}
                size="sm"
                p="xs"
                bg="dark.8"
                style={{ borderRadius: 4 }}
              >
                <Text span ff="monospace" c="cyan.3">
                  {d.vendor_id.toString(16)}:{d.product_id.toString(16).padStart(4, '0')}
                </Text>{' '}
                — {productHint(d.product_id)} — {d.description}
              </Text>
            ))}
          </Stack>
        )}
      </Paper>

      <Paper p="md" withBorder>
        <Title order={4} mb="md">
          System checks
        </Title>
        <Stack gap="md">
          {report.checks.map((check) => (
            <Paper key={check.id} p="md" withBorder bg="dark.8">
              <Group justify="space-between" align="flex-start" wrap="nowrap">
                <Group align="flex-start" wrap="nowrap">
                  <StatusIcon status={check.status} />
                  <div>
                    <Text fw={500}>{check.label}</Text>
                    <Text size="xs" c="dimmed">
                      {check.message}
                    </Text>
                    {check.fix_command ? (
                      <Code block mt="xs" fz="xs">
                        {check.fix_command}
                      </Code>
                    ) : null}
                  </div>
                </Group>
                <Stack gap="xs" align="flex-end">
                  <Badge color={statusBadgeColor(check.status)}>{check.status}</Badge>
                  <Group gap="xs">
                    {check.fix_command ? (
                      <Button
                        variant="light"
                        size="compact-sm"
                        onClick={() =>
                          void copyText(check.fix_command!).then(() =>
                            onMessage?.('Copied to clipboard'),
                          )
                        }
                      >
                        Copy
                      </Button>
                    ) : null}
                    {check.can_auto_fix ? (
                      <Button size="compact-sm" onClick={() => void handleAutoFix(check)}>
                        {check.id === 'udev_rules' ? 'Install' : 'Start'}
                      </Button>
                    ) : null}
                  </Group>
                </Stack>
              </Group>
            </Paper>
          ))}
        </Stack>
        <Button variant="light" mt="md" onClick={onRefresh} disabled={refreshing}>
          {refreshing ? 'Checking…' : 'Re-check'}
        </Button>
      </Paper>
    </Stack>
  );
}

export function setupIncompleteBanner(status: {
  onboarding_skipped: boolean;
  report: { all_required_pass: boolean };
}) {
  return status.onboarding_skipped && !status.report.all_required_pass;
}
