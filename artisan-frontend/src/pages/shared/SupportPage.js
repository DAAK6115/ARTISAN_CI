import { useEffect, useState } from 'react';
import axios from '../../utils/axiosInstance';

const STATUS = { new: 'Nouveau', in_progress: 'En cours', waiting_user: 'Action requise', resolved: 'Résolu', closed: 'Fermé' };

export default function SupportPage() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ objet: '', message: '', priorite: 'normal' });
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  const load = async () => {
    try { const r = await axios.get('/support/mes/'); setItems(r.data || []); }
    catch { setNotice('Impossible de charger vos demandes support.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const submit = async (event) => {
    event.preventDefault(); setNotice('');
    try {
      await axios.post('/support/envoyer/', form);
      setForm({ objet: '', message: '', priorite: 'normal' });
      setNotice('Demande envoyée.'); await load();
    } catch (error) { setNotice(error?.response?.data?.detail || 'Impossible d’envoyer la demande.'); }
  };

  return <div className="mx-auto max-w-[1200px] space-y-6 p-4 pb-28 sm:p-6 lg:pb-8">
    <div><p className="text-xs font-black uppercase tracking-[0.2em] text-[#0B6B50]">Assistance</p><h1 className="mt-2 text-3xl font-black">Support ARTISAN_CI</h1><p className="mt-2 text-sm text-[#718078]">Posez une question ou signalez un problème lié à votre compte.</p></div>
    {notice && <p className="rounded-2xl bg-[#EDF4FF] p-3 text-sm font-semibold text-[#3565A8]">{notice}</p>}
    <section className="rounded-[28px] border border-black/5 bg-white p-5 shadow-sm"><h2 className="font-black">Nouvelle demande</h2><form onSubmit={submit} className="mt-4 grid gap-3"><input required minLength={3} value={form.objet} onChange={(e) => setForm({ ...form, objet: e.target.value })} placeholder="Objet" className="rounded-2xl border border-black/10 px-4 py-3 text-sm" /><textarea required minLength={10} rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Expliquez votre demande" className="rounded-2xl border border-black/10 px-4 py-3 text-sm" /><select value={form.priorite} onChange={(e) => setForm({ ...form, priorite: e.target.value })} className="rounded-2xl border border-black/10 px-4 py-3 text-sm"><option value="low">Faible</option><option value="normal">Normale</option><option value="high">Haute</option><option value="urgent">Urgente</option></select><button className="w-fit rounded-2xl bg-[#0B6B50] px-5 py-3 text-sm font-black text-white">Envoyer</button></form></section>
    <section><h2 className="text-xl font-black">Mes demandes</h2>{loading ? <p className="mt-4">Chargement…</p> : items.length === 0 ? <p className="mt-4 rounded-2xl bg-white p-5 text-sm text-[#718078]">Aucune demande pour le moment.</p> : <div className="mt-4 grid gap-3">{items.map((item) => <article key={item.id} className="rounded-[24px] border border-black/5 bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-black">#{item.id} · {item.objet}</h3><span className="rounded-full bg-[#F1F4F2] px-3 py-1 text-xs font-bold">{item.statut_label || STATUS[item.statut] || item.statut}</span></div><p className="mt-3 text-sm leading-6 text-[#607067]">{item.message}</p>{item.admin_response && <div className="mt-4 rounded-2xl bg-[#EAF4F0] p-4"><p className="text-xs font-black uppercase tracking-wider text-[#0B6B50]">Réponse administration</p><p className="mt-2 text-sm">{item.admin_response}</p></div>}</article>)}</div>}</section>
  </div>;
}
