import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}

export function PageHeader({ title, subtitle, right }: PageHeaderProps) {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-30 -mx-4 -mt-[max(16px,env(safe-area-inset-top))] mb-5 border-b border-black/5 bg-white/92 px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))] backdrop-blur-xl sm:-mx-5 sm:px-5">
      <div className="flex min-h-11 items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#F4F6F4] text-[#334139]"
          aria-label="Retour"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[17px] font-black tracking-[-0.03em] text-[var(--artisan-ink)]">{title}</h1>
          {subtitle ? <p className="mt-0.5 truncate text-[11px] font-semibold text-[var(--artisan-muted)]">{subtitle}</p> : null}
        </div>
        {right}
      </div>
    </header>
  );
}
