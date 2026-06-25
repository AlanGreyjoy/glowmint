import { useEffect, useMemo, useState } from 'react';

import {
  Button,
  ColorInput,
  EmptyState,
  Label,
  NumberField,
  PageHeader,
  SectionCard,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui';
import { api } from '../lib/api';
import { hexToRgb } from '../lib/utils';
import type { LightingMode, RgbDevice, RgbZone } from '../lib/types';

function zoneKey(deviceIndex: number, zoneIndex: number) {
  return `${deviceIndex}-${zoneIndex}`;
}

function zonesNeedingSetup(devices: RgbDevice[]): Array<{ device: RgbDevice; zone: RgbZone }> {
  return devices.flatMap((device) =>
    device.zones
      .filter((zone) => zone.resizable && zone.led_count === 0)
      .map((zone) => ({ device, zone })),
  );
}

export function LightingPage() {
  const [devices, setDevices] = useState<RgbDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [color, setColor] = useState('#00bfff');
  const [mode, setMode] = useState<LightingMode>('static');
  const [message, setMessage] = useState<string | null>(null);
  const [draftLedCounts, setDraftLedCounts] = useState<Record<string, number>>({});
  const [savingZoneKey, setSavingZoneKey] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const list = await api.listRgbDevices();
      setDevices(list);
      if (list.length > 0 && selectedDevice === null) {
        setSelectedDevice(String(list[0].index));
        setSelectedZone(list[0].zones.length > 0 ? String(list[0].zones[0].index) : null);
      }
    } catch (err) {
      setMessage(String(err));
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setupZones = useMemo(() => zonesNeedingSetup(devices), [devices]);

  useEffect(() => {
    setDraftLedCounts((prev) => {
      const next = { ...prev };
      for (const { device, zone } of setupZones) {
        const key = zoneKey(device.index, zone.index);
        if (next[key] === undefined) {
          next[key] = zone.led_count;
        }
      }
      return next;
    });
  }, [setupZones]);

  const active = devices.find((d) => String(d.index) === selectedDevice);

  const applyColor = async () => {
    if (selectedDevice === null || selectedZone === null) return;
    try {
      await api.setZoneColor(Number(selectedDevice), Number(selectedZone), hexToRgb(color));
      setMessage('Zone color applied');
    } catch (err) {
      setMessage(String(err));
    }
  };

  const applyMode = async () => {
    if (selectedDevice === null) return;
    try {
      await api.setDeviceMode(Number(selectedDevice), mode);
      setMessage(`Mode set to ${mode}`);
    } catch (err) {
      setMessage(String(err));
    }
  };

  const saveHeaderSetup = async (deviceIndex: number, zone: RgbZone) => {
    const key = zoneKey(deviceIndex, zone.index);
    const ledCount = draftLedCounts[key] ?? zone.led_count;

    setSavingZoneKey(key);
    try {
      await api.resizeRgbZone(deviceIndex, zone.index, ledCount);
      setMessage(`Saved ${zone.name} (${ledCount} LEDs)`);
      await refresh();
    } catch (err) {
      setMessage(String(err));
    } finally {
      setSavingZoneKey(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Lighting" description="RGB control via OpenRGB" />

      {message ? <p className="text-sm text-cyan-200">{message}</p> : null}

      {setupZones.length > 0 ? (
        <SectionCard title="RGB headers to set up">
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              These are physical RGB connectors on your PC. Enter how many LEDs are on each one you
              use — leave at 0 if nothing is plugged in.
            </p>
            {setupZones.map(({ device, zone }) => {
              const key = zoneKey(device.index, zone.index);
              return (
                <div key={key} className="flex flex-wrap items-end gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{device.name}</p>
                    <p className="text-xs text-muted-foreground">{zone.name}</p>
                  </div>
                  <NumberField
                    label="LEDs"
                    className="w-32"
                    value={draftLedCounts[key] ?? zone.led_count}
                    min={zone.leds_min}
                    max={zone.leds_max}
                    onChange={(value) =>
                      setDraftLedCounts((prev) => ({
                        ...prev,
                        [key]: value,
                      }))
                    }
                  />
                  <Button
                    loading={savingZoneKey === key}
                    onClick={() => void saveHeaderSetup(device.index, zone)}
                  >
                    Save
                  </Button>
                </div>
              );
            })}
          </div>
        </SectionCard>
      ) : null}

      <SectionCard title="RGB Devices">
        {devices.length === 0 ? (
          <EmptyState message="No OpenRGB devices found. Start OpenRGB with SDK server enabled." />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="space-y-2">
              <Label>Device</Label>
              <Select
                value={selectedDevice ?? undefined}
                onValueChange={(value) => {
                  setSelectedDevice(value);
                  const device = devices.find((d) => String(d.index) === value);
                  setSelectedZone(device?.zones[0] ? String(device.zones[0].index) : null);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select device" />
                </SelectTrigger>
                <SelectContent>
                  {devices.map((device) => (
                    <SelectItem key={device.index} value={String(device.index)}>
                      {device.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {active ? (
              <div className="space-y-2">
                <Label>Zone</Label>
                <Select value={selectedZone ?? undefined} onValueChange={setSelectedZone}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select zone" />
                  </SelectTrigger>
                  <SelectContent>
                    {active.zones.map((zone) => (
                      <SelectItem key={zone.index} value={String(zone.index)}>
                        {zone.name} ({zone.led_count} LEDs)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <ColorInput label="Color" value={color} onChange={setColor} />

            <div className="space-y-2">
              <Label>Mode</Label>
              <Select value={mode} onValueChange={(value) => setMode(value as LightingMode)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="static">Static</SelectItem>
                  <SelectItem value="breathing">Breathing</SelectItem>
                  <SelectItem value="rainbow">Rainbow</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void applyColor()}>Apply Color</Button>
              <Button variant="secondary" onClick={() => void applyMode()}>
                Apply Mode
              </Button>
              <Button variant="secondary" onClick={() => void refresh()}>
                Refresh
              </Button>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
