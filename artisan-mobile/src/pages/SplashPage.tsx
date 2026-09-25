import { BrandMark } from '../components/BrandMark';

export function SplashPage() {
  return (
    <div className="grid min-h-dvh place-items-center bg-[var(--artisan-surface)] px-6">
      <div className="flex flex-col items-center gap-5 text-center">
        <BrandMark large subtitle="Plateforme des artisans" />
        <div className="size-7 animate-spin rounded-full border-[3px] border-[#D9E8E0] border-t-[var(--artisan-green)]" aria-label="Chargement" />
        <p className="text-sm font-semibold text-[var(--artisan-muted)]">Préparation de votre espace…</p>
      </div>
    </div>
  );
}
