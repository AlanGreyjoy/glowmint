import { Component, type ErrorInfo, type ReactNode } from 'react';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    error: null,
    errorInfo: null,
    copied: false,
  };

  private copyResetId: number | null = null;

  static getDerivedStateFromError(error: Error): Partial<AppErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error('Glowmint render error', error, errorInfo);
  }

  componentWillUnmount() {
    if (this.copyResetId != null) {
      window.clearTimeout(this.copyResetId);
    }
  }

  private errorText() {
    const { error, errorInfo } = this.state;
    if (!error) return '';

    return [
      'Glowmint render error',
      '',
      error.stack ?? error.message,
      errorInfo?.componentStack ? `Component stack:${errorInfo.componentStack}` : null,
    ]
      .filter(Boolean)
      .join('\n\n');
  }

  private async copyError() {
    await navigator.clipboard.writeText(this.errorText());
    this.setState({ copied: true });

    if (this.copyResetId != null) {
      window.clearTimeout(this.copyResetId);
    }

    this.copyResetId = window.setTimeout(() => {
      this.setState({ copied: false });
      this.copyResetId = null;
    }, 2000);
  }

  render() {
    const { error, errorInfo, copied } = this.state;

    if (!error) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-white">
        <div className="glowmint-glass glowmint-glass--panel w-full max-w-2xl rounded-3xl p-6 shadow-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-rose-100/80">
            Glowmint crashed
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
            Something broke while rendering the app.
          </h1>
          <p className="mt-3 text-sm leading-6 text-white/70">
            The app is still running, but React hit an unrecoverable UI error. Reload the window
            after fixing the issue, or check the details below while debugging.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded-xl bg-emerald-200/22 px-3 py-2 text-sm font-medium text-white shadow-[0_10px_28px_rgba(4,14,24,0.12)] transition hover:bg-emerald-200/30"
              onClick={() => void this.copyError()}
            >
              {copied ? 'Copied' : 'Copy error'}
            </button>
            <button
              type="button"
              className="rounded-xl bg-white/22 px-3 py-2 text-sm font-medium text-white shadow-[0_10px_28px_rgba(4,14,24,0.12)] transition hover:bg-white/30"
              onClick={() => window.location.reload()}
            >
              Reload Glowmint
            </button>
          </div>

          <details className="mt-5 rounded-2xl bg-white/10 p-4 text-sm text-white/72">
            <summary className="cursor-pointer font-medium text-white">Error details</summary>
            <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap wrap-break-word text-xs leading-5">
              {error.stack ?? error.message}
              {errorInfo?.componentStack ? `\n\nComponent stack:${errorInfo.componentStack}` : ''}
            </pre>
          </details>
        </div>
      </div>
    );
  }
}
