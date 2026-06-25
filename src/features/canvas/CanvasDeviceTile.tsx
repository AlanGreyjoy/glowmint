import { useRef } from 'react';
import { Settings } from 'lucide-react';

import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';

import { useCanvasViewportContext } from './CanvasViewportContext';
import { DeviceShape } from './DeviceShapes';
import type { CanvasDeviceView } from './utils';

interface CanvasDeviceTileProps {
  device: CanvasDeviceView;
  selected: boolean;
  onOpenSettings: (deviceKey: string) => void;
  onMove: (deviceKey: string, x: number, y: number) => void;
}

export function CanvasDeviceTile({
  device,
  selected,
  onOpenSettings,
  onMove,
}: CanvasDeviceTileProps) {
  const { screenToWorld, panAtClientPoint } = useCanvasViewportContext();
  const dragCleanupRef = useRef<(() => void) | null>(null);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;

    event.stopPropagation();
    dragCleanupRef.current?.();

    const world = screenToWorld(event.clientX, event.clientY);
    const offsetX = world.x - device.x;
    const offsetY = world.y - device.y;

    const onPointerMove = (moveEvent: PointerEvent) => {
      panAtClientPoint(moveEvent.clientX, moveEvent.clientY);
      const nextWorld = screenToWorld(moveEvent.clientX, moveEvent.clientY);
      onMove(device.deviceKey, nextWorld.x - offsetX, nextWorld.y - offsetY);
    };

    const onPointerEnd = () => {
      dragCleanupRef.current?.();
      dragCleanupRef.current = null;
    };

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerEnd);
    document.addEventListener('pointercancel', onPointerEnd);

    dragCleanupRef.current = () => {
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerEnd);
      document.removeEventListener('pointercancel', onPointerEnd);
    };
  };

  return (
    <div
      className={cn(
        'absolute touch-none select-none rounded-2xl border px-3 py-2 transition-shadow',
        selected
          ? 'border-white/70 bg-white/16 shadow-[0_0_0_1px_rgba(255,255,255,0.25),0_16px_40px_rgba(8,20,40,0.35)]'
          : 'border-white/18 bg-white/8 hover:border-white/35 hover:bg-white/12',
      )}
      style={{ left: device.x, top: device.y, width: 132 }}
      onPointerDown={handlePointerDown}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="absolute top-1.5 right-1.5 bg-white/10 hover:bg-white/20"
        aria-label={`Settings for ${device.displayName}`}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          onOpenSettings(device.deviceKey);
        }}
      >
        <Settings />
      </Button>
      <div className="flex flex-col items-center gap-2 pt-1">
        <DeviceShape type={device.deviceType} color={device.color} selected={selected} />
        <div className="w-full text-center">
          <p className="truncate text-sm font-medium text-white">{device.displayName}</p>
          <p className="truncate text-[0.68rem] uppercase tracking-wide text-white/55">
            {device.deviceType.replace('_', ' ')}
          </p>
        </div>
      </div>
    </div>
  );
}
