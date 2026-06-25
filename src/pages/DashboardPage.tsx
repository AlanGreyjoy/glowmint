import { Link } from 'react-router-dom';
import {
  Activity,
  Cable,
  Cpu,
  Droplets,
  Fan,
  Gauge,
  Headphones,
  Keyboard,
  Monitor,
  Mouse,
  Palette,
  RefreshCw,
  Sparkles,
  Thermometer,
  Zap,
  type LucideIcon,
} from 'lucide-react';

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  EmptyState,
  GlassSurface,
  ListItemCard,
  MetricCard,
  PageHeader,
  SectionCard,
  StatusBadge,
  SubsystemCard,
} from '../components/ui';
import { useDashboardStats } from '../hooks/useDashboardStats';
import type { BackendHealth, BackendStatus, Device, DeviceKind } from '../lib/types';

interface DashboardPageProps {
  showSetupBanner?: boolean;
  onOpenSetup?: () => void;
}

function formatStatus(status?: string) {
  if (!status) return 'Unavailable';
  return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
}

function formatDecimal(value?: number, digits = 1) {
  return value == null ? '—' : value.toFixed(digits);
}

function formatInteger(value?: number | null) {
  return value == null ? '—' : Math.round(value).toLocaleString();
}

function formatPercent(value?: number | null) {
  return value == null ? '—' : `${Math.round(value)}%`;
}

