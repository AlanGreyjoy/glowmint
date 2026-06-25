import { Maximize2, ZoomIn, ZoomOut } from 'lucide-react';

import {
  Button,
  EmptyState,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Spinner,
} from '@/components/ui';

import { CanvasDeviceTile } from './CanvasDeviceTile';
import { CanvasViewport } from './CanvasViewport';
import { DeviceInspector } from './DeviceInspector';
import { useCanvasDevices } from './useCanvasDevices';
import { useCanvasViewport } from './useCanvasViewport';

const ZOOM_STEP = 1.1;

export function CanvasWorkspace() {
  const {
    devices,
    selectedDevice,
    selectedKey,
    setSelectedKey,
    loading,
    saving,
    applying,
    refresh,
    updateDevice,
    moveDevice,
    saveLayout,
    applyColor,
    applyMode,
  } = useCanvasDevices();

  const viewport = useCanvasViewport();

  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex shrink-0 items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-white drop-shadow-sm">Device canvas</h2>
        <div className="flex items-center gap-2">
          <span className="min-w-10 text-center text-xs text-white/55">
            {Math.round(viewport.zoom * 100)}%
          </span>
          <Button
            variant="secondary"
            size="icon-sm"
            aria-label="Zoom out"
            onClick={() => viewport.zoomBy(1 / ZOOM_STEP)}
          >
            <ZoomOut />
          </Button>
          <Button
            variant="secondary"
            size="icon-sm"
            aria-label="Zoom in"
            onClick={() => viewport.zoomBy(ZOOM_STEP)}
          >
            <ZoomIn />
          </Button>
          <Button
            variant="secondary"
            size="icon-sm"
            aria-label="Reset view"
            onClick={viewport.resetView}
          >
            <Maximize2 />
          </Button>
          <Button variant="secondary" size="sm" onClick={() => void refresh()}>
            Refresh
          </Button>
          <Button size="sm" loading={saving} onClick={() => void saveLayout()}>
            Save layout
          </Button>
        </div>
      </div>

      {devices.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <EmptyState message="No RGB devices found. Start OpenRGB or ckb-next to populate the canvas." />
        </div>
      ) : (
        <CanvasViewport
          viewportRef={viewport.viewportRef}
          panX={viewport.panX}
          panY={viewport.panY}
          zoom={viewport.zoom}
          isSpacePressed={viewport.isSpacePressed}
          isPanning={viewport.isPanning}
          screenToWorld={viewport.screenToWorld}
          panAtClientPoint={viewport.panAtClientPoint}
          onBackgroundPointerDown={() => setSelectedKey(null)}
          onPointerDown={viewport.handlePointerDown}
          onPointerMove={viewport.handlePointerMove}
          onPointerUp={viewport.handlePointerUp}
        >
          {devices.map((device) => (
            <CanvasDeviceTile
              key={device.deviceKey}
              device={device}
              selected={selectedKey === device.deviceKey}
              onOpenSettings={setSelectedKey}
              onMove={moveDevice}
            />
          ))}
        </CanvasViewport>
      )}

      <Sheet
        open={selectedKey !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedKey(null);
        }}
      >
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{selectedDevice?.displayName ?? 'Device settings'}</SheetTitle>
            <SheetDescription>
              {selectedDevice ? `Hardware: ${selectedDevice.hardwareName}` : null}
            </SheetDescription>
          </SheetHeader>
          {selectedDevice ? (
            <DeviceInspector
              device={selectedDevice}
              saving={saving}
              applying={applying}
              onUpdate={updateDevice}
              onApplyColor={(device) => void applyColor(device)}
              onApplyMode={(device) => void applyMode(device)}
              onSaveLayout={() => void saveLayout()}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
