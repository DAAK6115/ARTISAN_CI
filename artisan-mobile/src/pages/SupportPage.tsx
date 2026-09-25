import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Headphones, MessageSquarePlus, Send } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { MobileTopBar } from '../components/MobileTopBar';
import { createSupportTicket, getSupportTickets } from '../features/client/client.api';

export function SupportPage() {
  const queryClient = useQueryClient();
  const tickets = useQuery({ queryKey: ['support-tickets'], queryFn: getSupportTickets });
  const [object, setObject] = useState('');
  const [message, setMessage] = useState('');
  const create = useMutation({
    mutationFn: () => createSupportTicket({ objet: object.trim(), message: message.trim() }),
    onSuccess: async () => { setObject(''); setMessage(''); await queryClient.invalidateQueries({ queryKey: ['support-tickets'] }); }
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (object.trim().length < 3 || message.trim().length < 10 || create.isPending) return;
    create.mutate();
  }

  return (
    <div>
      <MobileTopBar />
      <section className="rounded-[30px] bg-[var(--artisan-ink)] p-5 text-white shadow-[var(--artisan-shadow-card)]"><div className="flex items-center gap-3"><span className="grid size-12 place-items-center rounded-2xl bg-white/10 text-[var(--artisan-gold)]"><Headphones size={22} /></span><div><p className="text-xl font-black">Support ARTISAN_CI</p><p className="mt-1 text-xs text-white/60">Expliquez précisément votre problème à l’équipe.</p></div></div></section>

      <form onSubmit={submit} className="mt-5 rounded-[30px] border border-black/5 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2"><MessageSquarePlus size={18} className="text-[var(--artisan-green)]" /><h1 className="font-black">Nouvelle demande</h1></div>
        <label className="mt-4 block"><span className="text-xs font-black text-[#45534C]">Objet</span><input value={object} onChange={(e) => setObject(e.target.value)} maxLength={200} placeholder="Ex. Problème avec un rendez-vous" className="mt-2 min-h-12 w-full rounded-2xl border border-[#DDE5E0] bg-[#F7F8F6] px-4 text-sm outline-none focus:ring-4 focus:ring-[#0B6B50]/10" /></label>
        <label className="mt-4 block"><span className="text-xs font-black text-[#45534C]">Description</span><textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} placeholder="Donnez les détails utiles…" className="mt-2 w-full resize-none rounded-2xl border border-[#DDE5E0] bg-[#F7F8F6] p-4 text-sm outline-none focus:ring-4 focus:ring-[#0B6B50]/10" /></label>
        {create.isError ? <div className="mt-3 rounded-2xl bg-[var(--artisan-danger-soft)] p-3 text-sm font-semibold text-[#A83228]">{create.error instanceof Error ? create.error.message : 'Envoi impossible.'}</div> : null}
        <button disabled={object.trim().length < 3 || message.trim().length < 10 || create.isPending} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--artisan-green)] text-sm font-black text-white disabled:opacity-50"><Send size={17} /> {create.isPending ? 'Envoi…' : 'Envoyer la demande'}</button>
      </form>

      <h2 className="mt-6 text-lg font-black">Mes demandes</h2>
      <div className="mt-3 space-y-3">
        {tickets.data?.map((ticket) => <article key={ticket.id} className="rounded-3xl border border-black/5 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="font-black">#{ticket.id} · {ticket.objet}</p><p className="mt-1 text-xs text-[var(--artisan-muted)]">{new Date(ticket.date_envoi).toLocaleDateString('fr-FR')}</p></div><span className="rounded-full bg-[#F4F6F4] px-2.5 py-1 text-[10px] font-black text-[#526159]">{ticket.statut_label}</span></div><p className="mt-3 text-sm leading-6 text-[#596760]">{ticket.message}</p>{ticket.admin_response ? <div className="mt-3 rounded-2xl bg-[var(--artisan-green-soft)] p-3"><p className="text-[10px] font-black uppercase tracking-wide text-[var(--artisan-green)]">Réponse du support</p><p className="mt-1 text-sm leading-6 text-[#45534C]">{ticket.admin_response}</p></div> : null}</article>)}
        {!tickets.isLoading && (tickets.data?.length ?? 0) === 0 ? <div className="rounded-3xl bg-white p-6 text-center text-sm text-[var(--artisan-muted)] shadow-sm">Vous n’avez aucune demande support.</div> : null}
      </div>
    </div>
  );
}
