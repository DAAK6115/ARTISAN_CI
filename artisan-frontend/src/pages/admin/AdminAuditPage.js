import { useEffect, useState } from 'react';
import axios from '../../utils/axiosInstance';

export default function AdminAuditPage() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => { axios.get('/moderation/admin/audit/').then((r) => setItems(r.data || [])).catch(() => setError('Impossible de charger le journal d’audit.')); }, []);
  return <div className="mx-auto max-w-[1300px] space-y-6 p-4 sm:p-6 lg:p-8"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-[#0B6B50]">Traçabilité</p><h1 className="mt-2 text-3xl font-black">Journal d’audit</h1><p className="mt-2 text-sm text-[#718078]">Les 200 dernières actions administratives sensibles.</p></div>{error && <p className="rounded-2xl bg-[#FFF0EE] p-3 text-sm font-semibold text-[#B23A31]">{error}</p>}<div className="grid gap-2">{items.map((item) => <article key={item.id} className="rounded-[22px] border border-black/5 bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-black">{item.action}</p><p className="mt-1 text-xs text-[#718078]">{item.actor_username || 'Système'} · {item.target_type}{item.target_id ? ` #${item.target_id}` : ''}</p></div><time className="text-xs font-semibold text-[#829087]">{new Date(item.created_at).toLocaleString('fr-FR')}</time></div>{item.metadata && Object.keys(item.metadata).length > 0 && <pre className="mt-3 overflow-x-auto rounded-xl bg-[#F7F8F6] p-3 text-xs text-[#526159]">{JSON.stringify(item.metadata, null, 2)}</pre>}</article>)}</div>{items.length === 0 && !error && <p className="rounded-2xl bg-white p-5 text-sm text-[#718078]">Aucune action auditée pour le moment.</p>}</div>;
}
