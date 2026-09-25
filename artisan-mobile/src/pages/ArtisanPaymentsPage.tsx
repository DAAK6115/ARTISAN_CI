import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, CircleDollarSign, Clock3, WalletCards } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ApiError } from '../api/http';
import { MobileTopBar } from '../components/MobileTopBar';
import { declarePayment, getArtisanPayments, getPaymentWorkspace, type PaymentWorkspaceRow } from '../features/artisan/professional.api';

const money = (value: string | number) => `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(value) || 0)} FCFA`;

const paymentMethods = [
  ['wave', 'Wave'], ['orange_money', 'Orange Money'], ['moov_money', 'Moov Money'], ['mtn_money', 'MTN Money'], ['cash', 'Espèces'], ['bank_transfer', 'Virement bancaire'], ['other', 'Autre']
] as const;

export function ArtisanPaymentsPage() {
  const queryClient = useQueryClient();
  const workspace = useQuery({ queryKey: ['artisan-payment-workspace'], queryFn: getPaymentWorkspace });
  const payments = useQuery({ queryKey: ['artisan-payments'], queryFn: getArtisanPayments });
  const [tab, setTab] = useState<'a_declarer' | 'historique'>('a_declarer');
  const [selected, setSelected] = useState<PaymentWorkspaceRow | null>(null);
  const [status, setStatus] = useState<'paid' | 'unpaid'>('paid');
  const [method, setMethod] = useState('wave');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const pendingRows = useMemo(() => (workspace.data ?? []).filter((row) => row.can_declare), [workspace.data]);
  const paidTotal = useMemo(() => (payments.data ?? []).filter((item) => item.statut === 'paid').reduce((sum, item) => sum + Number(item.montant || 0), 0), [payments.data]);

  const declare = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error('Aucun rendez-vous sélectionné.');
      return declarePayment({
        appointment_id: selected.appointment_id,
        statut: status,
        methode_paiement: status === 'paid' ? method : null,
        payment_reference: status === 'paid' ? reference.trim() : '',
        notes: notes.trim()
      });
    },
    onSuccess: async () => {
      setSelected(null); setReference(''); setNotes(''); setStatus('paid'); setMethod('wave'); setError('');
      await queryClient.invalidateQueries({ queryKey: ['artisan-payment-workspace'] });
      await queryClient.invalidateQueries({ queryKey: ['artisan-payments'] });
      await queryClient.invalidateQueries({ queryKey: ['artisan-dashboard'] });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Déclaration impossible.')
  });

  return (
    <div>
      <MobileTopBar />
      <section>
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--artisan-green)]">Suivi financier</p>
        <h1 className="mt-1.5 text-[28px] font-black tracking-[-0.045em]">Règlements</h1>
        <p className="mt-1 text-sm text-[var(--artisan-muted)]">Déclarez uniquement les règlements réellement reçus après la prestation.</p>
      </section>

      <section className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-3xl bg-[var(--artisan-green)] p-4 text-white shadow-[0_18px_45px_rgba(11,107,80,0.18)]"><CircleDollarSign size={20} /><p className="mt-5 text-xl font-black">{money(paidTotal)}</p><p className="mt-1 text-xs font-semibold text-white/70">Total déclaré payé</p></div>
        <div className="rounded-3xl border border-black/5 bg-white p-4 shadow-sm"><Clock3 size={20} className="text-[var(--artisan-orange)]" /><p className="mt-5 text-xl font-black">{pendingRows.length}</p><p className="mt-1 text-xs font-semibold text-[var(--artisan-muted)]">À déclarer</p></div>
      </section>

      <div className="mt-5 grid grid-cols-2 rounded-2xl bg-[#EEF1EF] p-1">
        <button type="button" onClick={() => setTab('a_declarer')} className={`rounded-[14px] px-3 py-2.5 text-xs font-black ${tab === 'a_declarer' ? 'bg-white text-[var(--artisan-green)] shadow-sm' : 'text-[var(--artisan-muted)]'}`}>À déclarer</button>
        <button type="button" onClick={() => setTab('historique')} className={`rounded-[14px] px-3 py-2.5 text-xs font-black ${tab === 'historique' ? 'bg-white text-[var(--artisan-green)] shadow-sm' : 'text-[var(--artisan-muted)]'}`}>Historique</button>
      </div>

      {tab === 'a_declarer' ? (
        <section className="mt-4 space-y-3">
          {workspace.isPending ? [1,2].map((id) => <div key={id} className="h-28 animate-pulse rounded-3xl bg-white" />) : null}
          {pendingRows.map((row) => <article key={row.appointment_id} className="rounded-3xl border border-black/5 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-black">{row.service_titre}</p><p className="mt-1 text-xs text-[var(--artisan-muted)]">{row.client_username} · {new Date(row.date_rdv).toLocaleDateString('fr-CI')}</p></div><p className="shrink-0 text-sm font-black text-[var(--artisan-green)]">{money(row.amount)}</p></div>{row.quote_reference ? <p className="mt-2 text-[10px] font-semibold text-[#829087]">Devis {row.quote_reference}</p> : null}<button type="button" onClick={() => setSelected(row)} className="mt-4 min-h-11 w-full rounded-2xl bg-[var(--artisan-green)] px-4 text-xs font-black text-white">Déclarer le règlement</button></article>)}
          {!workspace.isPending && pendingRows.length === 0 ? <div className="rounded-3xl border border-dashed border-[#CDD8D2] bg-white/70 p-7 text-center"><WalletCards size={24} className="mx-auto text-[var(--artisan-green)]" /><p className="mt-3 text-sm font-black">Rien à déclarer</p><p className="mt-1 text-xs text-[var(--artisan-muted)]">Les prestations terminées apparaîtront ici.</p></div> : null}
        </section>
      ) : (
        <section className="mt-4 space-y-3">
          {payments.data?.map((payment) => <article key={payment.id} className="rounded-3xl border border-black/5 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-black">{payment.service_titre}</p><p className="mt-1 text-xs text-[var(--artisan-muted)]">{payment.client}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${payment.statut === 'paid' ? 'bg-[var(--artisan-green-soft)] text-[var(--artisan-green)]' : 'bg-[var(--artisan-gold-soft)] text-[#8A6500]'}`}>{payment.statut === 'paid' ? 'Payé' : 'Non payé'}</span></div><p className="mt-4 text-lg font-black text-[var(--artisan-ink)]">{money(payment.montant)}</p><p className="mt-1 text-[10px] font-semibold text-[#829087]">{payment.methode_paiement_label || 'Aucune méthode'}{payment.payment_reference ? ` · ${payment.payment_reference}` : ''}</p></article>)}
        </section>
      )}

      {selected ? <div className="fixed inset-0 z-[80] bg-black/45 backdrop-blur-[2px]"><button className="absolute inset-0" onClick={() => setSelected(null)} aria-label="Fermer" /><div className="absolute inset-x-3 bottom-3 grid max-h-[calc(100dvh-24px)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <div className="border-b border-black/5 px-5 py-4"><p className="text-lg font-black">Déclarer le règlement</p><p className="mt-1 text-xs text-[var(--artisan-muted)]">{selected.service_titre} · {selected.client_username}</p></div>
        <div className="overflow-y-auto px-5 py-4">
          <div className="rounded-2xl bg-[#F7F8F6] p-4"><p className="text-[10px] font-black uppercase tracking-wide text-[#829087]">Montant attendu</p><p className="mt-1 text-xl font-black text-[var(--artisan-green)]">{money(selected.amount)}</p></div>
          <div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={() => setStatus('paid')} className={`min-h-12 rounded-2xl text-xs font-black ${status === 'paid' ? 'bg-[var(--artisan-green)] text-white' : 'bg-[#F4F6F4] text-[var(--artisan-muted)]'}`}>Payé</button><button type="button" onClick={() => setStatus('unpaid')} className={`min-h-12 rounded-2xl text-xs font-black ${status === 'unpaid' ? 'bg-[var(--artisan-gold)] text-[#4B3900]' : 'bg-[#F4F6F4] text-[var(--artisan-muted)]'}`}>Non payé</button></div>
          {status === 'paid' ? <><label className="mt-4 block"><span className="text-xs font-black">Méthode *</span><select value={method} onChange={(e) => setMethod(e.target.value)} className="mt-2 min-h-12 w-full rounded-2xl border border-[#D9E1DD] bg-white px-4 text-sm font-bold outline-none">{paymentMethods.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="mt-4 block"><span className="text-xs font-black">Référence</span><input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Optionnel" className="mt-2 min-h-12 w-full rounded-2xl border border-[#D9E1DD] px-4 text-sm font-semibold outline-none" /></label></> : null}
          <label className="mt-4 block"><span className="text-xs font-black">Note</span><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="mt-2 w-full resize-none rounded-2xl border border-[#D9E1DD] px-4 py-3 text-sm outline-none" /></label>
          {error ? <p className="mt-4 rounded-2xl bg-[var(--artisan-danger-soft)] px-3 py-2 text-xs font-semibold text-[#A83228]">{error}</p> : null}
        </div>
        <div className="border-t border-black/5 bg-white p-4" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}><button type="button" onClick={() => declare.mutate()} disabled={declare.isPending} className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[var(--artisan-green)] text-sm font-black text-white disabled:opacity-50"><CheckCircle2 size={18} /> {declare.isPending ? 'Enregistrement…' : 'Valider la déclaration'}</button></div>
      </div></div> : null}
    </div>
  );
}
