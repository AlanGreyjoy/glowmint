import { useSyncExternalStore } from 'react';
import { Toast as ToastPrimitive } from 'radix-ui';
import { CheckCircle2, CircleAlert, Info, X, XCircle, type LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { glassClassName, glassStyle } from '@/components/ui/GlassSurface';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
  /** Secondary line rendered under the title. */
  description?: string;
  /** Auto-dismiss delay in ms. Defaults are per-variant; pass `Infinity` to keep it sticky. */
  duration?: number;
  /** Provide a stable id to de-duplicate / replace an existing toast. */
  id?: string;
}

interface ToastRecord extends Required<Pick<ToastOptions, 'duration'>> {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  open: boolean;
}

const DEFAULT_DURATION: Record<ToastVariant, number> = {
  success: 4000,
  info: 4000,
  warning: 5000,
  error: 6000,
};

// Keep in sync with the data-closed animation below so a toast finishes its
// exit animation before it is removed from the store.
const EXIT_ANIMATION_MS = 320;

/**
 * Tiny pub/sub "alert server": a single source of truth for active toasts that
 * any layer (hooks, pages, api wrappers) can publish to without React context.
 */
class ToastStore {
  private toasts: ToastRecord[] = [];
  private listeners = new Set<() => void>();
  private removalTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private counter = 0;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = () => this.toasts;

  private notify() {
    for (const listener of this.listeners) listener();
  }

  show(variant: ToastVariant, title: string, options?: ToastOptions): string {
    const id = options?.id ?? `toast-${++this.counter}`;

    const pending = this.removalTimers.get(id);
    if (pending) {
      clearTimeout(pending);
      this.removalTimers.delete(id);
    }

    const record: ToastRecord = {
      id,
      title,
      description: options?.description,
      variant,
      duration: options?.duration ?? DEFAULT_DURATION[variant],
      open: true,
    };

    this.toasts = [...this.toasts.filter((toast) => toast.id !== id), record];
    this.notify();
    return id;
  }

  /** Start the close animation, then remove the toast once it has played. */
  dismiss = (id?: string) => {
    this.toasts = this.toasts.map((toast) =>
      id === undefined || toast.id === id ? { ...toast, open: false } : toast,
    );
    this.notify();

    for (const toast of this.toasts) {
      if (toast.open || this.removalTimers.has(toast.id)) continue;
      const timer = setTimeout(() => this.remove(toast.id), EXIT_ANIMATION_MS);
      this.removalTimers.set(toast.id, timer);
    }
  };

  private remove(id: string) {
    this.removalTimers.delete(id);
    this.toasts = this.toasts.filter((toast) => toast.id !== id);
    this.notify();
  }
}

const store = new ToastStore();

type ToastFn = (title: string, options?: ToastOptions) => string;

interface ToastApi extends ToastFn {
  success: ToastFn;
  error: ToastFn;
  info: ToastFn;
  warning: ToastFn;
  dismiss: (id?: string) => void;
}

/**
 * Publish a toast from anywhere. Prefer the variant helpers so success and
 * failure read differently in the bottom-right stack.
 *
 * @example
 * toast.success('Canvas layout saved');
 * toast.error(String(err));
 */
export const toast: ToastApi = Object.assign(
  (title: string, options?: ToastOptions) => store.show('info', title, options),
  {
    success: (title: string, options?: ToastOptions) => store.show('success', title, options),
    error: (title: string, options?: ToastOptions) => store.show('error', title, options),
    info: (title: string, options?: ToastOptions) => store.show('info', title, options),
    warning: (title: string, options?: ToastOptions) => store.show('warning', title, options),
    dismiss: store.dismiss,
  },
);

const VARIANT_META: Record<ToastVariant, { Icon: LucideIcon; iconClass: string }> = {
  success: { Icon: CheckCircle2, iconClass: 'text-emerald-300' },
  error: { Icon: XCircle, iconClass: 'text-rose-300' },
  warning: { Icon: CircleAlert, iconClass: 'text-amber-300' },
  info: { Icon: Info, iconClass: 'text-sky-300' },
};

function ToastItem({ data }: { data: ToastRecord }) {
  const { Icon, iconClass } = VARIANT_META[data.variant];

  return (
    <ToastPrimitive.Root
      open={data.open}
      duration={data.duration}
      onOpenChange={(open) => {
        if (!open) store.dismiss(data.id);
      }}
      className={cn(
        glassClassName('panel'),
        'pointer-events-auto relative flex w-full items-start gap-3 rounded-2xl p-4 pr-9 text-white shadow-[0_18px_50px_rgba(4,14,24,0.45)]',
        'duration-300 data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-right data-closed:animate-out data-closed:fade-out-0 data-closed:slide-out-to-right',
        'data-[swipe=move]:translate-x-(--radix-toast-swipe-move-x) data-[swipe=move]:transition-none data-[swipe=cancel]:translate-x-0 data-[swipe=cancel]:transition-transform data-[swipe=end]:animate-out data-[swipe=end]:slide-out-to-right',
      )}
      style={glassStyle('panel')}
    >
      <Icon className={cn('mt-0.5 size-5 shrink-0 drop-shadow-sm', iconClass)} aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <ToastPrimitive.Title className="text-sm font-medium text-white drop-shadow-sm">
          {data.title}
        </ToastPrimitive.Title>
        {data.description ? (
          <ToastPrimitive.Description className="text-sm text-white/65">
            {data.description}
          </ToastPrimitive.Description>
        ) : null}
      </div>
      <ToastPrimitive.Close
        aria-label="Dismiss"
        className="absolute top-2.5 right-2.5 rounded-md p-1 text-white/55 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        <X className="size-4" />
      </ToastPrimitive.Close>
    </ToastPrimitive.Root>
  );
}

/**
 * App-wide toast viewport. Mount once near the app root; toasts published via
 * `toast.*` render here, stacked in the bottom-right corner.
 */
export function Toaster() {
  const toasts = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

  return (
    <ToastPrimitive.Provider swipeDirection="right" duration={DEFAULT_DURATION.info}>
      {toasts.map((data) => (
        <ToastItem key={data.id} data={data} />
      ))}
      <ToastPrimitive.Viewport className="fixed right-0 bottom-0 z-10050 m-0 flex max-h-screen w-[min(100vw,420px)] list-none flex-col-reverse gap-2 p-4 outline-none" />
    </ToastPrimitive.Provider>
  );
}
