import { useCallback, useEffect, useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import {
  Badge,
  Box,
  Button,
  Checkbox,
  Group,
  NumberInput,
  SimpleGrid,
  Slider,
  Stack,
  Text,
} from '@mantine/core';

import { ListItemCard, PageHeader, SectionCard } from '../components/ui';
import { api } from '../lib/api';
import { usePolling } from '../hooks/usePolling';
import type { CoolingStatus, LcdStatus } from '../lib/types';

function lcdContentPath(content: LcdStatus['current_content']): string | null {
  if (!content) return null;
  const record = content as { static?: { path?: string }; gif?: { path?: string } };
  return record.static?.path ?? record.gif?.path ?? null;
}

export function AioPage() {
  const [lcdStatus, setLcdStatus] = useState<LcdStatus | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fps, setFps] = useState(15);
  const [loop, setLoop] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [fanDuty, setFanDuty] = useState(50);
  const [pumpDuty, setPumpDuty] = useState(84);

  const { data: cooling, refresh: refreshCooling } = usePolling<CoolingStatus>(
    () => api.coolingStatus(),
    3000,
  );

  const setPreviewFromPath = useCallback(async (path: string) => {
    try {
      setPreviewUrl(await api.lcdPreviewDataUrl(path));
    } catch (err) {
      setPreviewUrl(null);
      setMessage(String(err));
    }
  }, []);

  const refreshLcd = useCallback(async () => {
    try {
      const status = await api.lcdStatus();
      setLcdStatus(status);
      const path = lcdContentPath(status.current_content);
      if (path) {
        await setPreviewFromPath(path);
      } else {
        setPreviewUrl(null);
      }
    } catch (err) {
      setMessage(String(err));
    }
  }, [setPreviewFromPath]);

  useEffect(() => {
    void refreshLcd();
    void api.coolingInitialize().catch(() => undefined);
  }, [refreshLcd]);

  const pickAndApplyImage = async () => {
    const selected = await open({
      multiple: false,
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
    });
    if (!selected || Array.isArray(selected)) return;
    await setPreviewFromPath(selected);
    try {
      await api.lcdSetImage(selected);
      setMessage('LCD image applied');
      await refreshLcd();
    } catch (err) {
      setMessage(String(err));
    }
  };

  const pickAndApplyGif = async () => {
    const selected = await open({
      multiple: false,
      filters: [{ name: 'GIF', extensions: ['gif'] }],
    });
    if (!selected || Array.isArray(selected)) return;
    await setPreviewFromPath(selected);
    try {
      await api.lcdSetGif(selected, fps, loop);
      setMessage('LCD GIF started');
      await refreshLcd();
    } catch (err) {
      setMessage(String(err));
    }
  };

  return (
    <Stack gap="lg">
      <PageHeader
        title="AIO / LCD"
        description="Elite LCD screen and Commander Core cooling"
      />

      {message ? (
        <Text size="sm" c="cyan.2">
          {message}
        </Text>
      ) : null}

      <SimpleGrid cols={{ base: 1, lg: 2 }}>
        <SectionCard title="LCD Editor">
          <Group mb="md">
            <Badge variant="light" color={lcdStatus?.connected ? 'green' : 'red'}>
              {lcdStatus?.connected ? 'LCD connected' : 'LCD not found'}
            </Badge>
            {lcdStatus?.looping ? (
              <Badge variant="light" color="yellow">
                Display active
              </Badge>
            ) : null}
          </Group>

          <Box
            mx="auto"
            mb="md"
            w={280}
            h={280}
            style={{
              borderRadius: '50%',
              background: 'rgba(0, 0, 0, 0.35)',
              backdropFilter: 'blur(8px)',
              boxShadow:
                '0 0 32px rgba(34, 211, 238, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="LCD preview"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <Text size="xs" c="dimmed">
                480×480 preview
              </Text>
            )}
          </Box>

          <Group mb="md">
            <Button onClick={() => void pickAndApplyImage()}>Apply Image</Button>
            <Button variant="light" onClick={() => void pickAndApplyGif()}>
              Apply GIF
            </Button>
            <Button
              variant="light"
              onClick={() => void api.lcdStopGif().then(() => refreshLcd())}
            >
              Stop display
            </Button>
          </Group>

          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <NumberInput
              label="GIF FPS"
              min={1}
              max={30}
              value={fps}
              onChange={(value) => setFps(typeof value === 'number' ? value : 15)}
            />
            <Checkbox
              label="Loop GIF"
              checked={loop}
              onChange={(e) => setLoop(e.currentTarget.checked)}
              mt="xl"
            />
          </SimpleGrid>
        </SectionCard>

        <SectionCard title="Cooling">
          <SimpleGrid cols={2} mb="md">
            <ListItemCard>
              <Text size="sm" c="dimmed">
                Water temp
              </Text>
              <Text size="lg" fw={500}>
                {cooling?.water_temp_c != null ? `${cooling.water_temp_c.toFixed(1)}°C` : '—'}
              </Text>
            </ListItemCard>
            <ListItemCard>
              <Text size="sm" c="dimmed">
                Pump RPM
              </Text>
              <Text size="lg" fw={500}>
                {cooling?.pump_speed_rpm ?? '—'}
              </Text>
            </ListItemCard>
          </SimpleGrid>

          <Group mb="md">
            <Button
              variant="light"
              onClick={() => void api.setPumpPreset('quiet').then(() => refreshCooling())}
            >
              Quiet
            </Button>
            <Button
              variant="light"
              onClick={() => void api.setPumpPreset('balanced').then(() => refreshCooling())}
            >
              Balanced
            </Button>
            <Button
              variant="light"
              onClick={() => void api.setPumpPreset('extreme').then(() => refreshCooling())}
            >
              Extreme
            </Button>
          </Group>

          <Slider
            label={(value) => `Pump duty: ${value}%`}
            min={0}
            max={100}
            value={pumpDuty}
            onChange={setPumpDuty}
            onChangeEnd={(value) => void api.setPumpDuty(value).then(() => refreshCooling())}
            mb="lg"
          />

          <Slider
            label={(value) => `Fan 1 duty: ${value}%`}
            min={0}
            max={100}
            value={fanDuty}
            onChange={setFanDuty}
            onChangeEnd={(value) => void api.setFanDuty(1, value).then(() => refreshCooling())}
          />
        </SectionCard>
      </SimpleGrid>
    </Stack>
  );
}
