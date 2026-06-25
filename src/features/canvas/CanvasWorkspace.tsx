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
import { DeviceInspector } from './DeviceInspector';
import { useCanvasDevices } from './useCanvasDevices';

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

  if (loading) {
    return (
      <div className="flex min-h-80 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-white drop-shadow-sm">Device canvas</h2>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => void refresh()}>
            Refresh
          </Button>
          <Button size="sm" loading={saving} onClick={() => void saveLayout()}>
            Save layout
          </Button>
        </div>
      </div>

      {devices.length === 0 ? (
        <EmptyState message="No RGB devices found. Start OpenRGB or ckb-next to populate the canvas." />
      ) : (
        <div
          data-canvas-root="true"
          className="relative min-h-136 overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_55%),linear-gradient(180deg,rgba(8,18,32,0.35),rgba(4,10,18,0.65))]"
          onPointerDown={() => setSelectedKey(null)}
        >
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-size-[24px_24px]" />
          {devices.map((device) => (
            <CanvasDeviceTile
              key={device.deviceKey}
              device={device}
              selected={selectedKey === device.deviceKey}
              onOpenSettings={setSelectedKey}
              onMove={moveDevice}
            />
          ))}
        </div>
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
