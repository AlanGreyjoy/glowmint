import type { CanvasDeviceType } from '@/lib/types';

interface DeviceShapeProps {
  type: CanvasDeviceType;
  color: string;
  selected?: boolean;
}

export function DeviceShape({ type, color, selected }: DeviceShapeProps) {
  const stroke = selected ? '#ffffff' : 'rgba(255,255,255,0.35)';
  const glow = selected ? 'drop-shadow(0 0 12px rgba(255,255,255,0.45))' : undefined;

  return (
    <svg viewBox="0 0 96 96" className="h-20 w-20" style={{ filter: glow }} aria-hidden="true">
      <defs>
        <linearGradient id={`device-fill-${type}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.95" />
          <stop offset="100%" stopColor={color} stopOpacity="0.55" />
        </linearGradient>
      </defs>

      {type === 'fan' ? <FanShape stroke={stroke} fill={`url(#device-fill-${type})`} /> : null}
      {type === 'ram' ? <RamShape stroke={stroke} fill={`url(#device-fill-${type})`} /> : null}
      {type === 'aio' ? <AioShape stroke={stroke} fill={`url(#device-fill-${type})`} /> : null}
      {type === 'gpu' ? <GpuShape stroke={stroke} fill={`url(#device-fill-${type})`} /> : null}
      {type === 'keyboard' ? (
        <KeyboardShape stroke={stroke} fill={`url(#device-fill-${type})`} />
      ) : null}
      {type === 'mouse' ? <MouseShape stroke={stroke} fill={`url(#device-fill-${type})`} /> : null}
      {type === 'controller' ? (
        <ControllerShape stroke={stroke} fill={`url(#device-fill-${type})`} />
      ) : null}
      {type === 'strip' ? <StripShape stroke={stroke} fill={`url(#device-fill-${type})`} /> : null}
      {type === 'unknown' ? (
        <UnknownShape stroke={stroke} fill={`url(#device-fill-${type})`} />
      ) : null}
    </svg>
  );
}

function FanShape({ stroke, fill }: { stroke: string; fill: string }) {
  return (
    <>
      <circle
        cx="48"
        cy="48"
        r="34"
        fill="rgba(255,255,255,0.08)"
        stroke={stroke}
        strokeWidth="2"
      />
      <circle
        cx="48"
        cy="48"
        r="8"
        fill="rgba(255,255,255,0.18)"
        stroke={stroke}
        strokeWidth="1.5"
      />
      {[0, 60, 120, 180, 240, 300].map((angle) => (
        <path
          key={angle}
          d="M48 48 L48 18 Q56 30 48 48"
          fill={fill}
          stroke={stroke}
          strokeWidth="1.5"
          transform={`rotate(${angle} 48 48)`}
        />
      ))}
    </>
  );
}

function RamShape({ stroke, fill }: { stroke: string; fill: string }) {
  return (
    <>
      <rect
        x="18"
        y="24"
        width="24"
        height="48"
        rx="4"
        fill={fill}
        stroke={stroke}
        strokeWidth="2"
      />
      <rect
        x="54"
        y="24"
        width="24"
        height="48"
        rx="4"
        fill={fill}
        stroke={stroke}
        strokeWidth="2"
      />
      {[30, 42, 54, 66].map((y) => (
        <rect key={y} x="22" y={y} width="16" height="4" rx="1" fill="rgba(255,255,255,0.35)" />
      ))}
      {[30, 42, 54, 66].map((y) => (
        <rect
          key={`b-${y}`}
          x="58"
          y={y}
          width="16"
          height="4"
          rx="1"
          fill="rgba(255,255,255,0.35)"
        />
      ))}
    </>
  );
}

function AioShape({ stroke, fill }: { stroke: string; fill: string }) {
  return (
    <>
      <circle cx="48" cy="48" r="28" fill={fill} stroke={stroke} strokeWidth="2" />
      <rect
        x="42"
        y="10"
        width="12"
        height="18"
        rx="3"
        fill="rgba(255,255,255,0.18)"
        stroke={stroke}
      />
      <rect
        x="42"
        y="68"
        width="12"
        height="18"
        rx="3"
        fill="rgba(255,255,255,0.18)"
        stroke={stroke}
      />
      <circle
        cx="48"
        cy="48"
        r="10"
        fill="rgba(255,255,255,0.2)"
        stroke={stroke}
        strokeWidth="1.5"
      />
    </>
  );
}

function GpuShape({ stroke, fill }: { stroke: string; fill: string }) {
  return (
    <>
      <rect
        x="12"
        y="30"
        width="72"
        height="36"
        rx="6"
        fill={fill}
        stroke={stroke}
        strokeWidth="2"
      />
      <rect
        x="18"
        y="36"
        width="44"
        height="24"
        rx="3"
        fill="rgba(255,255,255,0.18)"
        stroke={stroke}
      />
      <rect
        x="66"
        y="40"
        width="12"
        height="16"
        rx="2"
        fill="rgba(255,255,255,0.25)"
        stroke={stroke}
      />
      <line x1="12" y1="54" x2="6" y2="54" stroke={stroke} strokeWidth="2" />
      <line x1="84" y1="54" x2="90" y2="54" stroke={stroke} strokeWidth="2" />
    </>
  );
}

function KeyboardShape({ stroke, fill }: { stroke: string; fill: string }) {
  return (
    <>
      <rect
        x="10"
        y="34"
        width="76"
        height="28"
        rx="6"
        fill={fill}
        stroke={stroke}
        strokeWidth="2"
      />
      {Array.from({ length: 5 }).map((_, row) =>
        Array.from({ length: 10 }).map((__, col) => (
          <rect
            key={`${row}-${col}`}
            x={16 + col * 6.5}
            y={40 + row * 4.5}
            width="4.5"
            height="3"
            rx="0.8"
            fill="rgba(255,255,255,0.28)"
          />
        )),
      )}
    </>
  );
}

function MouseShape({ stroke, fill }: { stroke: string; fill: string }) {
  return (
    <>
      <path
        d="M48 16 C32 16 24 28 24 48 C24 68 34 80 48 80 C62 80 72 68 72 48 C72 28 64 16 48 16 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="2"
      />
      <line x1="48" y1="16" x2="48" y2="44" stroke={stroke} strokeWidth="1.5" />
      <ellipse cx="48" cy="30" rx="4" ry="6" fill="rgba(255,255,255,0.25)" />
    </>
  );
}

function ControllerShape({ stroke, fill }: { stroke: string; fill: string }) {
  return (
    <>
      <rect
        x="16"
        y="28"
        width="64"
        height="40"
        rx="8"
        fill={fill}
        stroke={stroke}
        strokeWidth="2"
      />
      <circle cx="30" cy="48" r="6" fill="rgba(255,255,255,0.22)" stroke={stroke} />
      <circle cx="66" cy="48" r="6" fill="rgba(255,255,255,0.22)" stroke={stroke} />
      <rect
        x="42"
        y="38"
        width="12"
        height="20"
        rx="2"
        fill="rgba(255,255,255,0.18)"
        stroke={stroke}
      />
    </>
  );
}

function StripShape({ stroke, fill }: { stroke: string; fill: string }) {
  return (
    <>
      <rect
        x="14"
        y="42"
        width="68"
        height="12"
        rx="6"
        fill={fill}
        stroke={stroke}
        strokeWidth="2"
      />
      {Array.from({ length: 8 }).map((_, index) => (
        <circle
          key={index}
          cx={22 + index * 8}
          cy="48"
          r="2.5"
          fill="rgba(255,255,255,0.45)"
          stroke={stroke}
          strokeWidth="1"
        />
      ))}
    </>
  );
}

function UnknownShape({ stroke, fill }: { stroke: string; fill: string }) {
  return (
    <>
      <rect
        x="24"
        y="24"
        width="48"
        height="48"
        rx="10"
        fill={fill}
        stroke={stroke}
        strokeWidth="2"
      />
      <path
        d="M48 34 L48 52 M48 58 L48 60"
        stroke="rgba(255,255,255,0.85)"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </>
  );
}
