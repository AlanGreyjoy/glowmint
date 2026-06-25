import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

import { CanvasViewportProvider } from './CanvasViewportContext';

interface CanvasViewportProps {
  viewportRef: (node: HTMLDivElement | null) => void;
  panX: number;
  panY: number;
  zoom: number;
  isSpacePressed: boolean;
  isPanning: boolean;
  screenToWorld: (clientX: number, clientY: number) => { x: number; y: number };
  panAtClientPoint: (clientX: number, clientY: number) => void;
  onBackgroundPointerDown?: () => void;
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: React.PointerEvent<HTMLDivElement>) => void;
  children: ReactNode;
}

export function CanvasViewport({
  viewportRef,
  panX,
  panY,
  zoom,
  isSpacePressed,
  isPanning,
  screenToWorld,
  panAtClientPoint,
  onBackgroundPointerDown,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  children,
}: CanvasViewportProps) {
  const handleViewportPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button === 0 && !isSpacePressed) {
      onBackgroundPointerDown?.();
      return;
    }
    onPointerDown(event);
  };

  return (
    <CanvasViewportProvider value={{ panX, panY, zoom, screenToWorld, panAtClientPoint }}>
      <div
        ref={viewportRef}
        data-canvas-viewport="true"
        className={cn(
          'relative min-h-0 flex-1 touch-none overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_55%),linear-gradient(180deg,rgba(8,18,32,0.35),rgba(4,10,18,0.65))]',
          isSpacePressed && !isPanning && 'cursor-grab',
          isPanning && 'cursor-grabbing',
        )}
        onPointerDown={handleViewportPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-size-[24px_24px]"
          style={{
            backgroundPosition: `${panX % 24}px ${panY % 24}px`,
          }}
        />
        <div
          data-canvas-world="true"
          className="absolute left-0 top-0 z-1 origin-top-left"
          style={{
            transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
            width: 8192,
            height: 8192,
          }}
        >
          {children}
        </div>
      </div>
    </CanvasViewportProvider>
  );
}
