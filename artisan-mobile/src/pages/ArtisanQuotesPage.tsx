import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Plus, Send, Trash2 } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { ApiError } from '../api/http';
import { MobileTopBar } from '../components/MobileTopBar';
import { getArtisanAppointments } from '../features/artisan/artisan.api';
import { createArtisanQuote, deleteArtisanQuote, getArtisanQuotes, sendArtisanQuote, type QuoteLineInput } from '../features/artisan/professional.api';

const statusLabel: Record<string, string> = {
  draft: 'Brouillon', sent: 'Envoyé', accepted: 'Accepté', rejected: 'Refusé', expired: 'Expiré', cancelled: 'Annulé'
};

const money = (value: string | number) => `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(value) || 0)} FCFA`;

export function ArtisanQuotesPage() {
  const queryClient = useQueryClient();
  const quotes = useQuery({ queryKey: ['artisan-quotes'], queryFn: getArtisanQuotes });
  const appointments = useQuery({ queryKey: ['artisan-appointments'], queryFn: getArtisanAppointments });
  const [open, setOpen] = useState(false);
  const [appointmentId, setAppointmentId] = useState('');
  const [notes, setNotes] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [discount, setDiscount] = useState('0');
  const [lines, setLines] = useState<QuoteLineInput[]>([{ description: '', quantity: '1', unit_price: '' }]);
  const [error, setError] = useState('');

  const eligibleAppointments = useMemo(
    () => (appointments.data ?? []).filter((item) => ['en_attente', 'accepte'].includes(item.statut)),
    [appointments.data]
  );

  const create = useMutation({
    mutationFn: () => createArtisanQuote({
      appointment: Number(appointmentId), notes: notes.trim(), valid_until: validUntil ? new Date(validUntil).toISOString() : null,
      discount_amount: discount || '0', lines: lines.map((line, index) => ({ ...line, position: index }))
    }),
    onSuccess: async () => {
      setOpen(false); setAppointmentId(''); setNotes(''); setValidUntil(''); setDiscount('0'); setLines([{ description: '', quantity: '1', unit_price: '' }]); setError('');
      await queryClient.invalidateQueries({ queryKey: ['artisan-quotes'] });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Impossible de créer le devis.')
  });

  const send = useMutation({
    mutationFn: sendArtisanQuote,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['artisan-quotes'] });
      await queryClient.invalidateQueries({ queryKey: ['artisan-appointments'] });
    }
  });
  const remove = useMutation({ mutationFn: deleteArtisanQuote, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['artisan-quotes'] }) });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    if (!appointmentId) { setError('Choisissez un rendez-vous.'); return; }
    if (!lines.length || lines.some((line) => !line.description.trim() || Number(line.quantity) <= 0 || Number(line.unit_price) < 0 || !line.unit_price)) {
      setError('Complétez correctement toutes les lignes du devis.'); return;
    }
    create.mutate();
  }

  return (
    <div>
      <MobileTopBar />
      <section className="flex items-end justify-between gap-4">
        <div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--artisan-green)]">Commercial</p><h1 className="mt-1.5 text-[28px] font-black tracking-[-0.045em]">Devis</h1><p className="mt-1 text-sm text-[var(--artisan-muted)]">Créez et envoyez vos propositions au client.</p></div>
        <button type="button" onClick={() => setOpen(true)} className="flex min-h-11 items-center gap-2 rounded-2xl bg-[var(--artisan-green)] px-3 text-xs font-black text-white"><Plus size={16} /> Nouveau</button>
      </section>

      <section className="mt-5 space-y-3">
        {quotes.isPending ? [1,2].map((id) => <div key={id} className="h-32 animate-pulse rounded-3xl bg-white" />) : null}
        {quotes.data?.map((quote) => (
          <article key={quote.id} className="rounded-3xl border border-black/5 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-black">{quote.service_titre}</p><p className="mt-1 text-xs text-[var(--artisan-muted)]">{quote.client_username} · {quote.reference}</p></div><span className="rounded-full bg-[#F4F6F4] px-2.5 py-1 text-[10px] font-black text-[#526159]">{statusLabel[quote.status] ?? quote.status}</span></div>
            <div className="mt-4 flex items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-wide text-[#829087]">Total</p><p className="mt-1 text-lg font-black text-[var(--artisan-green)]">{money(quote.total)}</p></div><p className="text-[10px] font-semibold text-[var(--artisan-muted)]">{quote.lines.length} ligne{quote.lines.length > 1 ? 's' : ''}</p></div>
            {quote.status === 'draft' ? <div className="mt-4 grid grid-cols-[1fr_auto] gap-2"><button type="button" onClick={() => send.mutate(quote.id)} disabled={send.isPending} className="flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[var(--artisan-green)] px-4 text-xs font-black text-white disabled:opacity-50"><Send size={15} /> Envoyer au client</button><button type="button" onClick={() => remove.mutate(quote.id)} className="grid size-11 place-items-center rounded-2xl bg-[var(--artisan-danger-soft)] text-[#A83228]" aria-label="Supprimer"><Trash2 size={16} /></button></div> : null}
          </article>
        ))}
        {!quotes.isPending && !quotes.data?.length ? <div className="rounded-3xl border border-dashed border-[#CDD8D2] bg-white/70 p-7 text-center"><FileText size={24} className="mx-auto text-[var(--artisan-green)]" /><p className="mt-3 text-sm font-black">Aucun devis</p><p className="mt-1 text-xs text-[var(--artisan-muted)]">Créez un devis pour une demande en attente ou acceptée.</p></div> : null}
      </section>

      {open ? <div className="fixed inset-0 z-[80] bg-black/45 backdrop-blur-[2px]"><button className="absolute inset-0" onClick={() => setOpen(false)} aria-label="Fermer" /><form onSubmit={submit} className="absolute inset-x-3 bottom-3 grid max-h-[calc(100dvh-24px)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <div className="border-b border-black/5 px-5 py-4"><p className="text-lg font-black">Nouveau devis</p><p className="mt-1 text-xs text-[var(--artisan-muted)]">Le client ne paie rien avant la prestation.</p></div>
        <div className="overflow-y-auto px-5 py-4">
          <label className="block"><span className="text-xs font-black">Rendez-vous *</span><select value={appointmentId} onChange={(e) => setAppointmentId(e.target.value)} className="mt-2 min-h-12 w-full rounded-2xl border border-[#D9E1DD] bg-white px-4 text-sm font-bold outline-none"><option value="">Choisir…</option>{eligibleAppointments.map((item) => <option key={item.id} value={item.id}>{item.service_titre} · {item.client_nom}</option>)}</select></label>
          <div className="mt-5 space-y-3"><div className="flex items-center justify-between"><p className="text-xs font-black">Lignes du devis</p><button type="button" onClick={() => setLines((current) => [...current, { description: '', quantity: '1', unit_price: '' }])} className="text-xs font-black text-[var(--artisan-green)]">+ Ajouter</button></div>{lines.map((line, index) => <div key={index} className="rounded-2xl bg-[#F7F8F6] p-3"><input value={line.description} onChange={(e) => setLines((current) => current.map((item, i) => i === index ? { ...item, description: e.target.value } : item))} placeholder="Description" className="min-h-11 w-full rounded-xl border border-[#D9E1DD] bg-white px-3 text-sm font-semibold outline-none" /><div className="mt-2 grid grid-cols-2 gap-2"><input type="number" min="0.01" step="0.01" value={line.quantity} onChange={(e) => setLines((current) => current.map((item, i) => i === index ? { ...item, quantity: e.target.value } : item))} placeholder="Quantité" className="min-h-11 rounded-xl border border-[#D9E1DD] bg-white px-3 text-sm font-semibold outline-none" /><input type="number" min="0" step="1" value={line.unit_price} onChange={(e) => setLines((current) => current.map((item, i) => i === index ? { ...item, unit_price: e.target.value } : item))} placeholder="Prix FCFA" className="min-h-11 rounded-xl border border-[#D9E1DD] bg-white px-3 text-sm font-semibold outline-none" /></div>{lines.length > 1 ? <button type="button" onClick={() => setLines((current) => current.filter((_, i) => i !== index))} className="mt-2 text-[10px] font-black text-[#A83228]">Supprimer la ligne</button> : null}</div>)}</div>
          <div className="mt-4 grid grid-cols-2 gap-3"><label><span className="text-xs font-black">Réduction</span><input type="number" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)} className="mt-2 min-h-11 w-full rounded-2xl border border-[#D9E1DD] px-3 text-sm font-semibold outline-none" /></label><label><span className="text-xs font-black">Valide jusqu’au</span><input type="datetime-local" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="mt-2 min-h-11 w-full rounded-2xl border border-[#D9E1DD] px-3 text-xs font-semibold outline-none" /></label></div>
          <label className="mt-4 block"><span className="text-xs font-black">Notes</span><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="mt-2 w-full resize-none rounded-2xl border border-[#D9E1DD] px-4 py-3 text-sm outline-none" /></label>
          {error ? <p className="mt-4 rounded-2xl bg-[var(--artisan-danger-soft)] px-3 py-2 text-xs font-semibold text-[#A83228]">{error}</p> : null}
        </div>
        <div className="border-t border-black/5 bg-white p-4" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}><button type="submit" disabled={create.isPending} className="min-h-[52px] w-full rounded-2xl bg-[var(--artisan-green)] text-sm font-black text-white disabled:opacity-50">{create.isPending ? 'Création…' : 'Créer le devis'}</button></div>
      </form></div> : null}
    </div>
  );
}
