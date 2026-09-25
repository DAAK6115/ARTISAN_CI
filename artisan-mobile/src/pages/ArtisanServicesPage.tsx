import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Clock3,
  ImagePlus,
  MapPinned,
  Pencil,
  Plus,
  Tag,
  Trash2,
  Wrench,
  X
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { ApiError } from '../api/http';
import { MobileTopBar } from '../components/MobileTopBar';
import { formatMoney } from '../components/ServiceCard';
import {
  createArtisanService,
  deleteArtisanService,
  getArtisanServices,
  SERVICE_CATEGORIES,
  updateArtisanService,
  type ServiceFormInput
} from '../features/artisan/artisan.api';
import type { ServiceItem } from '../features/home/services.api';

const emptyForm: ServiceFormInput = {
  titre: '',
  description: '',
  prix: '',
  categorie: 'btp',
  mode_tarification: 'fixe',
  duree_minutes: '60',
  delai_reservation_heures: '2',
  mode_intervention: 'chez_client',
  rayon_intervention_km: '',
  image: null
};

function formFromService(service: ServiceItem): ServiceFormInput {
  return {
    titre: service.titre,
    description: service.description,
    prix: service.mode_tarification === 'sur_devis' ? '' : String(service.prix),
    categorie: service.categorie,
    mode_tarification: service.mode_tarification,
    duree_minutes: String(service.duree_minutes),
    delai_reservation_heures: String(service.delai_reservation_heures),
    mode_intervention: service.mode_intervention,
    rayon_intervention_km: service.rayon_intervention_km ? String(service.rayon_intervention_km) : '',
    image: null
  };
}

function priceLabel(service: ServiceItem): string {
  if (service.mode_tarification === 'sur_devis') return 'Sur devis';
  const prefix = service.mode_tarification === 'a_partir_de' ? 'Dès ' : '';
  return `${prefix}${formatMoney(service.prix)} FCFA`;
}

