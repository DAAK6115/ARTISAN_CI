import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from '../../utils/axiosInstance';
import AppIcon from '../../components/AppIcon';
import PublicHeader from '../../components/PublicHeader';
import { getUserRole, isAuthenticated } from '../../utils/auth';
import { startSpeechRecognition } from '../../utils/speech';
import { useDataSaver } from '../../utils/accessibility';
import useAutoRefresh from '../../hooks/useAutoRefresh';

const categories = [
  ['alimentation', 'Alimentation'], ['artisanat_d_art', 'Artisanat d’Art'], ['btp', 'Bâtiment & travaux'],
  ['bois', 'Bois'], ['cuir', 'Cuir'], ['coiffure_esthetique', 'Coiffure & esthétique'],
  ['couture_habillement', 'Couture'], ['electronique', 'Électronique'], ['energie_renouvelable', 'Énergie renouvelable'],
  ['mecanique_auto', 'Mécanique auto'], ['metallurgie_soudure', 'Métallurgie & soudure'], ['savonnerie', 'Savonnerie'],
  ['serigraphie', 'Sérigraphie'], ['services_numeriques', 'Services numériques'], ['transport', 'Transport & logistique'],
];

const formatPrice = (value) => new Intl.NumberFormat('fr-FR').format(Number(value || 0));

