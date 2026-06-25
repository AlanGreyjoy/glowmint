import { useCallback, useEffect, useRef, useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';

import {
  Badge,
  Button,
  Checkbox,
  Label,
  ListItemCard,
  NumberField,
  PageHeader,
  SectionCard,
  Slider,
} from '../components/ui';
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

  // Path of the image currently rendered in the preview, so we don't re-fetch and re-encode
  // the same (potentially multi-MB) file when status refreshes right after applying it.
  const previewPathRef = useRef<string | null>(null);

  const setPreviewFromPath = useCallback(async (path: string) => {
    try {
      setPreviewUrl(await api.lcdPreviewDataUrl(path));
      previewPathRef.current = path;
    } catch (err) {
      setPreviewUrl(null);
      previewPathRef.current = null;
      setMessage(String(err));
    }
  }, []);

  const refreshLcd = useCallback(async () => {
    try {
      const status = await api.lcdStatus();
      setLcdStatus(status);
      const path = lcdContentPath(status.current_content);
      if (path) {
        if (previewPathRef.current !== path) {
          await setPreviewFromPath(path);
        }
      } else {
        setPreviewUrl(null);
        previewPathRef.current = null;
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
    <div className="flex flex-col gap-6">
      <PageHeader title="AIO / LCD" description="Elite LCD screen and Commander Core cooling" />

      {message ? <p className="text-sm text-emerald-200">{message}</p> : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="LCD Editor">
          <div className="mb-4 flex flex-wrap gap-2">
            <Badge
              variant="outline"
              className={
                lcdStatus?.connected
                  ? 'border-green-500/30 bg-green-500/15 text-green-400'
                  : 'border-red-500/30 bg-red-500/15 text-red-400'
              }
            >
              {lcdStatus?.connected ? 'LCD connected' : 'LCD not found'}
            </Badge>
            {lcdStatus?.looping ? (
              <Badge
                variant="outline"
                className="border-yellow-500/30 bg-yellow-500/15 text-yellow-400"
              >
                Display active
              </Badge>
            ) : null}
          </div>

          <div
            className="mx-auto mb-4 flex size-[280px] items-center justify-center overflow-hidden rounded-full bg-black/35 backdrop-blur-sm"
            style={{
              boxShadow:
                '0 0 32px rgba(34, 211, 238, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
            }}
          >
            {previewUrl ? (
              <img src={previewUrl} alt="LCD preview" className="size-full object-cover" />
            ) : (
              <span className="text-xs text-muted-foreground">480×480 preview</span>
            )}
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            <Button onClick={() => void pickAndApplyImage()}>Apply Image</Button>
            <Button variant="secondary" onClick={() => void pickAndApplyGif()}>
              Apply GIF
            </Button>
            <Button
              variant="secondary"
              onClick={() => void api.lcdStopGif().then(() => refreshLcd())}
            >
              Stop display
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <NumberField label="GIF FPS" min={1} max={30} value={fps} onChange={setFps} />
            <div className="flex items-end gap-2 pb-2">
              <Checkbox
                id="loop-gif"
                checked={loop}
                onCheckedChange={(checked) => setLoop(checked === true)}
              />
              <Label htmlFor="loop-gif">Loop GIF</Label>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Cooling">
          <div className="mb-4 grid grid-cols-2 gap-3">
            <ListItemCard>
              <p className="text-sm text-muted-foreground">Water temp</p>
              <p className="text-lg font-medium">
                {cooling?.water_temp_c != null ? `${cooling.water_temp_c.toFixed(1)}°C` : '—'}
              </p>
            </ListItemCard>
            <ListItemCard>
              <p className="text-sm text-muted-foreground">Pump RPM</p>
              <p className="text-lg font-medium">{cooling?.pump_speed_rpm ?? '—'}</p>
            </ListItemCard>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => void api.setPumpPreset('quiet').then(() => refreshCooling())}
            >
              Quiet
            </Button>
            <Button
              variant="secondary"
              onClick={() => void api.setPumpPreset('balanced').then(() => refreshCooling())}
            >
              Balanced
            </Button>
            <Button
              variant="secondary"
              onClick={() => void api.setPumpPreset('extreme').then(() => refreshCooling())}
            >
              Extreme
            </Button>
          </div>

          <div className="mb-6 space-y-2">
            <Label>Pump duty: {pumpDuty}%</Label>
            <Slider
              min={0}
              max={100}
              value={[pumpDuty]}
              onValueChange={([value]) => setPumpDuty(value)}
              onValueCommit={([value]) => void api.setPumpDuty(value).then(() => refreshCooling())}
            />
          </div>

          <div className="space-y-2">
            <Label>Fan 1 duty: {fanDuty}%</Label>
            <Slider
              min={0}
              max={100}
              value={[fanDuty]}
              onValueChange={([value]) => setFanDuty(value)}
              onValueCommit={([value]) =>
                void api.setFanDuty(1, value).then(() => refreshCooling())
              }
            />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
