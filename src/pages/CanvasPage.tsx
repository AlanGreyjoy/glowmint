import { PageHeader } from '@/components/ui';

import { CanvasWorkspace } from '@/features/canvas/CanvasWorkspace';

export function CanvasPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <PageHeader
        title="Canvas"
        description="Arrange RGB devices visually, rename them, and edit colors like iCUE."
      />
      <CanvasWorkspace />
    </div>
  );
}
