import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  resetKey?: string;
}

interface State {
  error: Error | null;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('ARTISAN_CI UI error', error, info);
    }
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  private reload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-[560px] items-center justify-center bg-[var(--artisan-surface)] px-5 py-10">
        <section className="w-full rounded-[30px] border border-black/5 bg-white p-6 text-center shadow-[var(--artisan-shadow-card)]">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[var(--artisan-danger-soft)] text-[var(--artisan-danger)]">
            <AlertTriangle size={25} />
          </span>
          <h1 className="mt-4 text-xl font-black tracking-[-0.03em] text-[var(--artisan-ink)]">Cette page a rencontré un problème</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--artisan-muted)]">
            Vos données n’ont pas été supprimées. Rechargez la page pour continuer.
          </p>
          <button
            type="button"
            onClick={this.reload}
            className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--artisan-green)] px-4 text-sm font-black text-white"
          >
            <RotateCcw size={17} /> Recharger
          </button>
        </section>
      </div>
    );
  }
}
