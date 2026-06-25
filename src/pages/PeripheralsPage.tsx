import { useEffect, useState } from 'react';
import { openUrl } from '@tauri-apps/plugin-opener';

import {
  Button,
  ColorInput,
  EmptyState,
  ListItemCard,
  NumberField,
  PageHeader,
  SectionCard,
  StatusBadge,
} from '../components/ui';
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
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Peripherals"
        description="Keyboards and mice via ckb-next"
        actions={
          <Button
            variant="secondary"
            onClick={() => void openUrl('https://github.com/ckb-next/ckb-next')}
          >
            Open ckb-next docs
          </Button>
        }
      />

      {message ? <p className="text-sm text-emerald-200">{message}</p> : null}

      <SectionCard title="Detected peripherals">
        {devices.length === 0 ? (
          <EmptyState message="No ckb-next devices found. Ensure ckb-next-daemon is running." />
        ) : (
          <div className="flex flex-col gap-4">
            {devices.map((device) => (
              <ListItemCard key={device.id} padding="md">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{device.name}</p>
                    <p className="text-xs text-muted-foreground">{device.id}</p>
                  </div>
                  <StatusBadge status="available" label={device.kind} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
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
                      variant="secondary"
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
                    variant="secondary"
                    onClick={() =>
                      void api
                        .switchPeripheralProfile(device.id, 1)
                        .then(() => setMessage('Switched to profile 1'))
                        .catch((err) => setMessage(String(err)))
                    }
                  >
                    Profile 1
                  </Button>
                </div>
              </ListItemCard>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Controls">
        <div className="flex flex-col gap-4">
          <ColorInput label="RGB color" value={color} onChange={setColor} />
          <NumberField
            label="Mouse DPI"
            min={400}
            max={26000}
            step={100}
            value={dpi}
            onChange={setDpi}
          />
        </div>
      </SectionCard>
    </div>
  );
}