function average(values: number[]) {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function plural(count: number, singular: string, pluralLabel = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralLabel}`;
}

function backendOnline(status?: BackendStatus) {
  return status === 'available' || status === 'partial';
}

function systemStatus(health: BackendHealth | null, errorCount: number) {
  if (!health && errorCount > 0) return 'Backend offline';
  if (!health) return 'Scanning hardware';

  const statuses = [health.openrgb, health.liquidctl, health.ckb_next];
  if (statuses.every((status) => status === 'available')) return 'Systems nominal';
  if (statuses.some((status) => status === 'partial')) return 'Partially online';
  return 'Needs attention';
}

function deviceRoute(device: Device) {
  if (device.kind === 'aio_cooler' || device.kind === 'lcd_screen') return '/aio';
  if (device.kind === 'rgb_controller' || device.capabilities.includes('rgb')) return '/lighting';
  if (device.kind === 'keyboard' || device.kind === 'mouse' || device.kind === 'headset') {
    return '/peripherals';
  }
  return '/setup';
}

const deviceIcons: Record<DeviceKind, LucideIcon> = {
  aio_cooler: Droplets,
  lcd_screen: Monitor,
  rgb_controller: Palette,
  keyboard: Keyboard,
  mouse: Mouse,
  headset: Headphones,
  usb_device: Cable,
  unknown: Cpu,
};

export function DashboardPage({ showSetupBanner, onOpenSetup }: DashboardPageProps) {
  const {
    devices,
    health,
    cooling,
    lcd,
    rgbDevices,
    peripherals,
    loading,
    refreshing,
    errors,
    lastUpdated,
    refresh,
  } = useDashboardStats();

  const backendCards = [
    {
      label: 'OpenRGB',
      status: health?.openrgb,
      icon: Cable,
      accent: 'bg-emerald-300/18 text-emerald-100',
      description: 'Lighting bus',
    },
    {
      label: 'liquidctl',
      status: health?.liquidctl,
      icon: Droplets,
      accent: 'bg-teal-300/18 text-teal-100',
      description: 'Cooling telemetry',
    },
    {
      label: 'ckb-next',
      status: health?.ckb_next,
      icon: Keyboard,
      accent: 'bg-green-300/18 text-green-100',
      description: 'Peripheral daemon',
    },
  ];
  const fanSpeeds = cooling?.fan_speeds_rpm ?? [];
  const fanDuties = cooling?.fan_duties_percent ?? [];
  const averageFanRpm = average(fanSpeeds);
  const averageFanDuty = average(fanDuties);
  const activeFanCount = fanSpeeds.filter((speed) => speed > 0).length;
  const rgbZoneCount = rgbDevices.reduce((sum, device) => sum + device.zones.length, 0);
  const rgbLedCount = rgbDevices.reduce(
    (sum, device) => sum + device.zones.reduce((zoneSum, zone) => zoneSum + zone.led_count, 0),
    0,
  );
  const onlineBackends = backendCards.filter(({ status }) => backendOnline(status)).length;
  const errorMessages = Array.from(new Set(Object.values(errors)));
  const errorCount = Object.keys(errors).length;
  const overallStatus = systemStatus(health, errorCount);

  return (
    <div className="flex flex-col gap-6">
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
        description="Live Corsair telemetry, backend health, and device command status"
        actions={
          <Button variant="secondary" disabled={refreshing} onClick={() => void refresh()}>
            <RefreshCw
              size={14}
              data-icon="inline-start"
              className={refreshing ? 'animate-spin' : undefined}
            />
            {refreshing ? 'Refreshing' : 'Refresh'}
          </Button>
        }
      />

      {errorMessages.length > 0 ? (
        <Alert className="glowmint-glass glowmint-glass--inset bg-rose-400/14 text-white">
          <AlertTitle className="text-rose-50">Telemetry degraded</AlertTitle>
          <AlertDescription className="text-white/72">
            {errorMessages.slice(0, 2).join(' ')}
          </AlertDescription>
        </Alert>
      ) : null}

      <GlassSurface variant="panel" className="relative overflow-hidden p-6 lg:p-7">
        <div
          aria-hidden
          className="absolute -right-20 -top-24 size-72 rounded-full bg-emerald-300/22 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute bottom-0 left-1/3 size-64 rounded-full bg-teal-400/16 blur-3xl"
        />

        <div className="relative grid gap-7 lg:grid-cols-[1.4fr_1fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.34em] text-emerald-50/74">
              Glowmint command center
            </p>
            <h2 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight text-white drop-shadow-sm md:text-5xl">
              {overallStatus}
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-white/68">
              Watching cooling loops, lighting buses, LCD state, and Corsair peripherals from one
              glass console.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <StatusBadge
                status={errorCount === 0 ? 'available' : 'partial'}
                label={
                  errorCount === 0
                    ? 'Live telemetry'
                    : `${errorCount} warning${errorCount === 1 ? '' : 's'}`
                }
              />
              <StatusBadge
                status={onlineBackends === backendCards.length ? 'available' : 'partial'}
                label={`${onlineBackends}/${backendCards.length} backends online`}
              />
              <StatusBadge
                status={devices.length > 0 ? 'detected' : 'unavailable'}
                label={plural(devices.length, 'device')}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <GlassSurface variant="inset" className="p-3">
              <p className="text-xs text-white/52">Devices</p>
              <p className="mt-2 text-2xl font-semibold text-white">{devices.length}</p>
            </GlassSurface>
            <GlassSurface variant="inset" className="p-3">
              <p className="text-xs text-white/52">RGB LEDs</p>
              <p className="mt-2 text-2xl font-semibold text-white">{rgbLedCount}</p>
            </GlassSurface>
            <GlassSurface variant="inset" className="p-3">
              <p className="text-xs text-white/52">Updated</p>
              <p className="mt-2 text-sm font-semibold text-white">
                {lastUpdated
                  ? lastUpdated.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '—'}
              </p>
            </GlassSurface>
          </div>
        </div>
      </GlassSurface>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Water temp"
          value={formatDecimal(cooling?.water_temp_c)}
          unit="°C"
          detail={
            cooling?.probe_temp_c != null
              ? `Probe ${cooling.probe_temp_c.toFixed(1)}°C`
              : 'Probe sensor unavailable'
          }
          icon={Thermometer}
          tone="cyan"
          progress={cooling?.water_temp_c == null ? null : (cooling.water_temp_c / 60) * 100}
        />
        <MetricCard
          label="Pump speed"
          value={formatInteger(cooling?.pump_speed_rpm)}
          unit="RPM"
          detail={`${formatPercent(cooling?.pump_duty_percent)} pump duty`}
          icon={Gauge}
          tone="emerald"
          progress={cooling?.pump_duty_percent}
        />
        <MetricCard
          label="Fan array"
          value={formatInteger(averageFanRpm)}
          unit="RPM"
          detail={`${activeFanCount}/${fanSpeeds.length || 0} fans spinning · ${formatPercent(averageFanDuty)} avg duty`}
          icon={Fan}
          tone="violet"
          progress={averageFanDuty}
        />
        <MetricCard
          label="Device fleet"
          value={devices.length}
          detail={`${peripherals.length} peripherals · ${rgbDevices.length} RGB controllers`}
          icon={Activity}
          tone="amber"
          progress={devices.length === 0 ? 0 : Math.min(devices.length * 12, 100)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {backendCards.map(({ label, status, icon: Icon, accent, description }) => (
          <GlassSurface key={label} variant="panel" className="min-h-28 p-4">
            <div className="flex h-full items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-4">
                <div className={`flex size-11 items-center justify-center rounded-full ${accent}`}>
                  <Icon size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/50">
                    {label}
                  </p>
                  <p className="mt-2 text-xl font-semibold leading-none text-white drop-shadow-sm">
                    {formatStatus(status)}
                  </p>
                  <p className="mt-2 text-xs text-white/58">{description}</p>
                </div>
              </div>
              <StatusBadge
                status={status ?? 'unavailable'}
                label={status ? 'Online' : 'No response'}
              />
            </div>
          </GlassSurface>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SubsystemCard
          title="LCD display"
          value={lcd?.connected ? 'Online' : 'Standby'}
          description={
            lcd?.connected
              ? `${formatPercent(lcd.brightness)} brightness · ${lcd.looping ? 'animated' : 'static'} content`
              : 'Elite LCD not reporting yet'
          }
          icon={Monitor}
          tone="cyan"
          badge={
            <StatusBadge
              status={lcd?.connected ? 'connected' : 'unavailable'}
              label={lcd?.connected ? 'Connected' : 'Offline'}
            />
          }
          footer={
            <Button asChild variant="ghost" size="sm">
              <Link to="/aio">Open LCD controls</Link>
            </Button>
          }
        />
        <SubsystemCard
          title="Lighting mesh"
          value={rgbDevices.length}
          description={`${plural(rgbZoneCount, 'zone')} · ${plural(rgbLedCount, 'mapped LED')}`}
          icon={Sparkles}
          tone="emerald"
          badge={
            <StatusBadge
              status={rgbDevices.length > 0 ? 'available' : 'unavailable'}
              label={rgbDevices.length > 0 ? 'Mapped' : 'No devices'}
            />
          }
          footer={
            <Button asChild variant="ghost" size="sm">
              <Link to="/lighting">Open lighting</Link>
            </Button>
          }
        />
        <SubsystemCard
          title="Peripherals"
          value={peripherals.length}
          description={`${plural(
            peripherals.filter((device) => device.kind === 'keyboard').length,
            'keyboard',
          )} · ${plural(peripherals.filter((device) => device.kind === 'mouse').length, 'mouse', 'mice')}`}
          icon={Zap}
          tone="violet"
          badge={
            <StatusBadge
              status={peripherals.length > 0 ? 'available' : 'unavailable'}
              label={peripherals.length > 0 ? 'Ready' : 'Idle'}
            />
          }
          footer={
            <Button asChild variant="ghost" size="sm">
              <Link to="/peripherals">Open peripherals</Link>
            </Button>
          }
        />
      </div>

      <SectionCard
        title="Device fleet"
        className="min-h-28"
        headerRight={
          <StatusBadge
            status={devices.length > 0 ? 'detected' : 'unavailable'}
            label={loading ? 'Scanning' : plural(devices.length, 'device')}
          />
        }
      >
        {loading ? (
          <EmptyState message="" loading loadingMessage="Scanning..." />
        ) : devices.length === 0 ? (
          <EmptyState message="No Corsair devices found. Check Setup for dependency installation." />
        ) : (
          <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
            {devices.map((device) => (
              <ListItemCard key={device.id}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/12 text-white">
                      {(() => {
                        const DeviceIcon = deviceIcons[device.kind];
                        return <DeviceIcon size={18} />;
                      })()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white">{device.name}</p>
                      <p className="mt-1 text-xs text-white/56">
                        {formatStatus(device.kind)} · {device.backend}
                      </p>
                      {device.capabilities.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {device.capabilities.slice(0, 3).map((capability) => (
                            <span
                              key={capability}
                              className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/66"
                            >
                              {capability}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <StatusBadge status={device.status} />
                    <Link
                      to={deviceRoute(device)}
                      className="text-xs font-medium text-emerald-50/82 underline-offset-4 hover:underline"
                    >
                      Manage
                    </Link>
                  </div>
                </div>
              </ListItemCard>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