export function ArtisanServicesPage() {
  const queryClient = useQueryClient();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceItem | null>(null);
  const [form, setForm] = useState<ServiceFormInput>(emptyForm);
  const [error, setError] = useState('');

  const services = useQuery({
    queryKey: ['artisan-services'],
    queryFn: getArtisanServices
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) return updateArtisanService(editing.id, form);
      return createArtisanService(form);
    },
    onSuccess: async () => {
      setEditorOpen(false);
      setEditing(null);
      setForm(emptyForm);
      setError('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['artisan-services'] }),
        queryClient.invalidateQueries({ queryKey: ['artisan-dashboard'] })
      ]);
    },
    onError: (mutationError) => {
      setError(mutationError instanceof ApiError ? mutationError.message : 'Impossible d’enregistrer cette prestation.');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteArtisanService,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['artisan-services'] }),
        queryClient.invalidateQueries({ queryKey: ['artisan-dashboard'] })
      ]);
    }
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setEditorOpen(true);
  }

  function openEdit(service: ServiceItem) {
    setEditing(service);
    setForm(formFromService(service));
    setError('');
    setEditorOpen(true);
  }

  function update<K extends keyof ServiceFormInput>(key: K, value: ServiceFormInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    setError('');

    if (!form.titre.trim() || !form.description.trim()) {
      setError('Le titre et la description sont obligatoires.');
      return;
    }
    if (form.mode_tarification !== 'sur_devis' && (!form.prix.trim() || Number(form.prix) <= 0)) {
      setError('Indiquez un prix supérieur à zéro.');
      return;
    }
    if (Number(form.duree_minutes) < 15 || Number(form.duree_minutes) > 720) {
      setError('La durée doit être comprise entre 15 et 720 minutes.');
      return;
    }
    if (form.rayon_intervention_km && (Number(form.rayon_intervention_km) < 1 || Number(form.rayon_intervention_km) > 500)) {
      setError('Le rayon d’intervention doit être compris entre 1 et 500 km.');
      return;
    }

    saveMutation.mutate();
  }

  return (
    <div>
      <MobileTopBar />

      <section className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--artisan-green)]">Catalogue</p>
          <h1 className="mt-1.5 text-[28px] font-black tracking-[-0.045em] text-[var(--artisan-ink)]">Mes prestations</h1>
          <p className="mt-1 text-sm leading-5 text-[var(--artisan-muted)]">Ce sont les services visibles par vos futurs clients.</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--artisan-green)] text-white shadow-[0_12px_30px_rgba(11,107,80,0.20)]"
          aria-label="Ajouter une prestation"
        >
          <Plus size={20} />
        </button>
      </section>

      <section className="mt-6 space-y-3">
        {services.isPending ? [1, 2, 3].map((item) => <div key={item} className="h-40 animate-pulse rounded-3xl bg-white" />) : null}

        {services.isError ? (
          <div className="rounded-3xl bg-[var(--artisan-danger-soft)] p-5 text-sm font-semibold text-[var(--artisan-danger)]">
            Impossible de charger vos prestations.
          </div>
        ) : null}

        {!services.isPending && !services.isError && !services.data?.length ? (
          <div className="rounded-3xl border border-dashed border-[#CBD5D0] bg-white/70 px-5 py-10 text-center">
            <Wrench className="mx-auto text-[var(--artisan-green)]" size={32} />
            <p className="mt-3 text-sm font-black text-[var(--artisan-ink)]">Aucune prestation publiée</p>
            <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-[var(--artisan-muted)]">Ajoutez votre premier service pour apparaître dans les recherches des clients.</p>
            <button onClick={openCreate} className="mt-4 rounded-2xl bg-[var(--artisan-green)] px-4 py-3 text-xs font-black text-white">Créer une prestation</button>
          </div>
        ) : null}

        {services.data?.map((service) => (
          <article key={service.id} className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-[var(--artisan-shadow-card)]">
            <div className="flex gap-3 p-3">
              <div className="h-28 w-28 shrink-0 overflow-hidden rounded-[20px] bg-gradient-to-br from-[var(--artisan-green-soft)] to-[var(--artisan-orange-soft)]">
                {service.image ? (
                  <img src={service.image} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full place-items-center text-[var(--artisan-green)]"><Wrench size={30} /></div>
                )}
              </div>
              <div className="min-w-0 flex-1 py-1">
                <p className="truncate text-[10px] font-black uppercase tracking-[0.08em] text-[#7A8780]">{service.categorie_label}</p>
                <h2 className="mt-1 line-clamp-2 text-[15px] font-black leading-5 text-[var(--artisan-ink)]">{service.titre}</h2>
                <p className="mt-2 text-sm font-black text-[var(--artisan-green)]">{priceLabel(service)}</p>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-bold text-[var(--artisan-muted)]">
                  <span className="rounded-full bg-[#F7F8F6] px-2 py-1">{service.duree_minutes} min</span>
                  <span className="rounded-full bg-[#F7F8F6] px-2 py-1">{service.mode_intervention_label}</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 border-t border-black/5">
              <button
                type="button"
                onClick={() => openEdit(service)}
                className="flex items-center justify-center gap-2 px-3 py-3 text-xs font-black text-[var(--artisan-green)]"
              >
                <Pencil size={15} /> Modifier
              </button>
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  if (window.confirm(`Supprimer définitivement « ${service.titre} » ?`)) deleteMutation.mutate(service.id);
                }}
                className="flex items-center justify-center gap-2 border-l border-black/5 px-3 py-3 text-xs font-black text-[var(--artisan-danger)] disabled:opacity-50"
              >
                <Trash2 size={15} /> Supprimer
              </button>
            </div>
          </article>
        ))}
      </section>

      {editorOpen ? (
        <div className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-[2px]" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0" onClick={() => setEditorOpen(false)} aria-label="Fermer" />
          <form
            onSubmit={submit}
            className="absolute inset-x-2 bottom-2 top-2 mx-auto flex max-w-[552px] flex-col overflow-hidden rounded-[30px] bg-white shadow-2xl"
          >
            <div className="flex shrink-0 items-start justify-between gap-3 px-5 pb-3 pt-5">
              <div>
                <p className="text-lg font-black text-[var(--artisan-ink)]">{editing ? 'Modifier la prestation' : 'Nouvelle prestation'}</p>
                <p className="mt-1 text-xs leading-5 text-[var(--artisan-muted)]">Présentez clairement ce que vous proposez au client.</p>
              </div>
              <button type="button" onClick={() => setEditorOpen(false)} className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#F4F6F4]" aria-label="Fermer"><X size={18} /></button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
            <label className="mt-2 block text-xs font-black text-[var(--artisan-text)]">Titre
              <input
                required
                maxLength={100}
                value={form.titre}
                onChange={(event) => update('titre', event.target.value)}
                placeholder="Ex. Installation de climatiseur"
                className="mt-2 w-full rounded-2xl border border-[#DDE5E0] bg-[#F9FAF9] px-3.5 py-3 text-sm outline-none focus:border-[var(--artisan-green)]"
              />
            </label>

            <label className="mt-4 block text-xs font-black text-[var(--artisan-text)]">Catégorie
              <select
                value={form.categorie}
                onChange={(event) => update('categorie', event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[#DDE5E0] bg-[#F9FAF9] px-3.5 py-3 text-sm outline-none focus:border-[var(--artisan-green)]"
              >
                {SERVICE_CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>

            <label className="mt-4 block text-xs font-black text-[var(--artisan-text)]">Description
              <textarea
                required
                rows={4}
                value={form.description}
                onChange={(event) => update('description', event.target.value)}
                placeholder="Décrivez ce qui est inclus dans la prestation…"
                className="mt-2 w-full resize-none rounded-2xl border border-[#DDE5E0] bg-[#F9FAF9] px-3.5 py-3 text-sm leading-5 outline-none focus:border-[var(--artisan-green)]"
              />
            </label>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="text-xs font-black text-[var(--artisan-text)]">Tarification
                <select
                  value={form.mode_tarification}
                  onChange={(event) => update('mode_tarification', event.target.value as ServiceFormInput['mode_tarification'])}
                  className="mt-2 w-full rounded-2xl border border-[#DDE5E0] bg-[#F9FAF9] px-3 py-3 text-sm outline-none focus:border-[var(--artisan-green)]"
                >
                  <option value="fixe">Prix fixe</option>
                  <option value="a_partir_de">À partir de</option>
                  <option value="sur_devis">Sur devis</option>
                </select>
              </label>
              <label className="text-xs font-black text-[var(--artisan-text)]">Prix FCFA
                <input
                  type="number"
                  min="0"
                  step="1"
                  disabled={form.mode_tarification === 'sur_devis'}
                  value={form.prix}
                  onChange={(event) => update('prix', event.target.value)}
                  placeholder={form.mode_tarification === 'sur_devis' ? 'Sur devis' : '10000'}
                  className="mt-2 w-full rounded-2xl border border-[#DDE5E0] bg-[#F9FAF9] px-3 py-3 text-sm outline-none disabled:opacity-50 focus:border-[var(--artisan-green)]"
                />
              </label>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="text-xs font-black text-[var(--artisan-text)]">Durée (min)
                <input
                  type="number"
                  min="15"
                  max="720"
                  step="15"
                  value={form.duree_minutes}
                  onChange={(event) => update('duree_minutes', event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-[#DDE5E0] bg-[#F9FAF9] px-3 py-3 text-sm outline-none focus:border-[var(--artisan-green)]"
                />
              </label>
              <label className="text-xs font-black text-[var(--artisan-text)]">Réserver ≥ (h)
                <input
                  type="number"
                  min="0"
                  max="720"
                  value={form.delai_reservation_heures}
                  onChange={(event) => update('delai_reservation_heures', event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-[#DDE5E0] bg-[#F9FAF9] px-3 py-3 text-sm outline-none focus:border-[var(--artisan-green)]"
                />
              </label>
            </div>

            <label className="mt-4 block text-xs font-black text-[var(--artisan-text)]">Mode d’intervention
              <select
                value={form.mode_intervention}
                onChange={(event) => update('mode_intervention', event.target.value as ServiceFormInput['mode_intervention'])}
                className="mt-2 w-full rounded-2xl border border-[#DDE5E0] bg-[#F9FAF9] px-3.5 py-3 text-sm outline-none focus:border-[var(--artisan-green)]"
              >
                <option value="chez_client">Chez le client</option>
                <option value="atelier">Dans mon atelier</option>
                <option value="les_deux">Chez le client ou en atelier</option>
              </select>
            </label>

            {form.mode_intervention !== 'atelier' ? (
              <label className="mt-4 block text-xs font-black text-[var(--artisan-text)]">Rayon d’intervention (km)
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={form.rayon_intervention_km}
                  onChange={(event) => update('rayon_intervention_km', event.target.value)}
                  placeholder="Ex. 15"
                  className="mt-2 w-full rounded-2xl border border-[#DDE5E0] bg-[#F9FAF9] px-3.5 py-3 text-sm outline-none focus:border-[var(--artisan-green)]"
                />
              </label>
            ) : null}

            <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-[#C9D6CF] bg-[#F9FAF9] p-3.5">
              <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[var(--artisan-green-soft)] text-[var(--artisan-green)]"><ImagePlus size={19} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-black text-[var(--artisan-ink)]">Photo de la prestation</span>
                <span className="mt-0.5 block truncate text-[11px] text-[var(--artisan-muted)]">{form.image?.name ?? (editing?.image ? 'Conserver la photo actuelle' : 'JPG, PNG ou WebP')}</span>
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(event) => update('image', event.target.files?.[0] ?? null)}
              />
            </label>

            <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-[#F7F8F6] p-3 text-center text-[10px] font-bold text-[var(--artisan-muted)]">
              <span className="flex flex-col items-center gap-1"><Tag size={15} className="text-[var(--artisan-green)]" /> Prix clair</span>
              <span className="flex flex-col items-center gap-1"><Clock3 size={15} className="text-[var(--artisan-green)]" /> Durée réelle</span>
              <span className="flex flex-col items-center gap-1"><MapPinned size={15} className="text-[var(--artisan-green)]" /> Zone précise</span>
            </div>

            {error ? <p className="mt-4 rounded-2xl bg-[var(--artisan-danger-soft)] px-3 py-2.5 text-xs font-semibold text-[var(--artisan-danger)]">{error}</p> : null}
            </div>

            <div className="shrink-0 border-t border-black/5 bg-white px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
            <button
              disabled={saveMutation.isPending}
              className="w-full rounded-2xl bg-[var(--artisan-green)] px-4 py-3.5 text-sm font-black text-white shadow-sm disabled:opacity-60"
            >
              {saveMutation.isPending ? 'Enregistrement…' : editing ? 'Enregistrer les modifications' : 'Publier la prestation'}
            </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
