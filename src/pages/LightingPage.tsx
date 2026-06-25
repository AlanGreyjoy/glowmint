import { useEffect, useMemo, useState } from 'react';
import { Button, ColorInput, Group, NumberInput, Select, Stack, Text } from '@mantine/core';

import { EmptyState, PageHeader, SectionCard } from '../components/ui';
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
    <Stack gap="lg">
      <PageHeader title="Lighting" description="RGB control via OpenRGB" />

      {message ? (
        <Text size="sm" c="cyan.2">
          {message}
        </Text>
      ) : null}

      {setupZones.length > 0 ? (
        <SectionCard title="RGB headers to set up">
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              These are physical RGB connectors on your PC. Enter how many LEDs are on each one you
              use — leave at 0 if nothing is plugged in.
            </Text>
            {setupZones.map(({ device, zone }) => {
              const key = zoneKey(device.index, zone.index);
              return (
                <Group key={key} align="flex-end" wrap="nowrap">
                  <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                    <Text size="sm" fw={500}>
                      {device.name}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {zone.name}
                    </Text>
                  </Stack>
                  <NumberInput
                    label="LEDs"
                    value={draftLedCounts[key] ?? zone.led_count}
                    min={zone.leds_min}
                    max={zone.leds_max}
                    step={1}
                    w={120}
                    onChange={(value) =>
                      setDraftLedCounts((prev) => ({
                        ...prev,
                        [key]: typeof value === 'number' ? value : zone.led_count,
                      }))
                    }
                  />
                  <Button
                    loading={savingZoneKey === key}
                    onClick={() => void saveHeaderSetup(device.index, zone)}
                  >
                    Save
                  </Button>
                </Group>
              );
            })}
          </Stack>
        </SectionCard>
      ) : null}

      <SectionCard title="RGB Devices">
        {devices.length === 0 ? (
          <EmptyState message="No OpenRGB devices found. Start OpenRGB with SDK server enabled." />
        ) : (
          <Stack gap="md">
            <Select
              label="Device"
              value={selectedDevice}
              onChange={(value) => {
                setSelectedDevice(value);
                const device = devices.find((d) => String(d.index) === value);
                setSelectedZone(device?.zones[0] ? String(device.zones[0].index) : null);
              }}
              data={devices.map((device) => ({
                value: String(device.index),
                label: device.name,
              }))}
            />

            {active ? (
              <Select
                label="Zone"
                value={selectedZone}
                onChange={setSelectedZone}
                data={active.zones.map((zone) => ({
                  value: String(zone.index),
                  label: `${zone.name} (${zone.led_count} LEDs)`,
                }))}
              />
            ) : null}

            <ColorInput label="Color" value={color} onChange={setColor} format="hex" />

            <Select
              label="Mode"
              value={mode}
              onChange={(value) => setMode((value ?? 'static') as LightingMode)}
              data={[
                { value: 'static', label: 'Static' },
                { value: 'breathing', label: 'Breathing' },
                { value: 'rainbow', label: 'Rainbow' },
              ]}
            />

            <Group>
              <Button onClick={() => void applyColor()}>Apply Color</Button>
              <Button variant="light" onClick={() => void applyMode()}>
                Apply Mode
              </Button>
              <Button variant="light" onClick={() => void refresh()}>
                Refresh
              </Button>
            </Group>
          </Stack>
        )}
      </SectionCard>
    </Stack>
  );
}
