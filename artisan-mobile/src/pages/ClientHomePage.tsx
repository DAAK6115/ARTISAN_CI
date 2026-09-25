import { useQuery } from '@tanstack/react-query';
import { ChevronRight, MapPin, Search, ShieldCheck, Star, Wrench } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { MobileTopBar } from '../components/MobileTopBar';
import { useAuthStore } from '../features/auth/auth.store';
import { getServices } from '../features/home/services.api';

const categories = [
  ['btp', 'Bâtiment'],
  ['mecanique_auto', 'Mécanique'],
  ['coiffure_esthetique', 'Beauté'],
  ['couture_habillement', 'Couture'],
  ['electronique', 'Électronique'],
  ['services_numeriques', 'Numérique']
] as const;

function money(value: string) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return value;
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount);
}

export function ClientHomePage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const services = useQuery({ queryKey: ['services', 'home'], queryFn: getServices });

  return (
    <div>
      <MobileTopBar />

      <section>
        <p className="text-sm font-semibold text-[var(--artisan-muted)]">Bonjour {user?.username ?? ''} 👋🏾</p>
        <h1 className="mt-1 max-w-[390px] text-[32px] font-black leading-[1.04] tracking-[-0.05em] text-[var(--artisan-ink)]">
          Trouvez le bon artisan,
          <span className="block text-[var(--artisan-green)]">sans perdre votre temps.</span>
        </h1>
        <p className="mt-3 max-w-sm text-sm leading-6 text-[var(--artisan-text-secondary)]">
          Explorez les prestations et réservez selon les vraies disponibilités de l’artisan.
        </p>

        <button
          type="button"
          onClick={() => navigate('/client/recherche')}
          className="mt-5 flex min-h-15 w-full items-center gap-3 rounded-[20px] border border-black/5 bg-white p-3 text-left shadow-[var(--artisan-shadow-card)]"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--artisan-surface-soft)] text-[var(--artisan-green)]">
            <Search size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold text-[var(--artisan-ink)]">Rechercher une prestation</span>
            <span className="mt-0.5 block truncate text-xs text-[var(--artisan-muted)]">Plombier, coiffure, réparation PC…</span>
          </span>
          <ChevronRight size={18} className="shrink-0 text-[#9AA59F]" />
        </button>

        <button type="button" className="mt-3 flex items-center gap-2 text-sm font-bold text-[var(--artisan-green)]">
          <MapPin size={17} /> Abidjan <ChevronRight size={15} />
        </button>
      </section>

      <section className="mt-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--artisan-green)]">Explorer</p>
            <h2 className="mt-1.5 text-xl font-black tracking-[-0.035em] text-[var(--artisan-ink)]">Services populaires</h2>
          </div>
          <Link to="/client/recherche" className="text-xs font-black text-[var(--artisan-green)]">Tout voir</Link>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categories.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => navigate(`/client/recherche?categorie=${key}`)}
              className="shrink-0 rounded-full border border-[#DDE5E0] bg-white px-3.5 py-2 text-xs font-bold text-[#45534C] shadow-sm transition active:scale-[.98]"
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--artisan-green)]">Découvrir</p>
            <h2 className="mt-1.5 text-xl font-black tracking-[-0.035em] text-[var(--artisan-ink)]">Prestations récemment publiées</h2>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          {services.isPending && [1, 2, 3].map((id) => (
            <div key={id} className="h-36 animate-pulse rounded-3xl bg-white shadow-sm" />
          ))}

          {services.isError ? (
            <div className="rounded-3xl border border-black/5 bg-white p-5 text-sm leading-6 text-[var(--artisan-text-secondary)] shadow-sm">
              Impossible de charger les prestations pour le moment.
            </div>
          ) : null}

          {services.data?.slice(0, 5).map((service) => (
            <Link
              key={service.id}
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
                  <p className="text-sm font-black text-[var(--artisan-green)]">
                    {service.mode_tarification === 'sur_devis'
                      ? 'Sur devis'
                      : `${service.mode_tarification === 'a_partir_de' ? 'Dès ' : ''}${money(service.prix)} FCFA`}
                  </p>
                  {service.moyenne_avis ? (
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-[var(--artisan-gold-soft)] px-2 py-1 text-[10px] font-black text-[#9A6B00]">
                      <Star size={11} fill="currentColor" /> {service.moyenne_avis}
                    </span>
                  ) : null}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-8 grid gap-3 pb-2">
        <article className="rounded-3xl border border-black/5 bg-white p-5 shadow-[var(--artisan-shadow-card)]">
          <span className="grid size-11 place-items-center rounded-2xl bg-[var(--artisan-green-soft)] text-[var(--artisan-green)]"><ShieldCheck size={20} /></span>
          <h2 className="mt-3 text-base font-black text-[var(--artisan-ink)]">Profils transparents</h2>
          <p className="mt-1.5 text-sm leading-6 text-[var(--artisan-muted)]">Prestations, portfolio, avis et informations utiles réunis au même endroit.</p>
        </article>
      </section>
    </div>
  );
}
