import { useCallback, useEffect, useRef, useState } from 'react';

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;
const ZOOM_STEP = 1.1;

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

export function useCanvasViewport() {
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const panDragRef = useRef<{
    startX: number;
    startY: number;
    panX: number;
    panY: number;
  } | null>(null);
  const [viewportElement, setViewportElement] = useState<HTMLDivElement | null>(null);
  const panXRef = useRef(0);
  const panYRef = useRef(0);
  const zoomRef = useRef(1);
  panXRef.current = panX;
  panYRef.current = panY;
  zoomRef.current = zoom;

  const viewportRef = useCallback((node: HTMLDivElement | null) => {
    setViewportElement(node);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || event.repeat || isEditableTarget(event.target)) return;
      event.preventDefault();
      setIsSpacePressed(true);
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code !== 'Space') return;
      setIsSpacePressed(false);
      panDragRef.current = null;
      setIsPanning(false);
    };

    const onBlur = () => {
      setIsSpacePressed(false);
      panDragRef.current = null;
      setIsPanning(false);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  const getViewportRect = useCallback(() => {
    return viewportElement?.getBoundingClientRect() ?? new DOMRect();
  }, [viewportElement]);

  const viewportStateRef = useRef({ getViewportRect });
  viewportStateRef.current = { getViewportRect };

  const screenToWorld = useCallback((clientX: number, clientY: number) => {
    const bounds = viewportStateRef.current.getViewportRect();
    return {
      x: (clientX - bounds.left - panXRef.current) / zoomRef.current,
      y: (clientY - bounds.top - panYRef.current) / zoomRef.current,
    };
  }, []);

  const panAtClientPoint = useCallback((clientX: number, clientY: number) => {
    const bounds = viewportStateRef.current.getViewportRect();
    const edge = 48;
    const speed = 14;
    let dx = 0;
    let dy = 0;

    if (clientX < bounds.left + edge) dx = speed;
    else if (clientX > bounds.right - edge) dx = -speed;
    if (clientY < bounds.top + edge) dy = speed;
    else if (clientY > bounds.bottom - edge) dy = -speed;

    if (dx !== 0) {
      panXRef.current += dx;
      setPanX(panXRef.current);
    }
    if (dy !== 0) {
      panYRef.current += dy;
      setPanY(panYRef.current);
    }
  }, []);

  const zoomAtPoint = useCallback(
    (clientX: number, clientY: number, factor: number) => {
      const bounds = getViewportRect();
      const mouseX = clientX - bounds.left;
      const mouseY = clientY - bounds.top;
      const worldX = (mouseX - panX) / zoom;
      const worldY = (mouseY - panY) / zoom;
      const nextZoom = clampZoom(zoom * factor);

      setPanX(mouseX - worldX * nextZoom);
      setPanY(mouseY - worldY * nextZoom);
      setZoom(nextZoom);
    },
    [getViewportRect, panX, panY, zoom],
  );

  const zoomAtPointRef = useRef(zoomAtPoint);
  zoomAtPointRef.current = zoomAtPoint;

  useEffect(() => {
    if (!viewportElement) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const factor = event.deltaY > 0 ? 1 / ZOOM_STEP : ZOOM_STEP;
      zoomAtPointRef.current(event.clientX, event.clientY, factor);
    };

    viewportElement.addEventListener('wheel', onWheel, { passive: false });
    return () => viewportElement.removeEventListener('wheel', onWheel);
  }, [viewportElement]);

  const zoomBy = useCallback(
    (factor: number) => {
      const bounds = getViewportRect();
      zoomAtPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2, factor);
    },
    [getViewportRect, zoomAtPoint],
  );

  const resetView = useCallback(() => {
    setPanX(0);
    setPanY(0);
    setZoom(1);
  }, []);

  const shouldStartPan = useCallback(
    (event: React.PointerEvent) => {
      if (event.button === 1) return true;
      if (event.button === 0 && isSpacePressed) return true;
      return false;
    },
    [isSpacePressed],
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!shouldStartPan(event)) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      panDragRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        panX,
        panY,
      };
      setIsPanning(true);
    },
    [panX, panY, shouldStartPan],
  );

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!panDragRef.current) return;
    const deltaX = event.clientX - panDragRef.current.startX;
    const deltaY = event.clientY - panDragRef.current.startY;
    setPanX(panDragRef.current.panX + deltaX);
    setPanY(panDragRef.current.panY + deltaY);
  }, []);

  const handlePointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!panDragRef.current) return;
    panDragRef.current = null;
    setIsPanning(false);
    event.currentTarget.releasePointerCapture(event.pointerId);
  }, []);

  return {
    viewportRef,
    panX,
    panY,
    zoom,
    isSpacePressed,
    isPanning,
    screenToWorld,
    panAtClientPoint,
    zoomBy,
    resetView,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}
