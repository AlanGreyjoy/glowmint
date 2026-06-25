import {
  Button,
  ColorInput,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import type { CanvasDeviceType, LightingMode } from '@/lib/types';
import { rgbToHex } from '@/lib/utils';

import { CANVAS_DEVICE_TYPES, type CanvasDeviceView } from './utils';

interface DeviceInspectorProps {
  device: CanvasDeviceView;
  saving: boolean;
  applying: boolean;
  onUpdate: (deviceKey: string, patch: Partial<CanvasDeviceView>) => void;
  onApplyColor: (device: CanvasDeviceView) => void;
  onApplyMode: (device: CanvasDeviceView) => void;
  onSaveLayout: () => void;
}

export function DeviceInspector({
  device,
  saving,
  applying,
  onUpdate,
  onApplyColor,
  onApplyMode,
  onSaveLayout,
}: DeviceInspectorProps) {
  return (
    <div className="flex flex-col gap-4 overflow-y-auto pb-4">
      <div className="space-y-2">
        <Label htmlFor="canvas-device-name">Display name</Label>
        <Input
          id="canvas-device-name"
          value={device.displayName}
          onChange={(event) => onUpdate(device.deviceKey, { displayName: event.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label>Device type</Label>
        <Select
          value={device.deviceType}
          onValueChange={(value) =>
            onUpdate(device.deviceKey, { deviceType: value as CanvasDeviceType })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CANVAS_DEVICE_TYPES.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ColorInput
        label="Color"
        value={device.color}
        onChange={(value) => onUpdate(device.deviceKey, { color: value })}
      />

      {device.source === 'open_rgb' && device.zones.length > 0 ? (
        <div className="space-y-2">
          <Label>Zone</Label>
          <Select
            value={device.zoneIndex !== null ? String(device.zoneIndex) : undefined}
            onValueChange={(value) => {
              const zoneIndex = Number(value);
              const zone = device.zones.find((entry) => entry.index === zoneIndex);
              onUpdate(device.deviceKey, {
                zoneIndex,
                ...(zone?.color ? { color: rgbToHex(zone.color) } : {}),
              });
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select zone" />
            </SelectTrigger>
            <SelectContent>
              {device.zones.map((zone) => (
                <SelectItem key={zone.index} value={String(zone.index)}>
                  {zone.name} ({zone.ledCount} LEDs)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {device.source === 'open_rgb' ? (
        <div className="space-y-2">
          <Label>Lighting mode</Label>
          <Select
            value={device.lightingMode}
            onValueChange={(value) =>
              onUpdate(device.deviceKey, { lightingMode: value as LightingMode })
            }
          >
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
      ) : null}

      <div className="flex flex-wrap gap-2 pt-2">
        <Button loading={applying} onClick={() => onApplyColor(device)}>
          Apply color
        </Button>
        {device.source === 'open_rgb' ? (
          <Button variant="secondary" loading={applying} onClick={() => onApplyMode(device)}>
            Apply mode
          </Button>
        ) : null}
        <Button variant="secondary" loading={saving} onClick={onSaveLayout}>
          Save layout
        </Button>
      </div>
    </div>
  );
}
