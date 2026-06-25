import { useEffect, useState } from 'react';
import { openUrl } from '@tauri-apps/plugin-opener';
import {
  Badge,
  Button,
  ColorInput,
  Group,
  NumberInput,
  Paper,
  Stack,
  Text,
  Title,
} from '@mantine/core';

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
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={2}>Peripherals</Title>
          <Text size="sm" c="dimmed">
            Keyboards and mice via ckb-next
          </Text>
        </div>
        <Button
          variant="light"
          onClick={() => void openUrl('https://github.com/ckb-next/ckb-next')}
        >
          Open ckb-next docs
        </Button>
      </Group>

      {message ? (
        <Text size="sm" c="cyan.2">
          {message}
        </Text>
      ) : null}

      <Paper p="md" withBorder>
        <Title order={4} mb="md">
          Detected peripherals
        </Title>
        {devices.length === 0 ? (
          <Text size="sm" c="dimmed">
            No ckb-next devices found. Ensure ckb-next-daemon is running.
          </Text>
        ) : (
          <Stack gap="md">
            {devices.map((device) => (
              <Paper key={device.id} p="md" withBorder bg="dark.8">
                <Group justify="space-between" mb="sm">
                  <div>
                    <Text fw={500}>{device.name}</Text>
                    <Text size="xs" c="dimmed">
                      {device.id}
                    </Text>
                  </div>
                  <Badge color="green">{device.kind}</Badge>
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
              </Paper>
            ))}
          </Stack>
        )}
      </Paper>

      <Paper p="md" withBorder>
        <Title order={4} mb="md">
          Controls
        </Title>
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
      </Paper>
    </Stack>
  );
}
