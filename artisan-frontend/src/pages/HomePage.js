import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from '../utils/axiosInstance';
import AppIcon from '../components/AppIcon';
import PublicHeader from '../components/PublicHeader';
import BrandLogo from '../components/BrandLogo';

const categories = [
  ['btp', 'Bâtiment'],
  ['mecanique_auto', 'Mécanique'],
  ['coiffure_esthetique', 'Beauté'],
  ['couture_habillement', 'Couture'],
  ['electronique', 'Électronique'],
  ['services_numeriques', 'Numérique'],
];

const formatPrice = (value) => new Intl.NumberFormat('fr-FR').format(Number(value || 0));

export default function HomePage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    axios.get('/services/')
      .then((response) => {
        if (mounted) setServices((response.data || []).slice(0, 6));
      })
      .catch(() => {
        if (mounted) setServices([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  const featured = useMemo(() => services.slice(0, 3), [services]);

  const submitSearch = (event) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set('search', query.trim());
    navigate(`/prestations${params.toString() ? `?${params}` : ''}`);
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#111815]">
      <PublicHeader />

      <main>
        <section className="relative overflow-hidden border-b border-black/5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(11,107,80,0.14),_transparent_38%),radial-gradient(circle_at_85%_20%,_rgba(224,122,50,0.12),_transparent_30%)]" />
          <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-[1.15fr_.85fr] lg:px-8 lg:py-28">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#0B6B50]/15 bg-white/80 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-[#0B6B50] shadow-sm">
                <span className="h-2 w-2 rounded-full bg-[#E7B451]" />
                Services de proximité en Côte d’Ivoire
              </span>
              <h1 className="mt-6 text-4xl font-black leading-[1.04] tracking-[-0.04em] sm:text-5xl lg:text-6xl">
                Trouvez le bon artisan,
                <span className="block text-[#0B6B50]">sans perdre votre temps.</span>
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-[#596760] sm:text-lg">
                Explorez de vraies prestations, comparez les profils et prenez rendez-vous selon les disponibilités de l’artisan.
              </p>

              <form onSubmit={submitSearch} className="mt-8 flex max-w-2xl flex-col gap-3 rounded-3xl border border-black/5 bg-white p-3 shadow-[0_18px_50px_rgba(20,38,30,0.10)] sm:flex-row">
                <label className="flex flex-1 items-center gap-3 rounded-2xl bg-[#F7F8F6] px-4 py-3">
                  <AppIcon name="search" className="h-5 w-5 text-[#0B6B50]" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Ex. plombier, coiffure, réparation PC…"
                    className="w-full bg-transparent text-sm text-[#111815] outline-none placeholder:text-[#8A958F]"
                  />
                </label>
                <button className="rounded-2xl bg-[#0B6B50] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#095C45]">
                  Rechercher
                </button>
              </form>

              <div className="mt-5 flex flex-wrap gap-2">
                {categories.map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => navigate(`/prestations?categorie=${value}`)}
                    className="rounded-full border border-[#DDE5E0] bg-white/75 px-3 py-1.5 text-xs font-semibold text-[#45534C] hover:border-[#0B6B50]/30 hover:text-[#0B6B50]"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative hidden min-h-[420px] lg:block">
              <div className="absolute left-10 top-4 w-[78%] rounded-[34px] border border-white/70 bg-white/80 p-5 shadow-[0_30px_80px_rgba(16,47,34,0.16)] backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#0B6B50]">Parcours simple</p>
                    <p className="mt-1 text-xl font-black">Du besoin au rendez-vous</p>
                  </div>
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#FFF4E8] text-[#D46B24]">
                    <AppIcon name="calendar" className="h-6 w-6" />
                  </span>
                </div>
                <div className="mt-6 space-y-3">
                  {[
                    ['1', 'Cherchez une prestation', 'Par métier, besoin ou catégorie'],
                    ['2', 'Choisissez un artisan', 'Profil, réalisations et avis'],
                    ['3', 'Réservez un créneau', 'Selon ses vraies disponibilités'],
                  ].map(([n, title, text]) => (
                    <div key={n} className="flex items-center gap-4 rounded-2xl border border-black/5 bg-white p-4">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#EAF4F0] text-sm font-black text-[#0B6B50]">{n}</span>
                      <div>
                        <p className="text-sm font-bold">{title}</p>
                        <p className="mt-0.5 text-xs text-[#718078]">{text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="absolute bottom-2 right-1 w-56 rounded-3xl bg-[#111815] p-5 text-white shadow-2xl">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#E7B451]">Pensé localement</p>
                <p className="mt-2 text-lg font-black">FCFA · proximité · simplicité</p>
                <p className="mt-2 text-xs leading-5 text-white/65">Une expérience adaptée aux usages quotidiens et au mobile.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ['shield', 'Profils transparents', 'Portfolio, prestations, avis et informations utiles réunis au même endroit.'],
              ['calendar', 'Disponibilités réelles', 'Les créneaux proposés respectent le planning déclaré par l’artisan.'],
              ['wallet', 'Paiement après service', 'Le règlement est déclaré après la prestation par l’artisan, selon votre workflow.'],
            ].map(([icon, title, text]) => (
              <article key={title} className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_12px_35px_rgba(20,38,30,0.05)]">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#EAF4F0] text-[#0B6B50]">
                  <AppIcon name={icon} className="h-5 w-5" />
                </span>
                <h2 className="mt-4 text-lg font-black">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-[#66736D]">{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#0B6B50]">Découvrir</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Prestations récemment publiées</h2>
            </div>
            <Link to="/prestations" className="hidden items-center gap-2 text-sm font-bold text-[#0B6B50] sm:flex">
              Tout explorer <AppIcon name="arrow" className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-7 grid gap-5 md:grid-cols-3">
            {loading && [1, 2, 3].map((item) => (
              <div key={item} className="h-72 animate-pulse rounded-3xl bg-white shadow-sm" />
            ))}
            {!loading && featured.map((service) => (
              <Link key={service.id} to={`/prestations/${service.id}`} className="group overflow-hidden rounded-3xl border border-black/5 bg-white shadow-[0_12px_35px_rgba(20,38,30,0.06)] transition hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(20,38,30,0.10)]">
                {service.image ? (
                  <img src={service.image} alt="" className="h-44 w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
                ) : (
                  <div className="grid h-44 place-items-center bg-gradient-to-br from-[#EAF4F0] to-[#FFF4E8] text-[#0B6B50]">
                    <AppIcon name="tools" className="h-10 w-10" />
                  </div>
                )}
                <div className="p-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-[#7A8780]">{service.categorie_label || service.categorie}</p>
                  <h3 className="mt-1 line-clamp-1 text-lg font-black">{service.titre}</h3>
                  <div className="mt-4 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-xs text-[#7A8780]">par {service.artisan_username}</p>
                      <p className="mt-1 font-black text-[#0B6B50]">
                        {service.mode_tarification === 'sur_devis' ? 'Sur devis' : `${service.mode_tarification === 'a_partir_de' ? 'Dès ' : ''}${formatPrice(service.prix)} FCFA`}
                      </p>
                    </div>
                    {service.moyenne_avis && <span className="rounded-full bg-[#FFF7DD] px-2.5 py-1 text-xs font-bold text-[#9A6B00]">★ {service.moyenne_avis}</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <Link to="/prestations" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[#0B6B50] sm:hidden">
            Tout explorer <AppIcon name="arrow" className="h-4 w-4" />
          </Link>
        </section>
      </main>

      <footer className="border-t border-black/5 bg-[#111815] text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-7 text-sm text-white/65 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div className="flex items-center gap-4">
            <span className="rounded-2xl bg-white px-3 py-2">
              <BrandLogo variant="horizontal" imageClassName="h-12 w-auto sm:h-14" />
            </span>
            <p>Plateforme de mise en relation avec les artisans.</p>
          </div>
          <p>Conçue pour une utilisation simple sur mobile et ordinateur.</p>
        </div>
      </footer>
    </div>
  );
}
