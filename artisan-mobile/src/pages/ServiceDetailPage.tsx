import { useQuery } from '@tanstack/react-query';
import {
  CalendarDays,
  Clock3,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Star,
  Wrench
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { formatMoney, servicePriceLabel } from '../components/ServiceCard';
import { getService } from '../features/home/services.api';
import { getServiceReviews } from '../features/reviews/reviews.api';

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat('fr-CI', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
  } catch {
    return value;
  }
}

export function ServiceDetailPage() {
  const rawId = useParams().id ?? '';
  const serviceId = Number(rawId);
  const validId = Number.isInteger(serviceId) && serviceId > 0;

  const service = useQuery({
    queryKey: ['service', serviceId],
    queryFn: () => getService(serviceId),
    enabled: validId
  });
  const reviews = useQuery({
    queryKey: ['service-reviews', serviceId],
    queryFn: () => getServiceReviews(serviceId),
    enabled: validId
  });

  if (!validId) {
    return (
      <div>
        <PageHeader title="Prestation" />
        <div className="rounded-3xl bg-white p-6 text-sm font-semibold text-[var(--artisan-muted)]">Cette prestation est introuvable.</div>
      </div>
    );
  }

  if (service.isPending) {
    return (
      <div>
        <PageHeader title="Prestation" />
        <div className="space-y-4">
          <div className="h-72 animate-pulse rounded-[30px] bg-white" />
          <div className="h-40 animate-pulse rounded-[30px] bg-white" />
        </div>
      </div>
    );
  }

  if (service.isError || !service.data) {
    return (
      <div>
        <PageHeader title="Prestation" />
        <div className="rounded-3xl border border-[var(--artisan-danger)]/10 bg-[var(--artisan-danger-soft)] p-5 text-sm font-semibold text-[#A83228]">
          Impossible de charger cette prestation.
        </div>
      </div>
    );
  }

  const item = service.data;

  return (
    <div>
      <PageHeader title="Détail de la prestation" subtitle={item.categorie_label || item.categorie} />

      <section className="overflow-hidden rounded-[30px] border border-black/5 bg-white shadow-[var(--artisan-shadow-card)]">
        <div className="h-64 bg-gradient-to-br from-[var(--artisan-green-soft)] to-[var(--artisan-orange-soft)]">
          {item.image ? (
            <img src={item.image} alt={item.titre} className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full place-items-center text-[var(--artisan-green)]"><Wrench size={50} /></div>
          )}
        </div>
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--artisan-green)]">{item.categorie_label || item.categorie}</p>
              <h1 className="mt-1.5 text-[25px] font-black leading-8 tracking-[-0.04em] text-[var(--artisan-ink)]">{item.titre}</h1>
            </div>
            {item.moyenne_avis ? (
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-[var(--artisan-gold-soft)] px-3 py-1.5 text-xs font-black text-[#9A6B00]">
                <Star size={13} fill="currentColor" /> {item.moyenne_avis}
              </span>
            ) : null}
          </div>

          <p className="mt-4 whitespace-pre-line text-sm leading-6 text-[var(--artisan-text-secondary)]">{item.description}</p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-[var(--artisan-green-soft)] p-3.5">
              <p className="text-[10px] font-black uppercase tracking-wide text-[var(--artisan-green)]">Tarif</p>
              <p className="mt-1 text-sm font-black text-[var(--artisan-ink)]">{servicePriceLabel(item)}</p>
            </div>
            <div className="rounded-2xl bg-[#F7F8F6] p-3.5">
              <p className="text-[10px] font-black uppercase tracking-wide text-[#718078]">Durée estimée</p>
              <p className="mt-1 flex items-center gap-1.5 text-sm font-black text-[var(--artisan-ink)]"><Clock3 size={15} /> {item.duree_minutes} min</p>
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-black/5 bg-[#FAFBFA] p-4">
            <p className="flex items-center gap-2 text-sm font-black text-[var(--artisan-ink)]"><MapPin size={17} className="text-[var(--artisan-green)]" /> {item.mode_intervention_label}</p>
            {item.rayon_intervention_km ? <p className="mt-1.5 text-xs leading-5 text-[var(--artisan-muted)]">Rayon indicatif : {item.rayon_intervention_km} km</p> : null}
          </div>
        </div>
      </section>

      <Link
        to={`/client/artisans/${encodeURIComponent(item.artisan_username)}`}
        className="mt-4 flex items-center gap-3 rounded-3xl border border-black/5 bg-white p-4 shadow-[var(--artisan-shadow-card)]"
      >
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[var(--artisan-green-soft)] text-[var(--artisan-green)]"><Wrench size={21} /></span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-sm font-black text-[var(--artisan-ink)]">
            {item.artisan_username}
            {item.artisan_verified ? <ShieldCheck size={15} className="text-[var(--artisan-green)]" /> : null}
          </span>
          <span className="mt-1 block text-xs text-[var(--artisan-muted)]">Voir le profil, le portfolio et les avis</span>
        </span>
        <span className="text-xs font-black text-[var(--artisan-green)]">Voir</span>
      </Link>

      <section className="mt-6">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--artisan-green)]">Expériences clients</p>
            <h2 className="mt-1.5 text-xl font-black tracking-[-0.035em] text-[var(--artisan-ink)]">Avis sur cette prestation</h2>
          </div>
          <span className="text-xs font-bold text-[var(--artisan-muted)]">{reviews.data?.length ?? 0} avis</span>
        </div>

        <div className="mt-4 space-y-3">
          {reviews.isPending ? [1, 2].map((id) => <div key={id} className="h-28 animate-pulse rounded-3xl bg-white" />) : null}
          {reviews.data?.slice(0, 4).map((review) => (
            <article key={review.id} className="rounded-3xl border border-black/5 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-black text-[var(--artisan-ink)]">{review.client}</p>
                <span className="flex items-center gap-1 rounded-full bg-[var(--artisan-gold-soft)] px-2.5 py-1 text-[10px] font-black text-[#9A6B00]"><Star size={11} fill="currentColor" /> {review.note}/5</span>
              </div>
              {review.commentaire ? <p className="mt-2 text-sm leading-6 text-[var(--artisan-text-secondary)]">{review.commentaire}</p> : null}
              <p className="mt-2 text-[11px] font-semibold text-[#8A958F]">{formatDate(review.date_creation)}</p>
            </article>
          ))}
          {reviews.data && reviews.data.length === 0 ? (
            <div className="rounded-3xl border border-black/5 bg-white p-5 text-sm leading-6 text-[var(--artisan-muted)]">Aucun avis n’a encore été publié pour cette prestation.</div>
          ) : null}
        </div>
      </section>

      <div className="sticky bottom-[88px] z-20 mt-6 rounded-[24px] border border-black/5 bg-white/95 p-2 shadow-[0_16px_40px_rgba(20,38,30,0.16)] backdrop-blur-xl">
        <div className="grid grid-cols-[auto_1fr] gap-2">
          <Link to={`/client/artisans/${encodeURIComponent(item.artisan_username)}`} className="grid size-13 place-items-center rounded-2xl bg-[#F4F6F4] text-[#45534C]" aria-label="Voir l’artisan">
            <MessageCircle size={20} />
          </Link>
          <Link to={`/client/prestations/${item.id}/reserver`} className="flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-[var(--artisan-green)] px-4 text-sm font-black text-white shadow-sm">
            <CalendarDays size={18} /> Réserver
          </Link>
        </div>
      </div>

      {item.mode_tarification !== 'sur_devis' ? (
        <p className="mt-3 text-center text-[11px] font-semibold text-[var(--artisan-muted)]">Tarif affiché : {formatMoney(item.prix)} FCFA</p>
      ) : null}
    </div>
  );
}
