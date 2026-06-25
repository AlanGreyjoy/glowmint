import { useCallback, useEffect, useMemo, useState } from 'react';

import { toast } from '@/components/ui';
import { api } from '@/lib/api';
import { hexToRgb } from '@/lib/utils';

import { canvasDevicesToLayout, mergeCanvasDevices, type CanvasDeviceView } from './utils';

export function useCanvasDevices() {
  const [devices, setDevices] = useState<CanvasDeviceView[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [rgbDevices, peripherals, layout] = await Promise.all([
        api.listRgbDevices(),
        api.listPeripherals(),
        api.loadCanvasLayout(),
      ]);

      const merged = mergeCanvasDevices(rgbDevices, peripherals, layout.devices);
      setDevices(merged);
      setSelectedKey((current) =>
        current && merged.some((device) => device.deviceKey === current)
          ? current
          : (merged[0]?.deviceKey ?? null),
      );
    } catch (err) {
      toast.error(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selectedDevice = useMemo(
    () => devices.find((device) => device.deviceKey === selectedKey) ?? null,
    [devices, selectedKey],
  );

  const updateDevice = useCallback((deviceKey: string, patch: Partial<CanvasDeviceView>) => {
    setDevices((current) =>
      current.map((device) => (device.deviceKey === deviceKey ? { ...device, ...patch } : device)),
    );
  }, []);

  const moveDevice = useCallback(
    (deviceKey: string, x: number, y: number) => {
      updateDevice(deviceKey, { x, y });
    },
    [updateDevice],
  );

  const saveLayout = useCallback(async () => {
    setSaving(true);
    try {
      await api.saveCanvasLayout({ devices: canvasDevicesToLayout(devices) });
      toast.success('Canvas layout saved');
    } catch (err) {
      toast.error(String(err));
    } finally {
      setSaving(false);
    }
  }, [devices]);

  const applyColor = useCallback(async (device: CanvasDeviceView) => {
    setApplying(true);
    try {
      const color = hexToRgb(device.color);

      if (device.source === 'peripheral' && device.peripheralId) {
        await api.setPeripheralRgb(device.peripheralId, color);
        toast.success(`Color applied to ${device.displayName}`);
        return;
      }

      if (device.openrgbIndex === undefined) return;

      if (device.zoneIndex !== null) {
        await api.setZoneColor(device.openrgbIndex, device.zoneIndex, color);
      } else {
        await Promise.all(
          device.zones.map((zone) => api.setZoneColor(device.openrgbIndex!, zone.index, color)),
        );
      }

      toast.success(`Color applied to ${device.displayName}`);
    } catch (err) {
      toast.error(String(err));
    } finally {
      setApplying(false);
    }
  }, []);

  const applyMode = useCallback(async (device: CanvasDeviceView) => {
    if (device.openrgbIndex === undefined) return;

    setApplying(true);
    try {
      await api.setDeviceMode(device.openrgbIndex, device.lightingMode);
      toast.success(`Mode set to ${device.lightingMode} for ${device.displayName}`);
    } catch (err) {
      toast.error(String(err));
    } finally {
      setApplying(false);
    }
  }, []);

  return {
    devices,
    selectedDevice,
    selectedKey,
    setSelectedKey,
    loading,
    saving,
    applying,
    refresh,
    updateDevice,
    moveDevice,
    saveLayout,
    applyColor,
    applyMode,
  };
}
