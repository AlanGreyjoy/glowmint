import { useState } from 'react';
import { CheckCircle2, CircleAlert, CircleHelp, XCircle } from 'lucide-react';
import { Alert, Badge, Button, Code, Group, Modal, SimpleGrid, Stack, Text } from '@mantine/core';

import { EmptyState, ListItemCard, ProgressSheet, SectionCard, StatusBadge } from '../../components/ui';
import { api } from '../../lib/api';
import type { CheckStatus, SetupCheck, SetupEnvironment, SetupReport, UsbDeviceInfo } from '../../lib/types';

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

function autoFixLabel(checkId: string): string {
  switch (checkId) {
    case 'udev_rules':
    case 'liquidctl_binary':
    case 'openrgb_binary':
      return 'Install';
    case 'openrgb_server':
    case 'ckb_next_daemon':
      return 'Start';
    default:
      return 'Fix';
  }
}

function autoFixBusyLabel(checkId: string): string {
  switch (checkId) {
    case 'udev_rules':
    case 'liquidctl_binary':
    case 'openrgb_binary':
      return 'Installing…';
    case 'openrgb_server':
    case 'ckb_next_daemon':
      return 'Starting…';
    default:
      return 'Working…';
  }
}

interface ProgressSheetContent {
  title: string;
  message: string;
}

function progressSheetContent(check: SetupCheck): ProgressSheetContent {
  if (check.id === 'liquidctl_binary' || check.id === 'openrgb_binary') {
    return {
      title: 'Installing packages',
      message:
        'Approve the single password prompt when it appears.\nThis can take a few minutes — please keep Glowmint open.',
    };
  }
  if (check.id === 'udev_rules') {
    return {
      title: 'Installing udev rules',
      message: 'Approve the system prompt if shown.',
    };
  }
  if (check.id === 'ckb_next_daemon') {
    return {
      title: 'Starting ckb-next',
      message: 'Approve the system prompt if shown.',
    };
  }
  return {
    title: check.label,
    message: 'Please wait…',
  };
}

interface FixFeedback {
  tone: 'info' | 'success' | 'error';
  title: string;
  summary: string;
  log?: string;
}

function FixResultModal({
  opened,
  feedback,
  onClose,
}: {
  opened: boolean;
  feedback: FixFeedback | null;
  onClose: () => void;
}) {
  if (!feedback) {
    return null;
  }

  const color =
    feedback.tone === 'success' ? 'green' : feedback.tone === 'error' ? 'red' : 'cyan';

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={feedback.title}
      centered
    >
      <Stack gap="md">
        <Alert color={color} variant="light">
          <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
            {feedback.summary}
          </Text>
        </Alert>
        {feedback.log ? (
          <Code block fz="xs" style={{ maxHeight: 240, overflow: 'auto' }}>
            {feedback.log}
          </Code>
        ) : null}
        <Group justify="flex-end">
          <Button onClick={onClose}>Done</Button>
        </Group>
      </Stack>
    </Modal>
  );
}

function PlatformSetupBanner({ platform }: { platform: SetupEnvironment }) {
  if (platform.supports_apt_auto_install) {
    return null;
  }

  if (platform.package_manager === 'apt') {
    return (
      <Text size="sm" c="yellow.2" mb="md">
        Auto-install requires polkit (pkexec) and admin approval. Copy the commands below if Install
        is unavailable.
      </Text>
    );
  }

  return (
    <Text size="sm" c="yellow.2" mb="md">
      Auto-install works on Debian/Ubuntu/Mint. On {platform.distro_label}, copy the commands below
      into your terminal.
    </Text>
  );
}

interface DetectedHardwarePanelProps {
  report: SetupReport;
}

function HardwareItem({ device }: { device: UsbDeviceInfo }) {
  const hint = productHint(device.product_id);

  return (
    <ListItemCard>
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <div>
          <Text fw={500} size="sm">
            {hint}
          </Text>
          <Text size="xs" c="dimmed" mt={2}>
            {device.description}
          </Text>
        </div>
        <Text ff="monospace" size="xs" c="cyan.3">
          {device.vendor_id.toString(16)}:{device.product_id.toString(16).padStart(4, '0')}
        </Text>
      </Group>
    </ListItemCard>
  );
}

export function DetectedHardwarePanel({ report }: DetectedHardwarePanelProps) {
  const { corsair_devices, has_lcd_hardware, has_aio_hardware } = report;

  return (
    <SectionCard
      title="Detected hardware"
      fillHeight
      headerRight={
        <Badge variant="light" color={corsair_devices.length > 0 ? 'cyan' : 'gray'}>
          {corsair_devices.length} device{corsair_devices.length === 1 ? '' : 's'}
        </Badge>
      }
    >
      {has_lcd_hardware || has_aio_hardware ? (
        <Group gap="xs" mb="md">
          {has_lcd_hardware ? (
            <Badge variant="outline" color="cyan">
              LCD screen
            </Badge>
          ) : null}
          {has_aio_hardware ? (
            <Badge variant="outline" color="blue">
              AIO cooler
            </Badge>
          ) : null}
        </Group>
      ) : null}

      {corsair_devices.length === 0 ? (
        <EmptyState message="No Corsair USB devices found yet. Plug in your gear and hit Re-check." />
      ) : (
        <Stack gap="xs">
          {corsair_devices.map((d) => (
            <HardwareItem key={`${d.bus}-${d.device}`} device={d} />
          ))}
        </Stack>
      )}
    </SectionCard>
  );
}

interface SystemChecksPanelProps {
  report: SetupReport;
  message?: string | null;
  onRefresh: () => void | Promise<void>;
  onMessage?: (msg: string) => void;
  refreshing?: boolean;
  showRefreshButton?: boolean;
}

