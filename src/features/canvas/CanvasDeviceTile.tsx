import { useRef } from 'react';
import { Settings } from 'lucide-react';

import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';

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
  const dragState = useRef<{ offsetX: number; offsetY: number } | null>(null);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);

    const canvas = event.currentTarget.closest('[data-canvas-root="true"]') as HTMLElement | null;
    const bounds = canvas?.getBoundingClientRect();
    const originLeft = bounds?.left ?? 0;
    const originTop = bounds?.top ?? 0;

    dragState.current = {
      offsetX: event.clientX - originLeft - device.x,
      offsetY: event.clientY - originTop - device.y,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current) return;

    const canvas = event.currentTarget.closest('[data-canvas-root="true"]') as HTMLElement | null;
    const bounds = canvas?.getBoundingClientRect();
    const originLeft = bounds?.left ?? 0;
    const originTop = bounds?.top ?? 0;
    const minX = 8;
    const minY = 8;
    const maxX = bounds ? bounds.width - 120 : 640;
    const maxY = bounds ? bounds.height - 120 : 480;

    const nextX = Math.min(
      maxX,
      Math.max(minX, event.clientX - originLeft - dragState.current.offsetX),
    );
    const nextY = Math.min(
      maxY,
      Math.max(minY, event.clientY - originTop - dragState.current.offsetY),
    );

    onMove(device.deviceKey, nextX, nextY);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    dragState.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
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
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
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
