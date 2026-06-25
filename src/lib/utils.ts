export function statusBadgeColor(status: string): 'green' | 'yellow' | 'red' | 'gray' {
  if (
    status === 'available' ||
    status === 'connected' ||
    status === 'detected' ||
    status === 'pass'
  )
    return 'green';
  if (status === 'partial' || status === 'warn') return 'yellow';
  if (status === 'unavailable' || status === 'fail') return 'red';
  return 'gray';
}

export function rgbToHex(color: { r: number; g: number; b: number }) {
  return `#${[color.r, color.g, color.b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace('#', '');
  return {
    r: parseInt(normalized.slice(0, 2), 16) || 0,
    g: parseInt(normalized.slice(2, 4), 16) || 0,
    b: parseInt(normalized.slice(4, 6), 16) || 0,
  };
}
