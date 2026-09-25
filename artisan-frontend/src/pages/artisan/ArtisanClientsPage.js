import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../../utils/axiosInstance';
import AppIcon from '../../components/AppIcon';
import useAutoRefresh from '../../hooks/useAutoRefresh';

function money(value) {
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(value || 0))} FCFA`;
}

export default function ArtisanClientsPage() {
  const [clients, setClients] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await axios.get('/appointments/artisan-clients/');
      setClients(response.data || []);
      setError('');
    } catch {
      if (!silent) setError('Impossible de charger votre clientèle.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  useAutoRefresh(() => load(true), { intervalMs: 20000 });

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return clients;
    return clients.filter((client) => `${client.username} ${client.last_service}`.toLowerCase().includes(needle));
  }, [clients, query]);

  return (
    <div className="mx-auto max-w-[1350px] p-4 pb-28 sm:p-6 lg:pb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#0B6B50]">Relation client</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[#111815]">Mes clients</h1>
          <p className="mt-2 text-sm text-[#718078]">Retrouvez uniquement les personnes qui ont eu un rendez-vous avec vous.</p>
        </div>
        <div className="relative w-full sm:max-w-sm">
          <AppIcon name="search" className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#829087]" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un client ou une prestation" className="w-full rounded-2xl border border-black/10 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-[#0B6B50]" />
        </div>
      </div>

      {error && <p className="mt-5 rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      {loading ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[1,2,3].map((x) => <div key={x} className="h-44 animate-pulse rounded-[24px] bg-white" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="mt-6 rounded-[28px] border border-dashed border-black/10 bg-white p-10 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#EAF4F0] text-[#0B6B50]"><AppIcon name="users" className="h-6 w-6" /></span>
          <h2 className="mt-4 font-black">Aucun client trouvé</h2>
          <p className="mt-1 text-sm text-[#718078]">Les clients apparaîtront ici dès qu’un rendez-vous sera créé.</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((client) => (
            <article key={client.id} className="rounded-[26px] border border-black/5 bg-white p-5 shadow-[0_8px_26px_rgba(30,45,37,0.05)]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#EAF4F0] font-black text-[#0B6B50]">{client.username?.slice(0, 1)?.toUpperCase()}</span>
                  <div className="min-w-0"><h2 className="truncate font-black text-[#17211D]">{client.username}</h2><p className="truncate text-xs text-[#829087]">Dernière prestation : {client.last_service}</p></div>
                </div>
                <span className="rounded-full bg-[#F4F6F4] px-2.5 py-1 text-[11px] font-bold text-[#607067]">{client.appointments_count} RDV</span>
              </div>

              <dl className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-[#F7F8F6] p-3"><dt className="text-[11px] font-bold text-[#829087]">Prestations terminées</dt><dd className="mt-1 text-lg font-black">{client.completed_count}</dd></div>
                <div className="rounded-2xl bg-[#F7F8F6] p-3"><dt className="text-[11px] font-bold text-[#829087]">Règlements reçus</dt><dd className="mt-1 text-sm font-black text-[#0B6B50]">{money(client.paid_total)}</dd></div>
              </dl>

              <p className="mt-4 text-xs text-[#829087]">Dernier rendez-vous : {new Date(client.last_appointment_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
              <div className="mt-4 flex gap-2">
                <Link to={`/artisan/messagerie/${client.username}`} className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#10271F] px-4 py-3 text-sm font-black text-white"><AppIcon name="chat" className="h-4 w-4" /> Message</Link>
                <Link to="/artisan/rdv" className="inline-flex items-center justify-center rounded-2xl border border-black/10 px-4 py-3 text-sm font-black text-[#435149]">Agenda</Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