export default function ServicesList({ publicMode = false }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [filters, setFilters] = useState({
    categorie: searchParams.get('categorie') || '',
    min_prix: searchParams.get('min_prix') || '',
    max_prix: searchParams.get('max_prix') || '',
    mode_intervention: searchParams.get('mode_intervention') || '',
    mode_tarification: searchParams.get('mode_tarification') || '',
  });

  const clientConnected = isAuthenticated() && getUserRole() === 'client';
  const dataSaver = useDataSaver();

  const voiceSearch = () => startSpeechRecognition({
    onResult: (text) => setSearch(text),
    onError: (msg) => setMessage(msg),
  });

  const paramsObject = useMemo(() => {
    const params = {};
    const q = searchParams.get('search');
    if (q) params.search = q;
    ['categorie', 'min_prix', 'max_prix', 'mode_intervention', 'mode_tarification'].forEach((key) => {
      const value = searchParams.get(key);
      if (value) params[key] = value;
    });
    return params;
  }, [searchParams]);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await axios.get('/services/', { params: paramsObject });
      setServices(response.data || []);
      setMessage('');
    } catch {
      if (!silent) setMessage('Impossible de charger les prestations pour le moment.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => { load(); }, [paramsObject]);
  useAutoRefresh(() => load(true), { intervalMs: 30000 });

  const applyFilters = (event) => {
    event.preventDefault();
    const next = new URLSearchParams();
    if (search.trim()) next.set('search', search.trim());
    Object.entries(filters).forEach(([key, value]) => value && next.set(key, value));
    setSearchParams(next);
  };

  const resetFilters = () => {
    setSearch('');
    setFilters({ categorie: '', min_prix: '', max_prix: '', mode_intervention: '', mode_tarification: '' });
    setSearchParams(new URLSearchParams());
  };

  const toggleFavori = async (serviceId) => {
    if (!clientConnected) return;
    try {
      await axios.post(`/favoris/toggle/${serviceId}/`);
      setServices((current) => current.map((service) => service.id === serviceId ? { ...service, is_favori: !service.is_favori } : service));
    } catch {
      setMessage('Impossible de modifier les favoris.');
    }
  };

  const content = (
    <div className={publicMode ? 'mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8' : 'mx-auto max-w-7xl'}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#0B6B50]">Marketplace</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Trouvez la prestation adaptée</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#66736D]">Recherchez par besoin, catégorie, budget ou mode d’intervention.</p>
        </div>
        {!publicMode && <Link to="/client/artisans" className="inline-flex items-center gap-2 text-sm font-bold text-[#0B6B50]">Voir les artisans <AppIcon name="arrow" className="h-4 w-4" /></Link>}
      </div>

      <form onSubmit={applyFilters} className="mt-6 rounded-[28px] border border-black/5 bg-white p-4 shadow-[0_12px_35px_rgba(20,38,30,0.06)]">
        <div className="flex flex-col gap-3 lg:flex-row">
          <label className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl bg-[#F5F7F5] px-4 py-3">
            <AppIcon name="search" className="h-5 w-5 shrink-0 text-[#0B6B50]" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Que recherchez-vous ?" className="w-full bg-transparent text-sm outline-none" />
            <button type="button" onClick={voiceSearch} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-[#0B6B50]" title="Rechercher à la voix"><AppIcon name="mic" className="h-4 w-4" /></button>
          </label>
          <select value={filters.categorie} onChange={(event) => setFilters({ ...filters, categorie: event.target.value })} className="rounded-2xl border border-[#DFE6E2] bg-white px-4 py-3 text-sm outline-none">
            <option value="">Toutes les catégories</option>
            {categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select value={filters.mode_intervention} onChange={(event) => setFilters({ ...filters, mode_intervention: event.target.value })} className="rounded-2xl border border-[#DFE6E2] bg-white px-4 py-3 text-sm outline-none">
            <option value="">Lieu d’intervention</option>
            <option value="chez_client">Chez moi</option>
            <option value="atelier">En atelier</option>
            <option value="les_deux">Les deux</option>
          </select>
          <button className="rounded-2xl bg-[#0B6B50] px-6 py-3 text-sm font-black text-white hover:bg-[#095C45]">Rechercher</button>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input type="number" min="0" placeholder="Prix minimum" value={filters.min_prix} onChange={(event) => setFilters({ ...filters, min_prix: event.target.value })} className="rounded-xl border border-[#E2E7E4] px-3 py-2.5 text-sm" />
          <input type="number" min="0" placeholder="Prix maximum" value={filters.max_prix} onChange={(event) => setFilters({ ...filters, max_prix: event.target.value })} className="rounded-xl border border-[#E2E7E4] px-3 py-2.5 text-sm" />
          <select value={filters.mode_tarification} onChange={(event) => setFilters({ ...filters, mode_tarification: event.target.value })} className="rounded-xl border border-[#E2E7E4] px-3 py-2.5 text-sm">
            <option value="">Tous les tarifs</option>
            <option value="fixe">Prix fixe</option>
            <option value="a_partir_de">À partir de</option>
            <option value="sur_devis">Sur devis</option>
          </select>
          <button type="button" onClick={resetFilters} className="rounded-xl px-3 py-2.5 text-sm font-bold text-[#66736D] hover:bg-[#F5F7F5]">Réinitialiser</button>
        </div>
      </form>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm font-semibold text-[#66736D]">{loading ? 'Recherche…' : `${services.length} prestation${services.length > 1 ? 's' : ''}`}</p>
      </div>

      {message && <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</div>}

      {loading ? (
        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{[1, 2, 3, 4, 5, 6].map((item) => <div key={item} className="h-80 animate-pulse rounded-3xl bg-white" />)}</div>
      ) : services.length === 0 ? (
        <div className="mt-8 rounded-[28px] border border-dashed border-[#CAD5CF] bg-white p-10 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#EAF4F0] text-[#0B6B50]"><AppIcon name="search" className="h-5 w-5" /></span>
          <h2 className="mt-4 font-black">Aucune prestation trouvée</h2>
          <p className="mt-1 text-sm text-[#718078]">Essayez d’élargir vos filtres ou de rechercher un autre métier.</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {services.map((service) => {
            const detailPath = publicMode ? `/prestations/${service.id}` : `/client/services/${service.id}`;
            return (
              <article key={service.id} className="group overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-[0_12px_35px_rgba(20,38,30,0.06)] transition hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(20,38,30,0.10)]">
                <Link to={detailPath} className="block">
                  {service.image && !dataSaver ? <img src={service.image} alt="" loading="lazy" decoding="async" className="h-48 w-full object-cover transition duration-500 group-hover:scale-[1.025]" /> : <div className="grid h-48 place-items-center bg-gradient-to-br from-[#EAF4F0] to-[#FFF4E8] text-[#0B6B50]"><AppIcon name="tools" className="h-10 w-10" /></div>}
                </Link>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wide text-[#7A8780]">{service.categorie_label || service.categorie}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2"><Link to={detailPath} className="block truncate text-lg font-black text-[#111815]">{service.titre}</Link>{service.artisan_verified && <span className="rounded-full bg-[#EAF4F0] px-2 py-1 text-[10px] font-black text-[#0B6B50]">✓ Artisan vérifié</span>}</div>
                    </div>
                    {service.moyenne_avis && <span className="shrink-0 rounded-full bg-[#FFF7DD] px-2.5 py-1 text-xs font-black text-[#926800]">★ {service.moyenne_avis}</span>}
                  </div>

                  <p className="mt-3 line-clamp-2 min-h-[40px] text-sm leading-5 text-[#66736D]">{service.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-[#526159]">
                    <span className="rounded-full bg-[#F2F5F3] px-2.5 py-1">{service.mode_intervention_label}</span>
                    <span className="rounded-full bg-[#F2F5F3] px-2.5 py-1">{service.duree_minutes} min</span>
                  </div>

                  <div className="mt-5 flex items-end justify-between gap-3 border-t border-black/5 pt-4">
                    <div>
                      <Link to={`/artisans/${service.artisan_username}`} className="text-xs font-semibold text-[#66736D] hover:text-[#0B6B50]">{service.artisan_username}</Link>
                      <p className="mt-1 text-base font-black text-[#0B6B50]">{service.mode_tarification === 'sur_devis' ? 'Sur devis' : `${service.mode_tarification === 'a_partir_de' ? 'Dès ' : ''}${formatPrice(service.prix)} FCFA`}</p>
                    </div>
                    {clientConnected ? (
                      <button onClick={() => toggleFavori(service.id)} aria-label={service.is_favori ? 'Retirer des favoris' : 'Ajouter aux favoris'} className={`grid h-10 w-10 place-items-center rounded-2xl ${service.is_favori ? 'bg-[#FFF0EE] text-[#C64A3F]' : 'bg-[#F3F5F4] text-[#65736B]'}`}>
                        <AppIcon name="heart" className="h-5 w-5" />
                      </button>
                    ) : (
                      <Link to="/login" className="grid h-10 w-10 place-items-center rounded-2xl bg-[#F3F5F4] text-[#65736B]" aria-label="Se connecter pour ajouter aux favoris"><AppIcon name="heart" className="h-5 w-5" /></Link>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );

  return publicMode ? <div className="min-h-screen bg-[#FAF9F6]"><PublicHeader />{content}</div> : content;
}
