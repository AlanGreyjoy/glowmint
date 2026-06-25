import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { CheckCircle2, CircleAlert, CircleHelp, XCircle } from 'lucide-react';

import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  ListItemCard,
  ProgressSheet,
  SectionCard,
  StatusBadge,
  toast,
} from '../../components/ui';
import { cn } from '../../lib/utils';
import { api } from '../../lib/api';
import type {
  CheckStatus,
  SetupCheck,
  SetupEnvironment,
  SetupReport,
  UsbDeviceInfo,
} from '../../lib/types';

function StatusIcon({ status }: { status: CheckStatus }) {
  if (status === 'pass') return <CheckCircle2 className="size-[18px] text-green-400" />;
  if (status === 'fail') return <XCircle className="size-[18px] text-red-400" />;
  if (status === 'warn') return <CircleAlert className="size-[18px] text-yellow-400" />;
  return <CircleHelp className="size-[18px] text-muted-foreground" />;
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

async function yieldToPaint() {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
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
  const alertClassName =
    feedback?.tone === 'success'
      ? 'border-green-500/30 bg-green-500/10 text-green-200'
      : feedback?.tone === 'error'
        ? 'border-red-500/30 bg-red-500/10 text-red-200'
        : 'border-teal-500/30 bg-teal-500/10 text-teal-200';

  return (
    <Dialog open={opened && feedback !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="glowmint-glass glowmint-glass--panel sm:max-w-lg">
        {feedback ? (
          <>
            <DialogHeader>
              <DialogTitle>{feedback.title}</DialogTitle>
            </DialogHeader>
            <Alert className={alertClassName}>
              <AlertDescription className="whitespace-pre-wrap text-sm">
                {feedback.summary}
              </AlertDescription>
            </Alert>
            {feedback.log ? (
              <pre className="max-h-60 overflow-auto rounded-md border border-border bg-black/30 p-3 font-mono text-xs">
                {feedback.log}
              </pre>
            ) : null}
            <DialogFooter>
              <Button onClick={onClose}>Done</Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function PlatformSetupBanner({ platform }: { platform: SetupEnvironment }) {
  if (platform.supports_apt_auto_install) {
    return null;
  }

  if (platform.package_manager === 'apt') {
    return (
      <p className="mb-4 text-sm text-yellow-200">
        Auto-install requires polkit (pkexec) and admin approval. Copy the commands below if Install
        is unavailable.
      </p>
    );
  }

  return (
    <p className="mb-4 text-sm text-yellow-200">
      Auto-install works on Debian/Ubuntu/Mint. On {platform.distro_label}, copy the commands below
      into your terminal.
    </p>
  );
}

interface DetectedHardwarePanelProps {
  report: SetupReport;
}

function HardwareItem({ device }: { device: UsbDeviceInfo }) {
  const hint = productHint(device.product_id);

  return (
    <ListItemCard>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{hint}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{device.description}</p>
        </div>
        <p className="font-mono text-xs text-emerald-300">
          {device.vendor_id.toString(16)}:{device.product_id.toString(16).padStart(4, '0')}
        </p>
      </div>
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
        <Badge
          variant="outline"
          className={
            corsair_devices.length > 0
              ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
              : 'text-muted-foreground'
          }
        >
          {corsair_devices.length} device{corsair_devices.length === 1 ? '' : 's'}
        </Badge>
      }
    >
      {has_lcd_hardware || has_aio_hardware ? (
        <div className="mb-4 flex flex-wrap gap-2">
          {has_lcd_hardware ? (
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-300">
              LCD screen
            </Badge>
          ) : null}
          {has_aio_hardware ? (
            <Badge variant="outline" className="border-teal-500/30 text-teal-300">
              AIO cooler
            </Badge>
          ) : null}
        </div>
      ) : null}

      {corsair_devices.length === 0 ? (
        <EmptyState message="No Corsair USB devices found yet. Plug in your gear and hit Re-check." />
      ) : (
        <div className="flex flex-col gap-2">
          {corsair_devices.map((d) => (
            <HardwareItem key={`${d.bus}-${d.device}`} device={d} />
          ))}
        </div>
      )}
    </SectionCard>
  );
}

interface SystemChecksPanelProps {
  report: SetupReport;
  onRefresh: () => void | Promise<void>;
  refreshing?: boolean;
  showRefreshButton?: boolean;
}

export function SystemChecksPanel({
  report,
  onRefresh,
  refreshing,
  showRefreshButton = true,
}: SystemChecksPanelProps) {
  const [fixingCheckId, setFixingCheckId] = useState<string | null>(null);
  const [progressSheet, setProgressSheet] = useState<ProgressSheetContent | null>(null);
  const [fixFeedback, setFixFeedback] = useState<FixFeedback | null>(null);
  const [fixModalOpen, setFixModalOpen] = useState(false);
  const [pendingFix, setPendingFix] = useState<SetupCheck | null>(null);
  const fixRunningRef = useRef(false);
  const fixInProgress = fixingCheckId !== null;

  const closeFixModal = () => {
    setFixModalOpen(false);
  };

  const handleAutoFix = (check: SetupCheck) => {
    if (fixRunningRef.current) {
      return;
    }

    flushSync(() => {
      setFixModalOpen(false);
      setProgressSheet(progressSheetContent(check));
      setFixingCheckId(check.id);
      setPendingFix(check);
    });
  };

  useEffect(() => {
    if (!pendingFix) {
      return;
    }

    const check = pendingFix;
    fixRunningRef.current = true;

    void (async () => {
      await yieldToPaint();

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
            title: 'OpenRGB server started',
            summary:
              'Unused RGB headers were set to off. Configure any you use on the Lighting page, then confirm the check passes below.',
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
      } finally {
        fixRunningRef.current = false;
        setPendingFix(null);
        setFixingCheckId(null);
        setProgressSheet(null);
        setFixModalOpen(true);
      }
    })();
  }, [pendingFix, onRefresh]);

  const passedCount = report.checks.filter((c) => c.status === 'pass').length;

  return (
    <SectionCard
      title="System checks"
      fillHeight
      headerRight={
        <Badge
          variant="outline"
          className={cn(
            report.all_required_pass
              ? 'border-green-500/30 bg-green-500/15 text-green-400'
              : 'border-yellow-500/30 bg-yellow-500/15 text-yellow-400',
          )}
        >
          {passedCount}/{report.checks.length} passed
        </Badge>
      }
    >
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

      <div className="flex flex-col gap-4">
        {report.checks.map((check) => (
          <ListItemCard
            key={check.id}
            variant="collapsible"
            padding="md"
            defaultExpanded={check.status !== 'pass'}
            header={
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <StatusIcon status={check.status} />
                  <span className="font-medium">{check.label}</span>
                </div>
                <StatusBadge status={check.status} />
              </div>
            }
          >
            <p className="text-xs text-muted-foreground">{check.message}</p>
            {check.fix_command ? (
              <pre className="mt-2 overflow-x-auto rounded-md border border-border bg-black/30 p-2 font-mono text-xs">
                {check.fix_command}
              </pre>
            ) : null}
            {check.fix_command || check.can_auto_fix ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {check.fix_command ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      void copyText(check.fix_command!).then(() =>
                        toast.success('Copied to clipboard'),
                      )
                    }
                  >
                    Copy
                  </Button>
                ) : null}
                {check.can_auto_fix ? (
                  <Button
                    size="sm"
                    loading={fixingCheckId === check.id}
                    disabled={fixInProgress && fixingCheckId !== check.id}
                    onClick={() => void handleAutoFix(check)}
                  >
                    {fixingCheckId === check.id
                      ? autoFixBusyLabel(check.id)
                      : autoFixLabel(check.id)}
                  </Button>
                ) : null}
              </div>
            ) : null}
          </ListItemCard>
        ))}
      </div>

      {showRefreshButton ? (
        <Button
          variant="secondary"
          className="mt-4"
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
  onRefresh: () => void | Promise<void>;
  refreshing?: boolean;
  layout?: 'stack' | 'grid';
  showRefreshButton?: boolean;
}

export function SetupChecklist({
  report,
  onRefresh,
  refreshing,
  layout = 'stack',
  showRefreshButton = true,
}: SetupChecklistProps) {
  const panels = (
    <>
      <DetectedHardwarePanel report={report} />
      <SystemChecksPanel
        report={report}
        onRefresh={onRefresh}
        refreshing={refreshing}
        showRefreshButton={showRefreshButton}
      />
    </>
  );

  if (layout === 'grid') {
    return <div className="grid grid-cols-1 gap-6 md:grid-cols-2">{panels}</div>;
  }

  return <div className="flex flex-col gap-4">{panels}</div>;
}

export function setupIncompleteBanner(status: {
  onboarding_skipped: boolean;
  report: { all_required_pass: boolean };
}) {
  return status.onboarding_skipped && !status.report.all_required_pass;
}
