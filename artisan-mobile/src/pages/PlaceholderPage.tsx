import { ArrowLeft, Construction } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MobileTopBar } from '../components/MobileTopBar';

export function PlaceholderPage({ title }: { title: string }) {
  const navigate = useNavigate();

  return (
    <div>
      <MobileTopBar />
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-[var(--artisan-green)]"
      >
        <ArrowLeft size={17} /> Retour
      </button>

      <div className="grid min-h-[55dvh] place-items-center text-center">
        <div>
          <span className="mx-auto grid size-16 place-items-center rounded-3xl bg-[var(--artisan-orange-soft)] text-[var(--artisan-orange)]">
            <Construction size={28} />
          </span>
          <h1 className="mt-5 text-2xl font-black tracking-[-0.04em] text-[var(--artisan-ink)]">{title}</h1>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-[var(--artisan-muted)]">
            Ce module sera raccordé à l’API ARTISAN_CI au prochain bloc fonctionnel.
          </p>
        </div>
      </div>
    </div>
  );
}
