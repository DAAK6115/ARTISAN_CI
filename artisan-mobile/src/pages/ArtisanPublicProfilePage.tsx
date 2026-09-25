import { useQuery } from '@tanstack/react-query';
import { ExternalLink, Globe2, MapPin, MessageCircle, ShieldCheck, Star, Wrench } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { ServiceCard } from '../components/ServiceCard';
import { getServices } from '../features/home/services.api';
import { getPublicPortfolio } from '../features/portfolio/portfolio.api';
import { getArtisanReviews } from '../features/reviews/reviews.api';

export function ArtisanPublicProfilePage() {
  const username = decodeURIComponent(useParams().username ?? '').trim();
  const enabled = Boolean(username);

  const portfolio = useQuery({
    queryKey: ['portfolio', username],
    queryFn: () => getPublicPortfolio(username),
    enabled
  });
  const services = useQuery({
    queryKey: ['services', 'artisan', username],
    queryFn: () => getServices({ artisan: username }),
    enabled
  });
  const reviews = useQuery({
    queryKey: ['reviews', 'artisan', username],
    queryFn: () => getArtisanReviews(username),
    enabled
  });

  const ratings = reviews.data ?? [];
  const ratingAverage = ratings.length
    ? (ratings.reduce((sum, item) => sum + Number(item.note || 0), 0) / ratings.length).toFixed(1)
    : null;
  const profile = portfolio.data;
  const whatsappHref = profile?.whatsapp
    ? `https://wa.me/${profile.whatsapp.replace(/\D/g, '')}`
    : null;

  return (
    <div>
      <PageHeader title={username || 'Artisan'} subtitle="Profil professionnel" />

      <section className="overflow-hidden rounded-[30px] border border-black/5 bg-white shadow-[var(--artisan-shadow-card)]">
        <div className="relative h-40 bg-gradient-to-br from-[var(--artisan-green-soft)] via-white to-[var(--artisan-orange-soft)]">
          {profile?.photo_couverture ? <img src={profile.photo_couverture} alt="" className="h-full w-full object-cover" /> : null}
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/30 to-transparent" />
        </div>
        <div className="relative p-5 pt-0">
          <div className="-mt-7 flex items-end justify-between gap-3">
            <span className="grid size-16 place-items-center rounded-[22px] border-4 border-white bg-[var(--artisan-green)] text-white shadow-lg"><Wrench size={27} /></span>
            {profile?.artisan_verified ? (
              <span className="mb-1 flex items-center gap-1.5 rounded-full bg-[var(--artisan-green-soft)] px-3 py-1.5 text-[11px] font-black text-[var(--artisan-green)]"><ShieldCheck size={14} /> Artisan vérifié</span>
            ) : null}
          </div>

          <h1 className="mt-3 text-[26px] font-black tracking-[-0.04em] text-[var(--artisan-ink)]">{username}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-[var(--artisan-muted)]">
            {profile?.localisation ? <span className="flex items-center gap-1"><MapPin size={14} className="text-[var(--artisan-green)]" /> {profile.localisation}</span> : null}
            {ratingAverage ? <span className="flex items-center gap-1 rounded-full bg-[var(--artisan-gold-soft)] px-2.5 py-1 font-black text-[#9A6B00]"><Star size={11} fill="currentColor" /> {ratingAverage} · {ratings.length} avis</span> : null}
          </div>

          {profile?.bio ? <p className="mt-4 whitespace-pre-line text-sm leading-6 text-[var(--artisan-text-secondary)]">{profile.bio}</p> : (
            <p className="mt-4 text-sm leading-6 text-[var(--artisan-muted)]">Cet artisan n’a pas encore ajouté de présentation publique.</p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {whatsappHref ? (
              <a href={whatsappHref} target="_blank" rel="noreferrer" className="flex min-h-11 items-center gap-2 rounded-2xl bg-[var(--artisan-green)] px-4 text-xs font-black text-white">
                <MessageCircle size={16} /> WhatsApp
              </a>
            ) : null}
            {profile?.site_web ? (
              <a href={profile.site_web} target="_blank" rel="noreferrer" className="flex min-h-11 items-center gap-2 rounded-2xl bg-[#F4F6F4] px-4 text-xs font-black text-[#45534C]">
                <Globe2 size={16} /> Site web <ExternalLink size={12} />
              </a>
            ) : null}
          </div>
        </div>
      </section>

      {profile?.realisations?.length ? (
        <section className="mt-7">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--artisan-green)]">Portfolio</p>
            <h2 className="mt-1.5 text-xl font-black tracking-[-0.035em] text-[var(--artisan-ink)]">Réalisations</h2>
          </div>
          <div className="mt-4 flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {profile.realisations.map((item) => (
              <article key={item.id} className="w-60 shrink-0 overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm">
                <div className="h-36 bg-[var(--artisan-green-soft)]">
                  {item.image ? <img src={item.image} alt={item.titre || 'Réalisation'} className="h-full w-full object-cover" loading="lazy" /> : <div className="grid h-full place-items-center text-[var(--artisan-green)]"><Wrench size={30} /></div>}
                </div>
                <div className="p-3.5">
                  <p className="truncate text-sm font-black text-[var(--artisan-ink)]">{item.titre || 'Réalisation'}</p>
                  {item.description ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--artisan-muted)]">{item.description}</p> : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-7">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--artisan-green)]">Prestations</p>
            <h2 className="mt-1.5 text-xl font-black tracking-[-0.035em] text-[var(--artisan-ink)]">Services proposés</h2>
          </div>
          <span className="text-xs font-bold text-[var(--artisan-muted)]">{services.data?.length ?? 0}</span>
        </div>
        <div className="mt-4 space-y-4">
          {services.isPending ? [1, 2].map((id) => <div key={id} className="h-36 animate-pulse rounded-3xl bg-white" />) : null}
          {services.data?.map((item) => <ServiceCard key={item.id} service={item} />)}
          {services.data && services.data.length === 0 ? <div className="rounded-3xl bg-white p-5 text-sm text-[var(--artisan-muted)]">Aucune prestation active n’est publiée pour le moment.</div> : null}
        </div>
      </section>

      <section className="mt-7 pb-2">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--artisan-green)]">Réputation</p>
            <h2 className="mt-1.5 text-xl font-black tracking-[-0.035em] text-[var(--artisan-ink)]">Avis clients</h2>
          </div>
          {ratingAverage ? <span className="flex items-center gap-1 rounded-full bg-[var(--artisan-gold-soft)] px-3 py-1.5 text-xs font-black text-[#9A6B00]"><Star size={12} fill="currentColor" /> {ratingAverage}</span> : null}
        </div>
        <div className="mt-4 space-y-3">
          {reviews.data?.slice(0, 5).map((review) => (
            <article key={review.id} className="rounded-3xl border border-black/5 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-black text-[var(--artisan-ink)]">{review.client}</p>
                <span className="text-xs font-black text-[#9A6B00]">★ {review.note}/5</span>
              </div>
              <p className="mt-1 text-[11px] font-semibold text-[var(--artisan-muted)]">{review.service_titre}</p>
              {review.commentaire ? <p className="mt-2 text-sm leading-6 text-[var(--artisan-text-secondary)]">{review.commentaire}</p> : null}
            </article>
          ))}
          {reviews.data && reviews.data.length === 0 ? <div className="rounded-3xl bg-white p-5 text-sm text-[var(--artisan-muted)]">Aucun avis public pour cet artisan.</div> : null}
        </div>
      </section>
    </div>
  );
}
