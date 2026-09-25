import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, LocateFixed, MapPin, Plus, Trash2 } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { ApiError } from '../api/http';
import { PageHeader } from '../components/PageHeader';
import { addRealisation, deleteRealisation, getMyPortfolio, updateMyPortfolio } from '../features/artisan/professional.api';

export function ArtisanPortfolioPage() {
  const queryClient = useQueryClient();
  const portfolio = useQuery({ queryKey: ['artisan-portfolio'], queryFn: getMyPortfolio });
  const [bio, setBio] = useState('');
  const [localisation, setLocalisation] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [siteWeb, setSiteWeb] = useState('');
  const [facebook, setFacebook] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [visible, setVisible] = useState(true);
  const [cover, setCover] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [realisationOpen, setRealisationOpen] = useState(false);
  const [geoBusy, setGeoBusy] = useState(false);

  useEffect(() => {
    if (!portfolio.data) return;
    setBio(portfolio.data.bio ?? '');
    setLocalisation(portfolio.data.localisation ?? '');
    setWhatsapp(portfolio.data.whatsapp ?? '');
    setSiteWeb(portfolio.data.site_web ?? '');
    setFacebook(portfolio.data.facebook ?? '');
    setLatitude(portfolio.data.latitude == null ? '' : String(portfolio.data.latitude));
    setLongitude(portfolio.data.longitude == null ? '' : String(portfolio.data.longitude));
    setVisible(portfolio.data.visible);
  }, [portfolio.data]);

  const save = useMutation({
    mutationFn: () => updateMyPortfolio({ bio, localisation, whatsapp, site_web: siteWeb, facebook, latitude, longitude, visible, photo_couverture: cover }),
    onSuccess: async () => {
      setCover(null);
      setError('');
      await queryClient.invalidateQueries({ queryKey: ['artisan-portfolio'] });
      await queryClient.invalidateQueries({ queryKey: ['artisan-dashboard'] });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Impossible d’enregistrer le portfolio.')
  });

  const removeRealisation = useMutation({
    mutationFn: deleteRealisation,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['artisan-portfolio'] })
  });

  const add = useMutation({
    mutationFn: addRealisation,
    onSuccess: async () => {
      setRealisationOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['artisan-portfolio'] });
    }
  });

  function useLocation() {
    if (!navigator.geolocation) {
      setError('La géolocalisation n’est pas disponible sur cet appareil.');
      return;
    }
    setGeoBusy(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
        setGeoBusy(false);
      },
      () => {
        setError('Impossible de récupérer votre position. Vérifiez l’autorisation de localisation.');
        setGeoBusy(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }

  function submitRealisation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const titre = String(data.get('titre') ?? '').trim();
    const description = String(data.get('description') ?? '').trim();
    const image = (data.get('image') as File | null);
    if (!image || image.size === 0) return;
    add.mutate({ titre, description, image });
  }

  return (
    <div>
      <PageHeader title="Portfolio" subtitle="Votre vitrine professionnelle" />

      {portfolio.isPending ? <div className="h-64 animate-pulse rounded-3xl bg-white" /> : null}

      {portfolio.data ? (
        <>
          <section className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-[var(--artisan-shadow-card)]">
            <div className="relative h-36 bg-gradient-to-br from-[var(--artisan-green-soft)] to-[var(--artisan-orange-soft)]">
              {portfolio.data.photo_couverture ? <img src={portfolio.data.photo_couverture} alt="" className="h-full w-full object-cover" /> : null}
              <label className="absolute bottom-3 right-3 flex cursor-pointer items-center gap-2 rounded-2xl bg-white/95 px-3 py-2 text-xs font-black text-[var(--artisan-ink)] shadow-sm backdrop-blur">
                <Camera size={16} /> Couverture
                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => setCover(e.target.files?.[0] ?? null)} />
              </label>
            </div>
            <div className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-black text-[var(--artisan-ink)]">{portfolio.data.artisan_nom}</p>
                  <p className="mt-1 text-xs font-semibold text-[var(--artisan-muted)]">{portfolio.data.localisation || 'Localisation à renseigner'}</p>
                </div>
                <label className="flex items-center gap-2 text-xs font-black text-[var(--artisan-green)]"><input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} /> Profil public</label>
              </div>
            </div>
          </section>

          <section className="mt-4 rounded-3xl border border-black/5 bg-white p-5 shadow-sm">
            <p className="text-sm font-black text-[var(--artisan-ink)]">Informations publiques</p>
            <div className="mt-4 space-y-4">
              <label className="block"><span className="text-xs font-black">Bio</span><textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} placeholder="Présentez votre expérience et votre savoir-faire…" className="mt-2 w-full resize-none rounded-2xl border border-[#D9E1DD] px-4 py-3 text-sm outline-none focus:border-[var(--artisan-green)]" /></label>
              <label className="block"><span className="text-xs font-black">Localisation</span><input value={localisation} onChange={(e) => setLocalisation(e.target.value)} placeholder="Ex. Cocody Angré, Abidjan" className="mt-2 min-h-12 w-full rounded-2xl border border-[#D9E1DD] px-4 text-sm font-semibold outline-none focus:border-[var(--artisan-green)]" /></label>
              <button type="button" onClick={useLocation} disabled={geoBusy} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--artisan-green-soft)] px-4 text-xs font-black text-[var(--artisan-green)]"><LocateFixed size={16} /> {geoBusy ? 'Localisation…' : 'Utiliser ma position actuelle'}</button>
              {(latitude || longitude) ? <div className="flex items-center gap-2 rounded-2xl bg-[#F7F8F6] px-3 py-2 text-[11px] font-semibold text-[var(--artisan-muted)]"><MapPin size={15} /> {latitude || '—'}, {longitude || '—'}</div> : null}
              <label className="block"><span className="text-xs font-black">WhatsApp</span><input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+2250102030405" className="mt-2 min-h-12 w-full rounded-2xl border border-[#D9E1DD] px-4 text-sm font-semibold outline-none focus:border-[var(--artisan-green)]" /></label>
              <label className="block"><span className="text-xs font-black">Site web</span><input value={siteWeb} onChange={(e) => setSiteWeb(e.target.value)} placeholder="https://…" className="mt-2 min-h-12 w-full rounded-2xl border border-[#D9E1DD] px-4 text-sm font-semibold outline-none focus:border-[var(--artisan-green)]" /></label>
              <label className="block"><span className="text-xs font-black">Facebook</span><input value={facebook} onChange={(e) => setFacebook(e.target.value)} placeholder="https://facebook.com/…" className="mt-2 min-h-12 w-full rounded-2xl border border-[#D9E1DD] px-4 text-sm font-semibold outline-none focus:border-[var(--artisan-green)]" /></label>
            </div>
            {error ? <p className="mt-4 rounded-2xl bg-[var(--artisan-danger-soft)] px-3 py-2 text-xs font-semibold text-[#A83228]">{error}</p> : null}
            <button type="button" onClick={() => save.mutate()} disabled={save.isPending} className="mt-4 min-h-12 w-full rounded-2xl bg-[var(--artisan-green)] px-4 text-sm font-black text-white disabled:opacity-50">{save.isPending ? 'Enregistrement…' : 'Enregistrer le portfolio'}</button>
          </section>

          <section className="mt-7">
            <div className="flex items-end justify-between gap-3">
              <div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--artisan-green)]">Preuves de savoir-faire</p><h2 className="mt-1.5 text-xl font-black tracking-[-0.035em]">Réalisations</h2></div>
              <button type="button" onClick={() => setRealisationOpen(true)} className="flex items-center gap-2 rounded-2xl bg-[var(--artisan-green)] px-3 py-2 text-xs font-black text-white"><Plus size={16} /> Ajouter</button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {portfolio.data.realisations.map((item) => (
                <article key={item.id} className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm">
                  {item.image ? <img src={item.image} alt="" className="h-32 w-full object-cover" /> : <div className="h-32 bg-[var(--artisan-green-soft)]" />}
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-2"><p className="line-clamp-2 text-xs font-black">{item.titre || 'Réalisation'}</p><button type="button" onClick={() => removeRealisation.mutate(item.id)} aria-label="Supprimer" className="grid size-8 shrink-0 place-items-center rounded-xl bg-[var(--artisan-danger-soft)] text-[#A83228]"><Trash2 size={14} /></button></div>
                    {item.description ? <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-[var(--artisan-muted)]">{item.description}</p> : null}
                  </div>
                </article>
              ))}
            </div>
            {!portfolio.data.realisations.length ? <div className="mt-4 rounded-3xl border border-dashed border-[#CDD8D2] bg-white/70 p-6 text-center text-sm font-semibold text-[var(--artisan-muted)]">Ajoutez vos meilleures réalisations pour rassurer les clients.</div> : null}
          </section>
        </>
      ) : null}

      {realisationOpen ? (
        <div className="fixed inset-0 z-[80] bg-black/45 backdrop-blur-[2px]">
          <button className="absolute inset-0" onClick={() => setRealisationOpen(false)} aria-label="Fermer" />
          <form onSubmit={submitRealisation} className="absolute inset-x-3 bottom-3 grid max-h-[calc(100dvh-24px)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-[28px] bg-white shadow-2xl">
            <div className="border-b border-black/5 px-5 py-4"><p className="text-lg font-black">Nouvelle réalisation</p><p className="mt-1 text-xs text-[var(--artisan-muted)]">Ajoutez une photo d’un travail réellement réalisé.</p></div>
            <div className="overflow-y-auto px-5 py-4">
              <label className="block"><span className="text-xs font-black">Titre</span><input name="titre" maxLength={100} className="mt-2 min-h-12 w-full rounded-2xl border border-[#D9E1DD] px-4 text-sm font-semibold outline-none" /></label>
              <label className="mt-4 block"><span className="text-xs font-black">Description</span><textarea name="description" rows={3} className="mt-2 w-full resize-none rounded-2xl border border-[#D9E1DD] px-4 py-3 text-sm outline-none" /></label>
              <label className="mt-4 block"><span className="text-xs font-black">Photo *</span><input name="image" type="file" required accept="image/png,image/jpeg,image/webp" className="mt-2 block w-full rounded-2xl border border-dashed border-[#BFCBC5] bg-[#F7F8F6] p-3 text-xs" /></label>
              {add.isError ? <p className="mt-4 rounded-2xl bg-[var(--artisan-danger-soft)] px-3 py-2 text-xs font-semibold text-[#A83228]">{add.error instanceof Error ? add.error.message : 'Ajout impossible.'}</p> : null}
            </div>
            <div className="border-t border-black/5 bg-white p-4" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}><button type="submit" disabled={add.isPending} className="min-h-[52px] w-full rounded-2xl bg-[var(--artisan-green)] px-4 text-sm font-black text-white disabled:opacity-50">{add.isPending ? 'Ajout…' : 'Ajouter la réalisation'}</button></div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
