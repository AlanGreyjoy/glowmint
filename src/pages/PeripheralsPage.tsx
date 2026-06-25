import { useEffect, useState } from 'react';
import { openUrl } from '@tauri-apps/plugin-opener';
import { Button, ColorInput, Group, NumberInput, Stack, Text } from '@mantine/core';

import { EmptyState, ListItemCard, PageHeader, SectionCard, StatusBadge } from '../components/ui';
import { api } from '../lib/api';
import { hexToRgb } from '../lib/utils';
import type { Device } from '../lib/types';

export function PeripheralsPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [color, setColor] = useState('#ffffff');
  const [dpi, setDpi] = useState(1600);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const list = await api.listPeripherals();
      setDevices(list);
    } catch (err) {
      setMessage(String(err));
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <Stack gap="lg">
      <PageHeader
        title="Peripherals"
        description="Keyboards and mice via ckb-next"
        actions={
          <Button
            variant="light"
            onClick={() => void openUrl('https://github.com/ckb-next/ckb-next')}
          >
            Open ckb-next docs
          </Button>
        }
      />

      {message ? (
        <Text size="sm" c="cyan.2">
          {message}
        </Text>
      ) : null}

      <SectionCard title="Detected peripherals">
        {devices.length === 0 ? (
          <EmptyState message="No ckb-next devices found. Ensure ckb-next-daemon is running." />
        ) : (
          <Stack gap="md">
            {devices.map((device) => (
              <ListItemCard key={device.id} padding="md">
                <Group justify="space-between" mb="sm">
                  <div>
                    <Text fw={500}>{device.name}</Text>
                    <Text size="xs" c="dimmed">
                      {device.id}
                    </Text>
                  </div>
                  <StatusBadge status="available" label={device.kind} />
                </Group>
                <Group>
                  <Button
                    variant="light"
                    onClick={() =>
                      void api
                        .setPeripheralRgb(device.id, hexToRgb(color))
                        .then(() => setMessage(`RGB updated for ${device.name}`))
                        .catch((err) => setMessage(String(err)))
                    }
                  >
                    Apply RGB
                  </Button>
                  {device.capabilities.includes('dpi') ? (
                    <Button
                      variant="light"
                      onClick={() =>
                        void api
                          .setPeripheralDpi(device.id, dpi)
                          .then(() => setMessage(`DPI set to ${dpi}`))
                          .catch((err) => setMessage(String(err)))
                      }
                    >
                      Set DPI {dpi}
                    </Button>
                  ) : null}
                  <Button
                    variant="light"
                    onClick={() =>
                      void api
                        .switchPeripheralProfile(device.id, 1)
                        .then(() => setMessage('Switched to profile 1'))
                        .catch((err) => setMessage(String(err)))
                    }
                  >
                    Profile 1
                  </Button>
                </Group>
              </ListItemCard>
            ))}
          </Stack>
        )}
      </SectionCard>

      <SectionCard title="Controls">
        <Stack gap="md">
          <ColorInput label="RGB color" value={color} onChange={setColor} format="hex" />
          <NumberInput
            label="Mouse DPI"
            min={400}
            max={26000}
            step={100}
            value={dpi}
            onChange={(value) => setDpi(typeof value === 'number' ? value : 1600)}
          />
        </Stack>
      </SectionCard>
    </Stack>
  );
}
