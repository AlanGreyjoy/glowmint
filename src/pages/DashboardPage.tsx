import { Link } from 'react-router-dom';
import { Cable, Droplets, Keyboard, RefreshCw } from 'lucide-react';

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  EmptyState,
  GlassSurface,
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

function formatStatus(status?: string) {
  if (!status) return 'Unavailable';
  return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
}

export function DashboardPage({ showSetupBanner, onOpenSetup }: DashboardPageProps) {
  const { devices, health, loading, error, refresh } = useDevices();
  const backendCards = [
    {
      label: 'OpenRGB',
      status: health?.openrgb,
      icon: Cable,
      accent: 'bg-emerald-300/18 text-emerald-100',
    },
    {
      label: 'liquidctl',
      status: health?.liquidctl,
      icon: Droplets,
      accent: 'bg-sky-300/18 text-sky-100',
    },
    {
      label: 'ckb-next',
      status: health?.ckb_next,
      icon: Keyboard,
      accent: 'bg-violet-300/18 text-violet-100',
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      {showSetupBanner ? (
        <Alert className="glowmint-glass glowmint-glass--panel bg-yellow-300/14 text-white">
          <AlertTitle className="text-yellow-50">Setup incomplete</AlertTitle>
          <AlertDescription>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm text-white/74">Some Corsair features may not work yet.</span>
              <div className="flex items-center gap-3">
                <Link
                  to="/setup"
                  className="text-sm text-yellow-50 underline-offset-4 hover:underline"
                >
                  Setup page
                </Link>
                {onOpenSetup ? (
                  <Button variant="ghost" size="sm" onClick={onOpenSetup}>
                    Run wizard
                  </Button>
                ) : null}
              </div>
            </div>
          </AlertDescription>
        </Alert>
      ) : null}

      <PageHeader
        title="Dashboard"
        description="Corsair devices detected on this system"
        actions={
          <Button variant="secondary" onClick={() => void refresh()}>
            <RefreshCw size={14} data-icon="inline-start" />
            Refresh
          </Button>
        }
      />

      {error ? (
        <Alert className="glowmint-glass glowmint-glass--inset bg-rose-400/14 text-white">
          <AlertTitle className="text-rose-50">Backend unavailable</AlertTitle>
          <AlertDescription className="text-white/72">{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {backendCards.map(({ label, status, icon: Icon, accent }) => (
          <GlassSurface key={label} variant="panel" className="min-h-24 p-4">
            <div className="flex h-full items-center gap-4">
              <div className={`flex size-11 items-center justify-center rounded-full ${accent}`}>
                <Icon size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-white/58">{label}</p>
                <p className="mt-1 text-xl font-semibold leading-none text-white drop-shadow-sm">
                  {formatStatus(status)}
                </p>
                <StatusBadge
                  status={status ?? 'unavailable'}
                  label={status ? 'Backend health' : 'No response'}
                  className="mt-3"
                />
              </div>
            </div>
          </GlassSurface>
        ))}
      </div>

      <SectionCard title="Devices" className="min-h-24">
        {loading ? (
          <EmptyState message="" loading loadingMessage="Scanning..." />
        ) : devices.length === 0 ? (
          <EmptyState message="No Corsair devices found. Check Setup for dependency installation." />
        ) : (
          <div className="flex flex-col gap-2">
            {devices.map((device) => (
              <ListItemCard key={device.id}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{device.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {device.kind} · {device.backend}
                    </p>
                  </div>
                  <StatusBadge status={device.status} />
                </div>
              </ListItemCard>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
