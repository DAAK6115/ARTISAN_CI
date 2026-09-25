import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronDown, FileText, X } from 'lucide-react';
import { formatMoney } from '../components/ServiceCard';
import { MobileTopBar } from '../components/MobileTopBar';
import { acceptQuote, getClientQuotes, rejectQuote, type ClientQuoteItem } from '../features/client/client.api';

const labels: Record<ClientQuoteItem['status'], string> = {
  draft: 'Brouillon', sent: 'À valider', accepted: 'Accepté', rejected: 'Refusé', expired: 'Expiré', cancelled: 'Annulé'
};

function statusClass(status: ClientQuoteItem['status']) {
  if (status === 'accepted') return 'bg-[var(--artisan-green-soft)] text-[var(--artisan-green)]';
  if (status === 'sent') return 'bg-[var(--artisan-gold-soft)] text-[#8B6400]';
  if (status === 'rejected' || status === 'expired' || status === 'cancelled') return 'bg-[var(--artisan-danger-soft)] text-[#A83228]';
  return 'bg-[#F4F6F4] text-[#526159]';
}

export function ClientQuotesPage() {
  const queryClient = useQueryClient();
  const quotes = useQuery({ queryKey: ['client-quotes'], queryFn: getClientQuotes });
  const accept = useMutation({ mutationFn: acceptQuote, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['client-quotes'] }) });
  const reject = useMutation({ mutationFn: rejectQuote, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['client-quotes'] }) });

  return (
    <div>
      <MobileTopBar />
      <div className="flex items-end justify-between gap-3">
        <div><p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--artisan-green)]">Propositions</p><h1 className="mt-1 text-2xl font-black tracking-[-0.04em]">Mes devis</h1></div>
        <span className="grid size-11 place-items-center rounded-2xl bg-[var(--artisan-green-soft)] text-[var(--artisan-green)]"><FileText size={20} /></span>
      </div>

      {quotes.isLoading ? <div className="mt-5 h-40 animate-pulse rounded-3xl bg-white" /> : null}
      {!quotes.isLoading && (quotes.data?.length ?? 0) === 0 ? <div className="mt-5 rounded-3xl bg-white p-6 text-center text-sm text-[var(--artisan-muted)] shadow-sm">Aucun devis reçu.</div> : null}

      <div className="mt-5 space-y-4">
        {quotes.data?.map((quote) => (
          <article key={quote.id} className="rounded-[30px] border border-black/5 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><p className="truncate text-lg font-black">{quote.service_titre}</p><p className="mt-1 text-xs text-[var(--artisan-muted)]">{quote.reference} · {quote.artisan_username}</p></div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black ${statusClass(quote.status)}`}>{labels[quote.status]}</span>
            </div>
            <div className="mt-4 flex items-end justify-between rounded-2xl bg-[#F7F8F6] p-4">
              <div><p className="text-[10px] font-black uppercase tracking-wide text-[var(--artisan-muted)]">Total</p><p className="mt-1 text-xl font-black text-[var(--artisan-green)]">{formatMoney(quote.total)} FCFA</p></div>
              {Number(quote.discount_amount) > 0 ? <p className="text-xs font-bold text-[var(--artisan-orange)]">Réduction : {formatMoney(quote.discount_amount)} F</p> : null}
            </div>

            <details className="mt-3 rounded-2xl border border-black/5 bg-white p-3">
              <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-black">Détails du devis <ChevronDown size={17} /></summary>
              <div className="mt-3 space-y-2 border-t border-black/5 pt-3">
                {quote.lines.map((line) => <div key={line.id} className="flex justify-between gap-3 text-xs"><span className="min-w-0 text-[var(--artisan-muted)]">{line.description} × {Number(line.quantity)}</span><span className="shrink-0 font-black">{formatMoney(line.total)} F</span></div>)}
                {quote.notes ? <p className="mt-3 text-xs leading-5 text-[var(--artisan-muted)]">{quote.notes}</p> : null}
                {quote.valid_until ? <p className="text-[10px] font-bold text-[var(--artisan-muted)]">Valable jusqu’au {new Date(quote.valid_until).toLocaleDateString('fr-FR')}</p> : null}
              </div>
            </details>

            {quote.status === 'sent' && !quote.is_expired ? (
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => reject.mutate(quote.id)} disabled={reject.isPending || accept.isPending} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--artisan-danger-soft)] text-sm font-black text-[#A83228] disabled:opacity-50"><X size={17} /> Refuser</button>
                <button type="button" onClick={() => accept.mutate(quote.id)} disabled={reject.isPending || accept.isPending} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--artisan-green)] text-sm font-black text-white disabled:opacity-50"><Check size={17} /> Accepter</button>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
