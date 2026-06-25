import { createPortal } from 'react-dom';

import { GlassSurface } from './GlassSurface';
import { Spinner } from './Spinner';

interface ProgressSheetProps {
  opened: boolean;
  title: string;
  message: string;
}

export function ProgressSheet({ opened, title, message }: ProgressSheetProps) {
  if (!opened || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-[rgba(8,10,14,0.72)] backdrop-blur-md">
      <GlassSurface variant="panel" className="w-[min(90vw,440px)] max-w-[440px] p-8">
        <div className="flex flex-col items-center gap-6">
          <Spinner size="lg" />
          <div className="space-y-2 text-center">
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{message}</p>
          </div>
        </div>
      </GlassSurface>
    </div>,
    document.body,
  );
}
