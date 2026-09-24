import { useEffect, useState } from 'react';
import axios from '../../utils/axiosInstance';
import AppIcon from '../../components/AppIcon';

export default function ArtisanCertifications() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ nom: '', organisme: '', valide_jusquau: '', fichier: null });
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try { const response = await axios.get('/certifications/mes/'); setItems(response.data || []); }
    catch { setMessage('Impossible de charger vos certifications.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const submit = async (event) => {
    event.preventDefault();
    const data = new FormData();
    data.append('nom', form.nom.trim()); data.append('organisme', form.organisme.trim());
    if (form.valide_jusquau) data.append('valide_jusquau', form.valide_jusquau);
    if (form.fichier) data.append('fichier', form.fichier);
    try {
      if (editingId) await axios.patch(`/certifications/${editingId}/modifier/`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
      else await axios.post('/certifications/ajouter/', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      setForm({ nom: '', organisme: '', valide_jusquau: '', fichier: null }); setEditingId(null); setMessage('Certification enregistrée.'); await load();
    } catch { setMessage('Impossible d’enregistrer cette certification. Vérifiez le fichier fourni.'); }
  };

  const remove = async (id) => { if (!window.confirm('Supprimer cette certification ?')) return; try { await axios.delete(`/certifications/${id}/supprimer/`); await load(); } catch { setMessage('Suppression impossible.'); } };

  return (
    <div className="mx-auto max-w-[1250px] space-y-6 p-4 pb-28 sm:p-6 lg:pb-8">
      <div><p className="text-xs font-black uppercase tracking-[0.2em] text-[#0B6B50]">Crédibilité professionnelle</p><h1 className="mt-2 text-3xl font-black">Certifications</h1><p className="mt-2 max-w-2xl text-sm text-[#718078]">Ajoutez vos diplômes, attestations et certifications. Chaque ajout ou modification est soumis à l’administration. Seules les certifications vérifiées apparaissent sur votre profil public.</p></div>
      {message && <p className="rounded-2xl bg-[#EDF4FF] p-3 text-sm font-semibold text-[#3565A8]">{message}</p>}
      <section className="rounded-[28px] border border-black/5 bg-white p-5 shadow-[0_8px_28px_rgba(30,45,37,0.05)] sm:p-6">
        <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#FFF7DD] text-[#8A6500]"><AppIcon name="award" className="h-5 w-5" /></span><div><h2 className="font-black">{editingId ? 'Modifier la certification' : 'Ajouter une certification'}</h2><p className="text-xs text-[#829087]">PDF ou image selon les règles d’upload du backend</p></div></div>
        <form onSubmit={submit} className="mt-5 grid gap-3 sm:grid-cols-2">
          <input required value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} placeholder="Nom de la certification" className="rounded-2xl border border-black/10 px-4 py-3 text-sm" />
          <input required value={form.organisme} onChange={(e) => setForm({ ...form, organisme: e.target.value })} placeholder="Organisme délivreur" className="rounded-2xl border border-black/10 px-4 py-3 text-sm" />
          <label className="text-xs font-bold text-[#607067]">Valide jusqu’au<input type="date" value={form.valide_jusquau} onChange={(e) => setForm({ ...form, valide_jusquau: e.target.value })} className="mt-1 w-full rounded-2xl border border-black/10 px-4 py-3 text-sm font-normal" /></label>
          <label className="text-xs font-bold text-[#607067]">Justificatif<input type="file" onChange={(e) => setForm({ ...form, fichier: e.target.files?.[0] || null })} className="mt-1 w-full rounded-2xl border border-black/10 px-4 py-3 text-sm font-normal" /></label>
          <div className="flex gap-2 sm:col-span-2"><button className="rounded-2xl bg-[#0B6B50] px-5 py-3 text-sm font-black text-white">Enregistrer</button>{editingId && <button type="button" onClick={() => { setEditingId(null); setForm({ nom: '', organisme: '', valide_jusquau: '', fichier: null }); }} className="rounded-2xl border border-black/10 px-5 py-3 text-sm font-black">Annuler</button>}</div>
        </form>
      </section>
      {loading ? <p>Chargement...</p> : items.length === 0 ? <div className="rounded-[28px] border border-dashed border-black/10 bg-white p-10 text-center text-sm text-[#718078]">Aucune certification ajoutée.</div> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{items.map((item) => <article key={item.id} className="rounded-[24px] border border-black/5 bg-white p-5 shadow-[0_8px_24px_rgba(30,45,37,0.04)]"><div className="flex items-start gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#FFF7DD] text-[#8A6500]"><AppIcon name="award" className="h-5 w-5" /></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-black">{item.nom}</h3><span className={`rounded-full px-2 py-1 text-[10px] font-black ${item.status === 'verified' ? 'bg-[#EAF4F0] text-[#0B6B50]' : item.status === 'rejected' ? 'bg-[#FFF0EE] text-[#B23A31]' : 'bg-[#FFF7DD] text-[#745B15]'}`}>{item.status_label || item.status}</span></div><p className="text-sm text-[#718078]">{item.organisme}</p></div></div>{item.valide_jusquau && <p className="mt-3 text-xs font-semibold text-[#829087]">Échéance : {new Date(`${item.valide_jusquau}T00:00:00`).toLocaleDateString('fr-FR')}</p>}{item.review_note && <p className="mt-3 rounded-xl bg-[#F7F8F6] p-3 text-xs text-[#607067]">Note administration : {item.review_note}</p>}{item.fichier && <a href={item.fichier} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-black text-[#3565A8]">Voir le justificatif</a>}<div className="mt-4 flex gap-3 text-sm font-bold"><button onClick={() => { setEditingId(item.id); setForm({ nom: item.nom, organisme: item.organisme, valide_jusquau: item.valide_jusquau || '', fichier: null }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-[#0B6B50]">Modifier</button><button onClick={() => remove(item.id)} className="text-[#B23A31]">Supprimer</button></div></article>)}</div>}
    </div>
  );
}
