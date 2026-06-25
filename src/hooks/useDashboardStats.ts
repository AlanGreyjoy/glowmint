import { useCallback, useEffect, useRef, useState } from 'react';

import { api } from '../lib/api';
import type { BackendHealth, CoolingStatus, Device, LcdStatus, RgbDevice } from '../lib/types';

type DashboardDataKey = 'devices' | 'health' | 'cooling' | 'lcd' | 'rgb' | 'peripherals';

export type DashboardErrors = Partial<Record<DashboardDataKey, string>>;

interface DashboardStats {
  devices: Device[];
  health: BackendHealth | null;
  cooling: CoolingStatus | null;
  lcd: LcdStatus | null;
  rgbDevices: RgbDevice[];
  peripherals: Device[];
  loading: boolean;
  refreshing: boolean;
  errors: DashboardErrors;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
}

function formatDashboardError(err: unknown) {
  const message = String(err);
  if (message.includes('invoke')) {
    return 'Glowmint could not reach the Tauri backend. Start the app with `npm run tauri dev`.';
  }
  return message;
}

export function useDashboardStats(intervalMs = 3000): DashboardStats {
  const [devices, setDevices] = useState<Device[]>([]);
  const [health, setHealth] = useState<BackendHealth | null>(null);
  const [cooling] = useState<CoolingStatus | null>(null);
  const [lcd, setLcd] = useState<LcdStatus | null>(null);
  const [rgbDevices, setRgbDevices] = useState<RgbDevice[]>([]);
  const [peripherals, setPeripherals] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errors, setErrors] = useState<DashboardErrors>({});
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const hasLoadedRef = useRef(false);

  const refresh = useCallback(async (includeInventory = false) => {
    if (hasLoadedRef.current) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    const telemetryPromise = Promise.allSettled([api.lcdStatus(), api.listPeripherals()]);
    const inventoryPromise = includeInventory
      ? Promise.allSettled([api.discoverDevices(), api.backendHealth(), api.listRgbDevices()])
      : Promise.resolve(null);

    const [[lcdResult, peripheralResult], inventoryResults] = await Promise.all([
      telemetryPromise,
      inventoryPromise,
    ]);
    const nextErrors: DashboardErrors = {};
    const clearedErrorKeys = new Set<DashboardDataKey>();

    if (inventoryResults) {
      const [devicesResult, healthResult, rgbResult] = inventoryResults;

      if (devicesResult.status === 'fulfilled') {
        setDevices(devicesResult.value);
        clearedErrorKeys.add('devices');
      } else {
        nextErrors.devices = formatDashboardError(devicesResult.reason);
      }

      if (healthResult.status === 'fulfilled') {
        setHealth(healthResult.value);
        clearedErrorKeys.add('health');
      } else {
        nextErrors.health = formatDashboardError(healthResult.reason);
      }

      if (rgbResult.status === 'fulfilled') {
        setRgbDevices(rgbResult.value);
        clearedErrorKeys.add('rgb');
      } else {
        nextErrors.rgb = formatDashboardError(rgbResult.reason);
      }
    }

    if (lcdResult.status === 'fulfilled') {
      setLcd(lcdResult.value);
      clearedErrorKeys.add('lcd');
    } else {
      nextErrors.lcd = formatDashboardError(lcdResult.reason);
    }

    if (peripheralResult.status === 'fulfilled') {
      setPeripherals(peripheralResult.value);
      clearedErrorKeys.add('peripherals');
    } else {
      nextErrors.peripherals = formatDashboardError(peripheralResult.reason);
    }

    setErrors((previousErrors) => {
      const mergedErrors = includeInventory ? {} : { ...previousErrors };
      for (const key of clearedErrorKeys) {
        delete mergedErrors[key];
      }
      return { ...mergedErrors, ...nextErrors };
    });
    setLastUpdated(new Date());
    hasLoadedRef.current = true;
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    let intervalId: number | undefined;
    let didInitialLoad = false;

    // First visible load pulls the full inventory; later ticks/re-shows only refresh telemetry.
    const tick = () => {
      if (didInitialLoad) {
        void refresh();
      } else {
        didInitialLoad = true;
        void refresh(true);
      }
    };

    const start = () => {
      if (intervalId === undefined) {
        intervalId = window.setInterval(() => void refresh(), intervalMs);
      }
    };
    const stop = () => {
      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
        intervalId = undefined;
      }
    };

    // Pause all dashboard polling while the window is hidden; resume with one refresh.
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        tick();
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === 'visible') {
      tick();
      start();
    }
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      stop();
    };
  }, [intervalMs, refresh]);

  return {
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
  };
}
