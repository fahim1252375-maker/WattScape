import React from 'react';

interface AppErrorBoundaryState {
  hasError: boolean;
}

/** Keeps an unexpected component failure inside a clear, recoverable product state. */
export class AppErrorBoundary extends React.Component<React.PropsWithChildren, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, info: React.ErrorInfo) {
    // Do not print component props, form values, tokens, or server response bodies.
    console.error('[WattScape] A UI component failed.', info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="min-h-screen grid place-items-center bg-[var(--ws-canvas)] p-6 text-[var(--ws-text-primary)]">
          <section className="w-full max-w-xl space-y-4 rounded-xl border border-[var(--ws-line)] bg-[var(--ws-surface-1)] p-7 shadow-[var(--ws-shadow-md)]" role="alert">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ws-danger)]">Workspace recovery</div>
            <h1 className="font-display text-2xl font-semibold">WattScape could not render this view</h1>
            <p className="text-sm leading-6 text-[var(--ws-text-secondary)]">
              Your session and saved server data have not been intentionally changed. Reload the workspace to try again.
              If the issue continues, share the time of the error with your administrator.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-md bg-[var(--ws-brand-teal)] px-4 py-2.5 text-sm font-semibold text-[var(--ws-brand-teal-fg)] transition-opacity hover:opacity-90"
            >
              Reload WattScape
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
