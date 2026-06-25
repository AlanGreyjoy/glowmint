import { useEffect, useState } from 'react';
import { Button, ColorInput, Group, Select, Stack, Text } from '@mantine/core';

import { EmptyState, PageHeader, SectionCard } from '../components/ui';
import { api } from '../lib/api';
import { hexToRgb } from '../lib/utils';
import type { LightingMode, RgbDevice } from '../lib/types';

export function LightingPage() {
  const [devices, setDevices] = useState<RgbDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [color, setColor] = useState('#00bfff');
  const [mode, setMode] = useState<LightingMode>('static');
  const [message, setMessage] = useState<string | null>(null);

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

  return (
    <Stack gap="lg">
      <PageHeader title="Lighting" description="RGB control via OpenRGB" />

      {message ? (
        <Text size="sm" c="cyan.2">
          {message}
        </Text>
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
