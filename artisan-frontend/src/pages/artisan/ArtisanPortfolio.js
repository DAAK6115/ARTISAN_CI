import { useEffect, useState } from 'react';
import axios from '../../utils/axiosInstance';
import ArtisanMap from '../../components/ArtisanMap';
import AppIcon from '../../components/AppIcon';

export default function ArtisanPortfolio() {
  const [portfolio, setPortfolio] = useState(null);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ titre: '', description: '', image: null });
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const response = await axios.get('/portfolio/me/');
      setPortfolio(response.data);
      setItems(response.data.realisations || []);
    } catch {
      setMessage('Impossible de charger votre portfolio.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const savePosition = () => {
    if (!navigator.geolocation) return setMessage('La géolocalisation n’est pas disponible sur cet appareil.');
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        await axios.patch('/portfolio/me/', { latitude: coords.latitude, longitude: coords.longitude });
        setMessage('Position professionnelle mise à jour.');
        await load();
      } catch { setMessage('Impossible d’enregistrer votre position.'); }
    }, () => setMessage('Autorisez la localisation pour enregistrer votre position.'));
  };

  const submit = async (event) => {
    event.preventDefault();
    const data = new FormData();
    data.append('titre', form.titre.trim());
    data.append('description', form.description.trim());
    if (form.image) data.append('image', form.image);
    try {
      if (editingId) await axios.patch(`/portfolio/realisation/${editingId}/`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
      else await axios.post('/portfolio/realisation/add/', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      setForm({ titre: '', description: '', image: null });
      setEditingId(null);
      setMessage(editingId ? 'Réalisation mise à jour.' : 'Réalisation ajoutée.');
      await load();
    } catch { setMessage('Impossible d’enregistrer cette réalisation.'); }
  };

  const edit = (item) => {
    setEditingId(item.id);
    setForm({ titre: item.titre || '', description: item.description || '', image: null });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const remove = async (id) => {
    if (!window.confirm('Supprimer cette réalisation ?')) return;
    try { await axios.delete(`/portfolio/realisation/${id}/`); await load(); }
    catch { setMessage('Suppression impossible.'); }
  };

  return (
    <div className="mx-auto max-w-[1350px] space-y-6 p-4 pb-28 sm:p-6 lg:pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-black uppercase tracking-[0.2em] text-[#0B6B50]">Votre vitrine</p><h1 className="mt-2 text-3xl font-black tracking-tight">Portfolio</h1><p className="mt-2 text-sm text-[#718078]">Montrez votre savoir-faire avec de vraies réalisations.</p></div>
        <button onClick={savePosition} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-black text-[#435149]"><AppIcon name="pin" className="h-4 w-4" /> Mettre à jour ma position</button>
      </div>

      {message && <p className="rounded-2xl bg-[#EDF4FF] p-3 text-sm font-semibold text-[#3565A8]">{message}</p>}

      {portfolio && (
        <section className="grid gap-5 rounded-[28px] border border-black/5 bg-white p-5 shadow-[0_8px_28px_rgba(30,45,37,0.05)] lg:grid-cols-[1.1fr_1fr]">
          <div>
            {portfolio.photo_couverture ? <img src={portfolio.photo_couverture} alt="Couverture" className="h-56 w-full rounded-[22px] object-cover" /> : <div className="grid h-56 place-items-center rounded-[22px] bg-[#F4F6F4] text-sm text-[#829087]">Ajoutez une photo de couverture depuis votre profil</div>}
            <h2 className="mt-4 text-xl font-black">{portfolio.artisan_nom}</h2>
            <p className="mt-2 text-sm leading-6 text-[#607067]">{portfolio.bio || 'Votre bio professionnelle apparaîtra ici.'}</p>
            <p className="mt-3 text-sm font-semibold text-[#435149]">{portfolio.localisation ? `📍 ${portfolio.localisation}` : 'Localisation non renseignée'}</p>
          </div>
          <div>{portfolio.latitude && portfolio.longitude ? <ArtisanMap latitude={portfolio.latitude} longitude={portfolio.longitude} /> : <div className="grid h-[250px] place-items-center rounded-[22px] bg-[#F7F8F6] p-6 text-center text-sm text-[#718078]">Enregistrez votre position pour apparaître correctement dans les recherches de proximité.</div>}</div>
        </section>
      )}

      <section className="rounded-[28px] border border-black/5 bg-white p-5 shadow-[0_8px_28px_rgba(30,45,37,0.05)] sm:p-6">
        <h2 className="text-lg font-black">{editingId ? 'Modifier une réalisation' : 'Ajouter une réalisation'}</h2>
        <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} required placeholder="Titre de la réalisation" className="rounded-2xl border border-black/10 px-4 py-3 text-sm" />
          <input type="file" accept="image/*" onChange={(e) => setForm({ ...form, image: e.target.files?.[0] || null })} className="rounded-2xl border border-black/10 px-4 py-3 text-sm" required={!editingId} />
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Décrivez brièvement le travail réalisé" className="min-h-24 rounded-2xl border border-black/10 px-4 py-3 text-sm sm:col-span-2" />
          <div className="flex gap-2 sm:col-span-2"><button className="rounded-2xl bg-[#0B6B50] px-5 py-3 text-sm font-black text-white">{editingId ? 'Enregistrer' : 'Ajouter au portfolio'}</button>{editingId && <button type="button" onClick={() => { setEditingId(null); setForm({ titre: '', description: '', image: null }); }} className="rounded-2xl border border-black/10 px-5 py-3 text-sm font-black">Annuler</button>}</div>
        </form>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between"><div><h2 className="text-xl font-black">Mes réalisations</h2><p className="text-sm text-[#718078]">{items.length} élément{items.length > 1 ? 's' : ''}</p></div></div>
        {loading ? <p>Chargement...</p> : items.length === 0 ? <div className="rounded-[28px] border border-dashed border-black/10 bg-white p-10 text-center text-sm text-[#718078]">Votre portfolio est encore vide.</div> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{items.map((item) => <article key={item.id} className="overflow-hidden rounded-[26px] border border-black/5 bg-white shadow-[0_8px_26px_rgba(30,45,37,0.05)]">{item.image && <img src={item.image} alt={item.titre || 'Réalisation'} className="h-52 w-full object-cover" />}<div className="p-4"><h3 className="font-black">{item.titre || 'Réalisation'}</h3><p className="mt-2 line-clamp-3 text-sm text-[#718078]">{item.description || 'Aucune description.'}</p><div className="mt-4 flex gap-3 text-sm font-bold"><button onClick={() => edit(item)} className="text-[#0B6B50]">Modifier</button><button onClick={() => remove(item.id)} className="text-[#B23A31]">Supprimer</button></div></div></article>)}</div>}
      </section>
    </div>
  );
}
