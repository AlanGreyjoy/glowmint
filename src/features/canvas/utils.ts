import type {
  CanvasDeviceLayout,
  CanvasDeviceSource,
  CanvasDeviceType,
  Device,
  DeviceKind,
  LightingMode,
  RgbColor,
  RgbDevice,
} from '@/lib/types';
import { rgbToHex } from '@/lib/utils';

export interface CanvasDeviceView {
  deviceKey: string;
  source: CanvasDeviceSource;
  displayName: string;
  deviceType: CanvasDeviceType;
  x: number;
  y: number;
  color: string;
  lightingMode: LightingMode;
  zoneIndex: number | null;
  hardwareName: string;
  openrgbIndex?: number;
  peripheralId?: string;
  zones: Array<{ index: number; name: string; ledCount: number; color?: RgbColor }>;
}

const DEFAULT_COLOR: RgbColor = { r: 0, g: 191, b: 255 };

function resolveDeviceColor(
  zones: Array<{ index: number; color?: RgbColor }>,
  zoneIndex: number | null,
  layoutColor?: RgbColor,
): string {
  const selectedZone =
    zoneIndex !== null ? zones.find((zone) => zone.index === zoneIndex) : zones[0];

  if (selectedZone?.color) {
    return rgbToHex(selectedZone.color);
  }

  const firstZoneColor = zones.find((zone) => zone.color)?.color;
  if (firstZoneColor) {
    return rgbToHex(firstZoneColor);
  }

  if (layoutColor) {
    return rgbToHex(layoutColor);
  }

  return rgbToHex(DEFAULT_COLOR);
}

export function openRgbDeviceKey(index: number) {
  return `openrgb:${index}`;
}

export function peripheralDeviceKey(id: string) {
  return `peripheral:${id}`;
}

export function inferDeviceTypeFromName(name: string): CanvasDeviceType {
  const lower = name.toLowerCase();

  if (/(fan|cooler|ml120|ql120|ll120|sp120|af120|nf-a|tach)/.test(lower)) return 'fan';
  if (/(ram|memory|dimm|vengeance|dominator|trident)/.test(lower)) return 'ram';
  if (/(aio|hydro|h150|h170|liquid|pump|capellix|elite cap)/.test(lower)) return 'aio';
  if (/(gpu|graphics|video|rtx|gtx|geforce|radeon|4090|4080|4070)/.test(lower)) return 'gpu';
  if (/(keyboard|k70|k95|k100|strafe|apex)/.test(lower)) return 'keyboard';
  if (/(mouse|m65|m75|glaive|dark core|viper)/.test(lower)) return 'mouse';
  if (/(strip|led strip|lighting node|ls100|pro strip)/.test(lower)) return 'strip';
  if (/(commander|node|hub|controller|lighting pro|lighting core)/.test(lower)) return 'controller';

  return 'unknown';
}

export function inferDeviceTypeFromKind(kind: DeviceKind): CanvasDeviceType {
  switch (kind) {
    case 'keyboard':
      return 'keyboard';
    case 'mouse':
      return 'mouse';
    case 'aio_cooler':
      return 'aio';
    case 'rgb_controller':
      return 'controller';
    default:
      return 'unknown';
  }
}

function defaultGridPosition(index: number) {
  const column = index % 4;
  const row = Math.floor(index / 4);
  return {
    x: 48 + column * 168,
    y: 48 + row * 148,
  };
}

function layoutToView(
  layout: CanvasDeviceLayout | undefined,
  defaults: Omit<
    CanvasDeviceView,
    'x' | 'y' | 'displayName' | 'deviceType' | 'color' | 'lightingMode' | 'zoneIndex'
  >,
  index: number,
  inferredType: CanvasDeviceType,
  hardwareName: string,
): CanvasDeviceView {
  const position = layout ? { x: layout.x, y: layout.y } : defaultGridPosition(index);
  const zoneIndex = layout?.zone_index ?? defaults.zones[0]?.index ?? null;

  return {
    ...defaults,
    displayName: layout?.display_name ?? hardwareName,
    deviceType: layout?.device_type ?? inferredType,
    x: position.x,
    y: position.y,
    color: resolveDeviceColor(defaults.zones, zoneIndex, layout?.color),
    lightingMode: layout?.lighting_mode ?? 'static',
    zoneIndex,
  };
}

export function mergeCanvasDevices(
  rgbDevices: RgbDevice[],
  peripherals: Device[],
  savedLayouts: CanvasDeviceLayout[],
): CanvasDeviceView[] {
  const layoutByKey = new Map(savedLayouts.map((entry) => [entry.device_key, entry]));
  const items: CanvasDeviceView[] = [];
  let index = 0;

  for (const device of rgbDevices) {
    const deviceKey = openRgbDeviceKey(device.index);
    const layout = layoutByKey.get(deviceKey);
    const zones = device.zones.map((zone) => ({
      index: zone.index,
      name: zone.name,
      ledCount: zone.led_count,
      color: zone.color,
    }));

    items.push(
      layoutToView(
        layout,
        {
          deviceKey,
          source: 'open_rgb',
          hardwareName: device.name,
          openrgbIndex: device.index,
          zones,
        },
        index,
        inferDeviceTypeFromName(device.name),
        device.name,
      ),
    );
    index += 1;
  }

  for (const device of peripherals) {
    if (!device.capabilities.includes('rgb')) continue;

    const deviceKey = peripheralDeviceKey(device.id);
    const layout = layoutByKey.get(deviceKey);

    items.push(
      layoutToView(
        layout,
        {
          deviceKey,
          source: 'peripheral',
          hardwareName: device.name,
          peripheralId: device.id,
          zones: [],
        },
        index,
        inferDeviceTypeFromKind(device.kind),
        device.name,
      ),
    );
    index += 1;
  }

  return items;
}

export function canvasDevicesToLayout(devices: CanvasDeviceView[]): CanvasDeviceLayout[] {
  return devices.map((device) => ({
    device_key: device.deviceKey,
    source: device.source,
    display_name: device.displayName,
    device_type: device.deviceType,
    x: device.x,
    y: device.y,
    color: hexToRgbColor(device.color),
    lighting_mode: device.source === 'open_rgb' ? device.lightingMode : undefined,
    zone_index: device.zoneIndex ?? undefined,
  }));
}

function hexToRgbColor(hex: string): RgbColor {
  const normalized = hex.replace('#', '');
  return {
    r: parseInt(normalized.slice(0, 2), 16) || 0,
    g: parseInt(normalized.slice(2, 4), 16) || 0,
    b: parseInt(normalized.slice(4, 6), 16) || 0,
  };
}

export const CANVAS_DEVICE_TYPES: Array<{ value: CanvasDeviceType; label: string }> = [
  { value: 'fan', label: 'Fan' },
  { value: 'ram', label: 'RAM' },
  { value: 'aio', label: 'AIO' },
  { value: 'gpu', label: 'Video card' },
  { value: 'keyboard', label: 'Keyboard' },
  { value: 'mouse', label: 'Mouse' },
  { value: 'controller', label: 'Controller' },
  { value: 'strip', label: 'LED strip' },
  { value: 'unknown', label: 'Unknown' },
];
