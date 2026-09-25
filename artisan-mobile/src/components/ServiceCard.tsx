import { ShieldCheck, Star, Wrench } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ServiceItem } from '../features/home/services.api';

export function formatMoney(value: string | number): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return String(value);
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount);
}

export function servicePriceLabel(service: ServiceItem): string {
  if (service.mode_tarification === 'sur_devis') return 'Sur devis';
  return `${service.mode_tarification === 'a_partir_de' ? 'Dès ' : ''}${formatMoney(service.prix)} FCFA`;
}

export function ServiceCard({ service }: { service: ServiceItem }) {
  return (
    <Link
      to={`/client/prestations/${service.id}`}
      className="group flex gap-3 overflow-hidden rounded-3xl border border-black/5 bg-white p-3 shadow-[var(--artisan-shadow-card)] transition active:scale-[.99]"
    >
      <div className="h-28 w-28 shrink-0 overflow-hidden rounded-[20px] bg-gradient-to-br from-[var(--artisan-green-soft)] to-[var(--artisan-orange-soft)]">
        {service.image ? (
          <img src={service.image} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-[var(--artisan-green)]"><Wrench size={30} /></div>
        )}
      </div>
      <div className="min-w-0 flex-1 py-1">
        <p className="truncate text-[10px] font-black uppercase tracking-[0.08em] text-[#7A8780]">
          {service.categorie_label || service.categorie}
        </p>
        <h3 className="mt-1 line-clamp-2 text-[15px] font-black leading-5 text-[var(--artisan-ink)]">{service.titre}</h3>
        <div className="mt-2 flex items-center gap-1 text-xs text-[var(--artisan-muted)]">
          <span className="truncate">par {service.artisan_username}</span>
          {service.artisan_verified ? <ShieldCheck size={13} className="shrink-0 text-[var(--artisan-green)]" /> : null}
        </div>
        <div className="mt-3 flex items-end justify-between gap-2">
          <p className="text-sm font-black text-[var(--artisan-green)]">{servicePriceLabel(service)}</p>
          {service.moyenne_avis ? (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-[var(--artisan-gold-soft)] px-2 py-1 text-[10px] font-black text-[#9A6B00]">
              <Star size={11} fill="currentColor" /> {service.moyenne_avis}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