export function SystemChecksPanel({
  report,
  message,
  onRefresh,
  onMessage,
  refreshing,
  showRefreshButton = true,
}: SystemChecksPanelProps) {
  const [fixingCheckId, setFixingCheckId] = useState<string | null>(null);
  const [progressSheet, setProgressSheet] = useState<ProgressSheetContent | null>(null);
  const [fixFeedback, setFixFeedback] = useState<FixFeedback | null>(null);
  const [fixModalOpen, setFixModalOpen] = useState(false);
  const fixInProgress = fixingCheckId !== null;

  const closeFixModal = () => {
    setFixModalOpen(false);
  };

  const handleAutoFix = async (check: SetupCheck) => {
    setFixModalOpen(false);
    setProgressSheet(progressSheetContent(check));
    setFixingCheckId(check.id);
    try {
      if (check.id === 'udev_rules') {
        await api.installUdevRules();
        setFixFeedback({
          tone: 'success',
          title: 'udev rules installed',
          summary: 'Replug USB if needed, then confirm the check passes below.',
        });
      } else if (check.id === 'openrgb_server') {
        await api.startOpenrgbServer();
        setFixFeedback({
          tone: 'success',
          title: 'OpenRGB server starting',
          summary: 'Give it a few seconds, then confirm the check passes below.',
        });
      } else if (check.id === 'liquidctl_binary' || check.id === 'openrgb_binary') {
        const result = await api.installPackages();
        setFixFeedback({
          tone: result.success ? 'success' : 'error',
          title: result.success ? 'Package install finished' : 'Package install failed',
          summary: result.summary,
          log: result.log || undefined,
        });
      } else if (check.id === 'ckb_next_daemon') {
        await api.startCkbNextDaemon();
        setFixFeedback({
          tone: 'success',
          title: 'ckb-next daemon started',
          summary: 'Confirm the check passes below.',
        });
      }
      await onRefresh();
    } catch (err) {
      setFixFeedback({
        tone: 'error',
        title: 'Action failed',
        summary: String(err),
      });
      onMessage?.(String(err));
    } finally {
      setFixingCheckId(null);
      setProgressSheet(null);
      setFixModalOpen(true);
    }
  };

  const passedCount = report.checks.filter((c) => c.status === 'pass').length;

  return (
    <SectionCard
      title="System checks"
      fillHeight
      headerRight={
        <Badge variant="light" color={report.all_required_pass ? 'green' : 'yellow'}>
          {passedCount}/{report.checks.length} passed
        </Badge>
      }
    >
      {message ? (
        <Text size="sm" c="cyan.2" mb="md">
          {message}
        </Text>
      ) : null}

      <ProgressSheet
        opened={fixInProgress && progressSheet !== null}
        title={progressSheet?.title ?? 'Working…'}
        message={progressSheet?.message ?? 'Please wait…'}
      />

      <FixResultModal
        opened={fixModalOpen && !fixInProgress}
        feedback={fixFeedback}
        onClose={closeFixModal}
      />

      <PlatformSetupBanner platform={report.platform} />

      <Stack gap="md">
        {report.checks.map((check) => (
          <ListItemCard
            key={check.id}
            variant="collapsible"
            padding="md"
            defaultExpanded={check.status !== 'pass'}
            header={
              <Group justify="space-between" align="center" wrap="nowrap">
                <Group align="center" wrap="nowrap" gap="sm">
                  <StatusIcon status={check.status} />
                  <Text fw={500}>{check.label}</Text>
                </Group>
                <StatusBadge status={check.status} />
              </Group>
            }
          >
            <Text size="xs" c="dimmed">
              {check.message}
            </Text>
            {check.fix_command ? (
              <Code block mt="xs" fz="xs">
                {check.fix_command}
              </Code>
            ) : null}
            {check.fix_command || check.can_auto_fix ? (
              <Group gap="xs" mt="sm">
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
                  <Button
                    size="compact-sm"
                    loading={fixingCheckId === check.id}
                    disabled={fixInProgress && fixingCheckId !== check.id}
                    onClick={() => void handleAutoFix(check)}
                  >
                    {fixingCheckId === check.id ? autoFixBusyLabel(check.id) : autoFixLabel(check.id)}
                  </Button>
                ) : null}
              </Group>
            ) : null}
          </ListItemCard>
        ))}
      </Stack>

      {showRefreshButton ? (
        <Button
          variant="light"
          mt="md"
          onClick={onRefresh}
          disabled={refreshing || fixInProgress}
        >
          {refreshing ? 'Checking…' : 'Re-check'}
        </Button>
      ) : null}
    </SectionCard>
  );
}

interface SetupChecklistProps {
  report: SetupReport;
  message?: string | null;
  onRefresh: () => void | Promise<void>;
  onMessage?: (msg: string) => void;
  refreshing?: boolean;
  layout?: 'stack' | 'grid';
  showRefreshButton?: boolean;
}

export function SetupChecklist({
  report,
  message,
  onRefresh,
  onMessage,
  refreshing,
  layout = 'stack',
  showRefreshButton = true,
}: SetupChecklistProps) {
  const panels = (
    <>
      <DetectedHardwarePanel report={report} />
      <SystemChecksPanel
        report={report}
        message={message}
        onRefresh={onRefresh}
        onMessage={onMessage}
        refreshing={refreshing}
        showRefreshButton={showRefreshButton}
      />
    </>
  );

  if (layout === 'grid') {
    return (
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        {panels}
      </SimpleGrid>
    );
  }

  return <Stack gap="md">{panels}</Stack>;
}

export function setupIncompleteBanner(status: {
  onboarding_skipped: boolean;
  report: { all_required_pass: boolean };
}) {
  return status.onboarding_skipped && !status.report.all_required_pass;
}
