import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Clock3, CreditCard, ShieldCheck, WalletCards } from 'lucide-react';
import { useMemo } from 'react';
import { MobileTopBar } from '../components/MobileTopBar';
import { getArtisanPayments, getPaymentWorkspace, type PaymentRecord } from '../features/artisan/professional.api';

const money = (value: string | number | null | undefined) =>
  `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(value) || 0)} FCFA`;

function statusLabel(status: PaymentRecord['statut']): string {
  return ({
    unpaid: 'Non payé', pending: 'En attente', processing: 'Traitement', paid: 'Payé',
    failed: 'Échoué', cancelled: 'Annulé', expired: 'Expiré', refunded: 'Remboursé'
  } as Record<PaymentRecord['statut'], string>)[status];
}

function statusClass(status: PaymentRecord['statut']): string {
  if (status === 'paid') return 'bg-[var(--artisan-green-soft)] text-[var(--artisan-green)]';
  if (status === 'pending' || status === 'processing' || status === 'unpaid') return 'bg-[var(--artisan-gold-soft)] text-[#8A6500]';
  if (status === 'refunded') return 'bg-[#EEF4FF] text-[#315E9B]';
  return 'bg-[var(--artisan-danger-soft)] text-[var(--artisan-danger)]';
}

export function ArtisanPaymentsPage() {
  const workspace = useQuery({ queryKey: ['artisan-payment-workspace'], queryFn: getPaymentWorkspace, refetchInterval: 10_000 });
  const payments = useQuery({ queryKey: ['artisan-payments'], queryFn: getArtisanPayments, refetchInterval: 10_000 });

  const paidTotal = useMemo(
    () => (payments.data ?? []).filter((item) => item.statut === 'paid').reduce((sum, item) => sum + Number(item.montant || 0), 0),
    [payments.data]
  );
  const awaiting = useMemo(
    () => (workspace.data ?? []).filter((row) => row.appointment_status === 'termine' && row.payment?.statut !== 'paid'),
    [workspace.data]
  );

  return (
    <div>
      <MobileTopBar />
      <section>
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--artisan-green)]">Suivi financier</p>
        <h1 className="mt-1.5 text-[28px] font-black tracking-[-0.045em]">Règlements</h1>
        <p className="mt-1 text-sm text-[var(--artisan-muted)]">Les Mobile Money sont confirmés automatiquement par GeniusPay. Vous n’avez plus à les déclarer manuellement.</p>
      </section>

      <section className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-3xl bg-[var(--artisan-green)] p-4 text-white shadow-[0_18px_45px_rgba(11,107,80,0.18)]"><WalletCards size={20} /><p className="mt-5 text-xl font-black">{money(paidTotal)}</p><p className="mt-1 text-xs font-semibold text-white/70">Confirmé reçu</p></div>
        <div className="rounded-3xl border border-black/5 bg-white p-4 shadow-sm"><Clock3 size={20} className="text-[var(--artisan-orange)]" /><p className="mt-5 text-xl font-black">{awaiting.length}</p><p className="mt-1 text-xs font-semibold text-[var(--artisan-muted)]">En attente client</p></div>
      </section>

      <section className="mt-5 rounded-3xl border border-black/5 bg-white p-4 shadow-sm">
        <div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[var(--artisan-green-soft)] text-[var(--artisan-green)]"><ShieldCheck size={19} /></span><div><p className="text-sm font-black">Paiement sécurisé</p><p className="mt-1 text-xs leading-5 text-[var(--artisan-muted)]">Wave, Orange Money, MTN Money et Moov Money passent par GeniusPay. Le statut affiché ici vient du fournisseur de paiement.</p></div></div>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-black">En attente de règlement</h2>
        <div className="mt-3 space-y-3">
          {awaiting.map((row) => (
            <article key={row.appointment_id} className="rounded-3xl border border-black/5 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-black">{row.service_titre}</p><p className="mt-1 text-xs text-[var(--artisan-muted)]">{row.client_username} · RDV #{row.appointment_id}</p></div><p className="shrink-0 text-sm font-black text-[var(--artisan-green)]">{money(row.amount)}</p></div>
              <div className="mt-3 flex items-center gap-2 rounded-2xl bg-[#F7F8F6] px-3 py-2 text-xs text-[var(--artisan-muted)]"><Clock3 size={14} /> {row.payment ? `GeniusPay : ${statusLabel(row.payment.statut)}` : 'Le client peut maintenant payer depuis son application.'}</div>
            </article>
          ))}
          {!workspace.isPending && awaiting.length === 0 ? <div className="rounded-3xl border border-dashed border-[#CDD8D2] bg-white/70 p-7 text-center"><CheckCircle2 size={24} className="mx-auto text-[var(--artisan-green)]" /><p className="mt-3 text-sm font-black">Aucun règlement en attente</p></div> : null}
        </div>
      </section>

      <section className="mt-7 pb-4">
        <h2 className="text-lg font-black">Historique</h2>
        <div className="mt-3 space-y-3">
          {payments.data?.map((payment) => (
            <article key={payment.id} className="rounded-3xl border border-black/5 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-black">{payment.service_titre}</p><p className="mt-1 text-xs text-[var(--artisan-muted)]">{payment.client}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${statusClass(payment.statut)}`}>{statusLabel(payment.statut)}</span></div>
              <div className="mt-4 flex items-end justify-between gap-3"><p className="text-lg font-black">{money(payment.montant)}</p><p className="text-right text-[10px] font-semibold text-[var(--artisan-muted)]">{payment.provider === 'geniuspay' ? 'GeniusPay' : 'Manuel'}{payment.methode_paiement_label ? ` · ${payment.methode_paiement_label}` : ''}</p></div>
              {payment.payment_reference ? <div className="mt-3 flex items-center gap-2 rounded-2xl bg-[#F7F8F6] px-3 py-2 text-[10px] text-[#526159]"><CreditCard size={13} /> Réf. {payment.payment_reference}</div> : null}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
