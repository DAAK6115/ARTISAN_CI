interface BrandMarkProps {
  compact?: boolean;
  subtitle?: string;
  large?: boolean;
}

export function BrandMark({ compact = false, subtitle, large = false }: BrandMarkProps) {
  if (large) {
    return (
      <div className="flex flex-col items-center text-center" aria-label="ARTISAN_CI">
        <img
          src="/branding/logo-artisan-ci.png"
          alt="Logo ARTISAN_CI"
          className="h-32 w-32 object-contain sm:h-36 sm:w-36"
          draggable={false}
        />
        {subtitle ? (
          <span className="-mt-2 block text-xs font-semibold text-[#829087]">{subtitle}</span>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-2.5" aria-label="ARTISAN_CI">
      <img
        src="/branding/logo-artisan-ci.png"
        alt=""
        aria-hidden="true"
        className="size-11 shrink-0 object-contain"
        draggable={false}
      />
      {!compact ? (
        <div className="min-w-0">
          <span className="block truncate text-[16px] font-black tracking-[-0.035em] text-[var(--artisan-ink)]">
            ARTISAN_CI
          </span>
          {subtitle ? (
            <span className="mt-0.5 block truncate text-[11px] font-semibold text-[#829087]">{subtitle}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
