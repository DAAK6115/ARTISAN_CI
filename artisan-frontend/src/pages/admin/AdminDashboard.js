import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../../utils/axiosInstance';

const money = (value) => `${new Intl.NumberFormat('fr-FR').format(Number(value || 0))} FCFA`;

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { axios.get('/moderation/admin/dashboard/').then((r) => setData(r.data)).catch(() => setError('Impossible de charger le tableau de bord administrateur.')); }, []);
  if (error) return <div className="p-6 text-red-700">{error}</div>;
  if (!data) return <div className="p-6">Chargement…</div>;
  const s = data.summary || {};
  const cards = [
    ['Utilisateurs', s.users], ['Artisans actifs', s.artisans], ['Clients actifs', s.clients],
    ['Artisans à vérifier', s.pending_artisans], ['Certifications à vérifier', s.pending_certifications],
    ['Signalements ouverts', s.open_reports], ['Litiges ouverts', s.open_disputes], ['Support ouvert', s.open_support],
  ];
  const maxReg = Math.max(1, ...(data.registrations || []).map((x) => x.total));
  return <div className="mx-auto max-w-[1450px] space-y-7 p-4 sm:p-6 lg:p-8">
    <div><p className="text-xs font-black uppercase tracking-[0.2em] text-[#0B6B50]">Pilotage plateforme</p><h1 className="mt-2 text-3xl font-black">Tableau de bord administrateur</h1><p className="mt-2 text-sm text-[#718078]">Vue globale de l’activité, de la confiance et des dossiers à traiter.</p></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value]) => <div key={label} className="rounded-[24px] border border-black/5 bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-wider text-[#829087]">{label}</p><p className="mt-2 text-3xl font-black">{value ?? 0}</p></div>)}</div>
    <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
      <section className="rounded-[28px] border border-black/5 bg-white p-5"><div className="flex items-end justify-between"><div><p className="text-xs font-black uppercase tracking-wider text-[#0B6B50]">Croissance</p><h2 className="mt-1 text-xl font-black">Inscriptions récentes</h2></div><span className="text-sm font-bold text-[#718078]">6 mois</span></div><div className="mt-6 flex h-56 items-end gap-3">{(data.registrations || []).map((row) => <div key={row.month} className="flex min-w-0 flex-1 flex-col items-center gap-2"><span className="text-xs font-black">{row.total}</span><div className="w-full rounded-t-xl bg-[#0B6B50]" style={{ height: `${Math.max(8, (row.total / maxReg) * 170)}px` }} /><span className="truncate text-[10px] font-bold text-[#829087]">{new Date(`${row.month}T00:00:00`).toLocaleDateString('fr-FR', { month: 'short' })}</span></div>)}</div></section>
      <section className="rounded-[28px] border border-black/5 bg-white p-5"><p className="text-xs font-black uppercase tracking-wider text-[#E07A32]">Activité déclarée</p><h2 className="mt-1 text-xl font-black">Volume de règlements</h2><p className="mt-5 text-4xl font-black text-[#0B6B50]">{money(s.paid_volume)}</p><p className="mt-2 text-sm text-[#718078]">Somme des règlements marqués « Payé » par les artisans.</p><div className="mt-6 grid gap-2"><Link to="/admin/moderation" className="rounded-2xl bg-[#F7F8F6] px-4 py-3 text-sm font-black">Traiter les signalements et litiges →</Link><Link to="/admin/certifications" className="rounded-2xl bg-[#F7F8F6] px-4 py-3 text-sm font-black">Vérifier les certifications →</Link></div></section>
    </div>
    <section className="rounded-[28px] border border-black/5 bg-white p-5"><h2 className="text-xl font-black">Catégories de prestations actives</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{(data.service_categories || []).map((row) => <div key={row.categorie} className="rounded-2xl bg-[#F7F8F6] p-4"><p className="text-sm font-black">{row.categorie}</p><p className="mt-1 text-2xl font-black text-[#0B6B50]">{row.total}</p></div>)}</div></section>
  </div>;
}
