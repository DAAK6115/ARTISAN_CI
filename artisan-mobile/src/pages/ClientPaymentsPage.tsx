import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  ExternalLink,
  RefreshCw,
  ReceiptText,
  ShieldCheck,
  WalletCards
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ApiError } from '../api/http';
import { formatMoney } from '../components/ServiceCard';
import { MobileTopBar } from '../components/MobileTopBar';
import {
  getClientPaymentWorkspace,
  getClientPayments,
  initiateGeniusPayPayment,
  syncGeniusPayPayment,
  type ClientPaymentItem,
  type PaymentStatus
} from '../features/client/client.api';

const statusLabel: Record<PaymentStatus, string> = {
  unpaid: 'Non payé',
  pending: 'En attente',
  processing: 'Traitement',
  paid: 'Payé',
  failed: 'Échoué',
  cancelled: 'Annulé',
  expired: 'Expiré',
  refunded: 'Remboursé'
};

function statusClass(status: PaymentStatus): string {
  if (status === 'paid') return 'bg-[var(--artisan-green-soft)] text-[var(--artisan-green)]';
  if (status === 'pending' || status === 'processing') return 'bg-[var(--artisan-gold-soft)] text-[#8B6400]';
  if (status === 'refunded') return 'bg-[#EEF4FF] text-[#315E9B]';
  return 'bg-[var(--artisan-danger-soft)] text-[var(--artisan-danger)]';
}

function providerLabel(payment: ClientPaymentItem): string {
  if (payment.provider === 'geniuspay') {
    return payment.methode_paiement_label ? `GeniusPay · ${payment.methode_paiement_label}` : 'GeniusPay';
  }
  return payment.methode_paiement_label || 'Règlement manuel';
}

