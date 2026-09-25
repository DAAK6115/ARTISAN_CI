import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Clock3, ReceiptText, WalletCards } from 'lucide-react';
import { formatMoney } from '../components/ServiceCard';
import { MobileTopBar } from '../components/MobileTopBar';
import { getClientPayments } from '../features/client/client.api';

export function ClientPaymentsPage() {
  const payments = useQuery({ queryKey: ['client-payments'], queryFn: getClientPayments });
  const paidTotal = (payments.data ?? []).filter((item) => item.statut === 'paid').reduce((sum, item) => sum + Number(item.montant || 0), 0);

  return (
    <div>
      <MobileTopBar />
      <section className="rounded-[30px] bg-[var(--artisan-ink)] p-5 text-white shadow-[var(--artisan-shadow-card)]">
        <div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--artisan-gold)]">Règlements confirmés</p><h1 className="mt-2 text-2xl font-black tracking-[-0.04em]">{formatMoney(paidTotal)} FCFA</h1></div><span className="grid size-12 place-items-center rounded-2xl bg-white/10"><WalletCards size={22} /></span></div>
        <p className="mt-3 text-xs leading-5 text-white/60">ARTISAN_CI affiche les règlements déclarés par l’artisan après la prestation.</p>
      </section>

      <h2 className="mt-6 text-lg font-black">Historique</h2>
      {payments.isLoading ? <div className="mt-4 h-32 animate-pulse rounded-3xl bg-white" /> : null}
      {!payments.isLoading && (payments.data?.length ?? 0) === 0 ? <div className="mt-4 rounded-3xl bg-white p-6 text-center text-sm text-[var(--artisan-muted)] shadow-sm">Aucun règlement enregistré.</div> : null}
      <div className="mt-4 space-y-3">
        {payments.data?.map((payment) => (
          <article key={payment.id} className="rounded-3xl border border-black/5 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><p className="truncate font-black">{payment.service_titre}</p><p className="mt-1 truncate text-xs text-[var(--artisan-muted)]">{payment.artisan_username} · {payment.transaction_id}</p></div>
              <span className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black ${payment.statut === 'paid' ? 'bg-[var(--artisan-green-soft)] text-[var(--artisan-green)]' : 'bg-[var(--artisan-gold-soft)] text-[#8B6400]'}`}>{payment.statut === 'paid' ? <CheckCircle2 size={12} /> : <Clock3 size={12} />}{payment.statut === 'paid' ? 'Payé' : 'Non payé'}</span>
            </div>
            <div className="mt-4 flex items-end justify-between gap-3"><p className="text-xl font-black text-[var(--artisan-green)]">{formatMoney(payment.montant)} FCFA</p><p className="text-right text-xs font-bold text-[var(--artisan-muted)]">{payment.methode_paiement_label || 'Méthode non renseignée'}</p></div>
            {payment.payment_reference ? <div className="mt-3 flex items-center gap-2 rounded-2xl bg-[#F7F8F6] px-3 py-2 text-xs text-[#526159]"><ReceiptText size={14} /> Réf. {payment.payment_reference}</div> : null}
          </article>
        ))}
      </div>
    </div>
  );
}
