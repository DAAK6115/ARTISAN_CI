import { useQuery } from '@tanstack/react-query';
import { Filter, Search, SlidersHorizontal, X } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MobileTopBar } from '../components/MobileTopBar';
import { ServiceCard } from '../components/ServiceCard';
import { getServices, type InterventionMode, type PricingMode } from '../features/home/services.api';

const categories = [
  ['', 'Tous'],
  ['alimentation', 'Alimentation'],
  ['artisanat_d_art', 'Artisanat d’art'],
  ['btp', 'Bâtiment'],
  ['bois', 'Bois'],
  ['cuir', 'Cuir'],
  ['coiffure_esthetique', 'Beauté'],
  ['couture_habillement', 'Couture'],
  ['electronique', 'Électronique'],
  ['energie_renouvelable', 'Énergie'],
  ['mecanique_auto', 'Mécanique'],
  ['metallurgie_soudure', 'Soudure'],
  ['savonnerie', 'Savonnerie'],
  ['serigraphie', 'Impression'],
  ['services_numeriques', 'Numérique'],
  ['transport', 'Transport']
] as const;

export function ClientSearchPage() {
  const [params, setParams] = useSearchParams();
  const [draftSearch, setDraftSearch] = useState(params.get('search') ?? '');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filters = useMemo(() => ({
    search: params.get('search') ?? '',
    categorie: params.get('categorie') ?? '',
    mode_tarification: (params.get('mode_tarification') ?? '') as PricingMode | '',
    mode_intervention: (params.get('mode_intervention') ?? '') as InterventionMode | '',
    min_prix: params.get('min_prix') ?? '',
    max_prix: params.get('max_prix') ?? ''
  }), [params]);

  const services = useQuery({
    queryKey: ['services', 'search', filters],
    queryFn: () => getServices(filters)
  });

  function updateParam(name: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    setParams(next, { replace: true });
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    updateParam('search', draftSearch.trim());
  }

  function clearFilters() {
    setDraftSearch('');
    setParams(new URLSearchParams(), { replace: true });
    setFiltersOpen(false);
  }

  const activeFilterCount = ['categorie', 'mode_tarification', 'mode_intervention', 'min_prix', 'max_prix']
    .filter((key) => Boolean(params.get(key))).length;

  return (
    <div>
      <MobileTopBar />

      <section>
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--artisan-green)]">Marketplace</p>
        <h1 className="mt-1.5 text-[28px] font-black tracking-[-0.045em] text-[var(--artisan-ink)]">Rechercher une prestation</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--artisan-muted)]">Trouvez le métier ou le service dont vous avez besoin.</p>

        <form onSubmit={submitSearch} className="mt-5 flex gap-2">
          <label className="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-2xl border border-black/5 bg-white px-4 shadow-sm focus-within:ring-4 focus-within:ring-[#0B6B50]/10">
            <Search size={19} className="shrink-0 text-[var(--artisan-green)]" />
            <input
              value={draftSearch}
              onChange={(event) => setDraftSearch(event.target.value)}
              placeholder="Plombier, coiffure, réparation PC…"
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-[var(--artisan-ink)] outline-none placeholder:font-medium placeholder:text-[#8A958F]"
              maxLength={120}
              autoComplete="off"
            />
            {draftSearch ? (
              <button type="button" onClick={() => setDraftSearch('')} className="grid size-8 place-items-center rounded-xl text-[var(--artisan-muted)]" aria-label="Effacer la recherche">
                <X size={16} />
              </button>
            ) : null}
          </label>
          <button type="submit" className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[var(--artisan-green)] text-white shadow-sm" aria-label="Rechercher">
            <Search size={20} />
          </button>
        </form>

        <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categories.map(([value, label]) => {
            const active = filters.categorie === value;
            return (
              <button
                key={value || 'all'}
                type="button"
                onClick={() => updateParam('categorie', value)}
                className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-bold transition ${active
                  ? 'border-[var(--artisan-green)] bg-[var(--artisan-green)] text-white'
                  : 'border-[#DDE5E0] bg-white text-[#45534C]'}`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-xs font-semibold text-[var(--artisan-muted)]">
            {services.data ? `${services.data.length} résultat${services.data.length > 1 ? 's' : ''}` : 'Recherche…'}
          </p>
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="flex items-center gap-2 rounded-2xl border border-black/5 bg-white px-3.5 py-2.5 text-xs font-black text-[#45534C] shadow-sm"
          >
            <SlidersHorizontal size={16} /> Filtres
            {activeFilterCount ? <span className="grid min-w-5 place-items-center rounded-full bg-[var(--artisan-green)] px-1.5 py-0.5 text-[10px] text-white">{activeFilterCount}</span> : null}
          </button>
        </div>
      </section>

      <section className="mt-5 space-y-4 pb-2">
        {services.isPending ? [1, 2, 3].map((item) => <div key={item} className="h-36 animate-pulse rounded-3xl bg-white shadow-sm" />) : null}
        {services.isError ? (
          <div className="rounded-3xl border border-[var(--artisan-danger)]/10 bg-[var(--artisan-danger-soft)] p-5 text-sm font-semibold leading-6 text-[#A83228]">
            Impossible de charger les prestations. Vérifiez votre connexion puis réessayez.
          </div>
        ) : null}
        {services.data?.map((service) => <ServiceCard key={service.id} service={service} />)}
        {services.data && services.data.length === 0 ? (
          <div className="rounded-3xl border border-black/5 bg-white p-7 text-center shadow-sm">
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[var(--artisan-green-soft)] text-[var(--artisan-green)]"><Search size={21} /></span>
            <h2 className="mt-3 text-base font-black text-[var(--artisan-ink)]">Aucune prestation trouvée</h2>
            <p className="mt-1.5 text-sm leading-6 text-[var(--artisan-muted)]">Essayez un autre mot-clé ou retirez certains filtres.</p>
            <button type="button" onClick={clearFilters} className="mt-4 rounded-2xl bg-[var(--artisan-green)] px-4 py-3 text-sm font-black text-white">Réinitialiser</button>
          </div>
        ) : null}
      </section>

      {filtersOpen ? (
        <div className="fixed inset-0 z-[80] bg-black/35 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-label="Filtres de recherche">
          <button className="absolute inset-0" onClick={() => setFiltersOpen(false)} aria-label="Fermer" />
          <div className="absolute inset-x-3 bottom-3 rounded-[30px] bg-white p-5 shadow-2xl" style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-black tracking-[-0.03em]">Filtres</p>
                <p className="mt-1 text-xs text-[var(--artisan-muted)]">Affinez les résultats sans compliquer la recherche.</p>
              </div>
              <button type="button" onClick={() => setFiltersOpen(false)} className="grid size-10 place-items-center rounded-xl bg-[#F4F6F4]" aria-label="Fermer"><X size={18} /></button>
            </div>

            <div className="mt-5 grid gap-4">
              <label>
                <span className="text-xs font-black text-[#45534C]">Tarification</span>
                <select value={filters.mode_tarification} onChange={(event) => updateParam('mode_tarification', event.target.value)} className="mt-2 min-h-13 w-full rounded-2xl border border-[#DDE5E0] bg-[#F7F8F6] px-4 text-sm font-semibold outline-none focus:ring-4 focus:ring-[#0B6B50]/10">
                  <option value="">Tous les tarifs</option>
                  <option value="fixe">Prix fixe</option>
                  <option value="a_partir_de">À partir de</option>
                  <option value="sur_devis">Sur devis</option>
                </select>
              </label>

              <label>
                <span className="text-xs font-black text-[#45534C]">Mode d’intervention</span>
                <select value={filters.mode_intervention} onChange={(event) => updateParam('mode_intervention', event.target.value)} className="mt-2 min-h-13 w-full rounded-2xl border border-[#DDE5E0] bg-[#F7F8F6] px-4 text-sm font-semibold outline-none focus:ring-4 focus:ring-[#0B6B50]/10">
                  <option value="">Tous les modes</option>
                  <option value="chez_client">Chez le client</option>
                  <option value="atelier">Dans l’atelier</option>
                  <option value="les_deux">Chez le client ou en atelier</option>
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label>
                  <span className="text-xs font-black text-[#45534C]">Prix minimum</span>
                  <input type="number" inputMode="numeric" min="0" value={filters.min_prix} onChange={(event) => updateParam('min_prix', event.target.value)} placeholder="0" className="mt-2 min-h-13 w-full rounded-2xl border border-[#DDE5E0] bg-[#F7F8F6] px-4 text-sm font-semibold outline-none focus:ring-4 focus:ring-[#0B6B50]/10" />
                </label>
                <label>
                  <span className="text-xs font-black text-[#45534C]">Prix maximum</span>
                  <input type="number" inputMode="numeric" min="0" value={filters.max_prix} onChange={(event) => updateParam('max_prix', event.target.value)} placeholder="100000" className="mt-2 min-h-13 w-full rounded-2xl border border-[#DDE5E0] bg-[#F7F8F6] px-4 text-sm font-semibold outline-none focus:ring-4 focus:ring-[#0B6B50]/10" />
                </label>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-[.8fr_1.2fr] gap-3">
              <button type="button" onClick={clearFilters} className="min-h-13 rounded-2xl bg-[#F4F6F4] px-4 text-sm font-black text-[#45534C]">Effacer</button>
              <button type="button" onClick={() => setFiltersOpen(false)} className="min-h-13 rounded-2xl bg-[var(--artisan-green)] px-4 text-sm font-black text-white">Afficher les résultats</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