export function ClientPaymentsPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const workspace = useQuery({
    queryKey: ['client-payment-workspace'],
    queryFn: getClientPaymentWorkspace,
    refetchInterval: 10_000
  });
  const payments = useQuery({
    queryKey: ['client-payments'],
    queryFn: getClientPayments,
    refetchInterval: 10_000
  });

  const paidTotal = useMemo(
    () => (payments.data ?? [])
      .filter((item) => item.statut === 'paid')
      .reduce((sum, item) => sum + Number(item.montant || 0), 0),
    [payments.data]
  );

  const payableRows = useMemo(
    () => (workspace.data ?? []).filter((row) => row.appointment_status === 'termine'),
    [workspace.data]
  );

  const initiate = useMutation({
    mutationFn: initiateGeniusPayPayment,
    onMutate: () => {
      setError('');
      setMessage('');
    },
    onSuccess: (result) => {
      window.location.assign(result.checkout_url);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Impossible d’ouvrir GeniusPay. Réessayez.');
    }
  });

  const sync = useMutation({
    mutationFn: syncGeniusPayPayment,
    onSuccess: async (payment) => {
      setMessage(payment.statut === 'paid'
        ? 'Paiement confirmé. Merci !'
        : `Paiement vérifié : ${statusLabel[payment.statut]}.`);
      setError('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['client-payments'] }),
        queryClient.invalidateQueries({ queryKey: ['client-payment-workspace'] }),
        queryClient.invalidateQueries({ queryKey: ['client-appointments'] }),
        queryClient.invalidateQueries({ queryKey: ['notifications'] })
      ]);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Impossible de vérifier le paiement pour le moment.');
    }
  });

  useEffect(() => {
    const state = searchParams.get('geniuspay');
    const paymentId = Number(searchParams.get('payment_id') || 0);
    if (!state || !paymentId || sync.isPending) return;

    if (state === 'success') {
      sync.mutate(paymentId, {
        onSettled: () => {
          const next = new URLSearchParams(searchParams);
          next.delete('geniuspay');
          next.delete('payment_id');
          setSearchParams(next, { replace: true });
        }
      });
    } else if (state === 'error') {
      setError('Le paiement n’a pas été finalisé. Vous pouvez réessayer.');
      const next = new URLSearchParams(searchParams);
      next.delete('geniuspay');
      next.delete('payment_id');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams, sync]);

  return (
    <div>
      <MobileTopBar />

      <section className="rounded-[30px] bg-[var(--artisan-ink)] p-5 text-white shadow-[var(--artisan-shadow-card)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--artisan-gold)]">Paiements ARTISAN_CI</p>
            <h1 className="mt-2 text-2xl font-black tracking-[-0.04em]">{formatMoney(paidTotal)} FCFA</h1>
          </div>
          <span className="grid size-12 place-items-center rounded-2xl bg-white/10"><WalletCards size={22} /></span>
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-2xl bg-white/8 px-3 py-3 text-xs leading-5 text-white/75">
          <ShieldCheck size={17} className="mt-0.5 shrink-0 text-[var(--artisan-gold)]" />
          <p>Wave, Orange Money, MTN Money et Moov Money sont traités via le checkout sécurisé GeniusPay.</p>
        </div>
      </section>

      {message ? <p className="mt-4 rounded-2xl bg-[var(--artisan-green-soft)] px-3 py-2 text-xs font-bold text-[var(--artisan-green)]">{message}</p> : null}
      {error ? <p className="mt-4 rounded-2xl bg-[var(--artisan-danger-soft)] px-3 py-2 text-xs font-bold text-[var(--artisan-danger)]">{error}</p> : null}

      <section className="mt-6">
        <div className="flex items-end justify-between gap-3">
          <div><p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--artisan-green)]">À régler</p><h2 className="mt-1 text-lg font-black">Prestations terminées</h2></div>
          <button
            type="button"
            onClick={() => workspace.refetch()}
            className="grid size-10 place-items-center rounded-xl bg-white shadow-sm"
            aria-label="Actualiser"
          ><RefreshCw size={17} className={workspace.isFetching ? 'animate-spin' : ''} /></button>
        </div>

        {workspace.isLoading ? <div className="mt-4 h-32 animate-pulse rounded-3xl bg-white" /> : null}
        {!workspace.isLoading && payableRows.length === 0 ? (
          <div className="mt-4 rounded-3xl border border-dashed border-[#CDD8D2] bg-white/70 p-7 text-center">
            <CheckCircle2 size={25} className="mx-auto text-[var(--artisan-green)]" />
            <p className="mt-3 text-sm font-black">Aucun paiement à effectuer</p>
            <p className="mt-1 text-xs text-[var(--artisan-muted)]">Les prestations terminées apparaîtront ici.</p>
          </div>
        ) : null}

        <div className="mt-4 space-y-3">
          {payableRows.map((row) => {
            const payment = row.payment;
            const alreadyPaid = payment?.statut === 'paid';
            const inProgress = payment?.statut === 'pending' || payment?.statut === 'processing';
            return (
              <article key={row.appointment_id} className="rounded-3xl border border-black/5 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black">{row.service_titre}</p>
                    <p className="mt-1 truncate text-xs text-[var(--artisan-muted)]">avec {row.artisan_username} · RDV #{row.appointment_id}</p>
                  </div>
                  {payment ? <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black ${statusClass(payment.statut)}`}>{statusLabel[payment.statut]}</span> : null}
                </div>

                <div className="mt-4 rounded-2xl bg-[#F7F8F6] p-3">
                  <p className="text-[10px] font-black uppercase tracking-wide text-[#829087]">Montant à régler</p>
                  <p className="mt-1 text-xl font-black text-[var(--artisan-green)]">{row.amount == null ? 'Indisponible' : `${formatMoney(row.amount)} FCFA`}</p>
                  {row.quote_reference ? <p className="mt-1 text-[10px] font-semibold text-[var(--artisan-muted)]">Devis {row.quote_reference}</p> : null}
                </div>

                {row.error ? <p className="mt-3 flex gap-2 rounded-2xl bg-[var(--artisan-danger-soft)] px-3 py-2 text-xs text-[var(--artisan-danger)]"><AlertCircle size={15} className="shrink-0" /> {row.error}</p> : null}

                {alreadyPaid ? (
                  <div className="mt-4 flex items-center gap-2 rounded-2xl bg-[var(--artisan-green-soft)] px-3 py-3 text-xs font-black text-[var(--artisan-green)]"><CheckCircle2 size={17} /> Paiement confirmé</div>
                ) : row.can_pay ? (
                  <button
                    type="button"
                    onClick={() => initiate.mutate(row.appointment_id)}
                    disabled={initiate.isPending}
                    className="mt-4 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[var(--artisan-green)] px-4 text-sm font-black text-white shadow-sm disabled:opacity-60"
                  >
                    <ExternalLink size={18} />
                    {initiate.isPending ? 'Ouverture…' : inProgress ? 'Reprendre le paiement GeniusPay' : 'Payer avec GeniusPay'}
                  </button>
                ) : null}

                {payment?.provider === 'geniuspay' && payment.statut !== 'paid' && payment.id ? (
                  <button
                    type="button"
                    onClick={() => sync.mutate(payment.id)}
                    disabled={sync.isPending}
                    className="mt-2 min-h-11 w-full rounded-2xl border border-[#DDE5E0] bg-white px-4 text-xs font-black text-[var(--artisan-green)] disabled:opacity-50"
                  >{sync.isPending ? 'Vérification…' : 'Vérifier le statut du paiement'}</button>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      <section className="mt-7 pb-4">
        <h2 className="text-lg font-black">Historique</h2>
        {payments.isLoading ? <div className="mt-4 h-32 animate-pulse rounded-3xl bg-white" /> : null}
        {!payments.isLoading && (payments.data?.length ?? 0) === 0 ? <div className="mt-4 rounded-3xl bg-white p-6 text-center text-sm text-[var(--artisan-muted)] shadow-sm">Aucun règlement enregistré.</div> : null}
        <div className="mt-4 space-y-3">
          {payments.data?.map((payment) => (
            <article key={payment.id} className="rounded-3xl border border-black/5 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0"><p className="truncate font-black">{payment.service_titre}</p><p className="mt-1 truncate text-xs text-[var(--artisan-muted)]">{payment.artisan_username} · {payment.transaction_id}</p></div>
                <span className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black ${statusClass(payment.statut)}`}>
                  {payment.statut === 'paid' ? <CheckCircle2 size={12} /> : <Clock3 size={12} />}{statusLabel[payment.statut]}
                </span>
              </div>
              <div className="mt-4 flex items-end justify-between gap-3"><p className="text-xl font-black text-[var(--artisan-green)]">{formatMoney(payment.montant)} FCFA</p><p className="text-right text-xs font-bold text-[var(--artisan-muted)]">{providerLabel(payment)}</p></div>
              {payment.payment_reference ? <div className="mt-3 flex items-center gap-2 rounded-2xl bg-[#F7F8F6] px-3 py-2 text-xs text-[#526159]"><ReceiptText size={14} /> Réf. {payment.payment_reference}</div> : null}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
