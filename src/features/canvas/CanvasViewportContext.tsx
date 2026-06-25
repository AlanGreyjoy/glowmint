import { createContext, useContext } from 'react';

export interface CanvasViewportContextValue {
  panX: number;
  panY: number;
  zoom: number;
  screenToWorld: (clientX: number, clientY: number) => { x: number; y: number };
  panAtClientPoint: (clientX: number, clientY: number) => void;
}

const CanvasViewportContext = createContext<CanvasViewportContextValue | null>(null);

export function CanvasViewportProvider({
  value,
  children,
}: {
  value: CanvasViewportContextValue;
  children: React.ReactNode;
}) {
  return <CanvasViewportContext.Provider value={value}>{children}</CanvasViewportContext.Provider>;
}

export function useCanvasViewportContext() {
  const context = useContext(CanvasViewportContext);
  if (!context) {
    throw new Error('useCanvasViewportContext must be used within CanvasViewport');
  }
  return context;
}
