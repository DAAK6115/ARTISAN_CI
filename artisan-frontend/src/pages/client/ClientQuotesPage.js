import { useEffect, useState } from 'react';
import axios from '../../utils/axiosInstance';

const STATUS = {
  sent: ['À valider', 'bg-amber-100 text-amber-800'],
  accepted: ['Accepté', 'bg-green-100 text-green-700'],
  rejected: ['Refusé', 'bg-red-100 text-red-700'],
  expired: ['Expiré', 'bg-gray-100 text-gray-700'],
  cancelled: ['Annulé', 'bg-gray-100 text-gray-700'],
};

function money(value) {
  return `${new Intl.NumberFormat('fr-FR').format(Number(value || 0))} FCFA`;
}

function errorMessage(error) {
  return error?.response?.data?.detail || error?.response?.data?.error || 'Action impossible.';
}

export default function ClientQuotesPage() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/payments/quotes/client/');
      setQuotes(response.data);
    } catch (error) {
      setMessage(`❌ ${errorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const decide = async (quote, action) => {
    if (!window.confirm(action === 'accept' ? 'Accepter ce devis ?' : 'Refuser ce devis ?')) return;
    try {
      await axios.post(`/payments/quotes/${quote.id}/${action}/`);
      setMessage(
        action === 'accept'
          ? '✅ Devis accepté. Aucun paiement n’est demandé avant la réalisation de la prestation.'
          : '✅ Devis refusé.'
      );
      await load();
    } catch (error) {
      setMessage(`❌ ${errorMessage(error)}`);
    }
  };

  return (
    <div className="p-2 md:p-6">
      <h1 className="text-2xl font-bold mb-2">📄 Mes devis</h1>
      <p className="text-sm text-gray-500 mb-6">
        Vérifiez les détails du devis avant de l’accepter. Le règlement se fait après la prestation ; l’artisan déclarera ensuite s’il a été payé ou non.
      </p>
      {message && <p className="mb-4 text-blue-700">{message}</p>}

      {loading ? <p>Chargement...</p> : quotes.length === 0 ? (
        <p className="text-gray-500">Aucun devis reçu pour le moment.</p>
      ) : (
        <div className="space-y-5">
          {quotes.map((quote) => {
            const [label, style] = STATUS[quote.status] || [quote.status, 'bg-gray-100 text-gray-700'];
            return (
              <article key={quote.id} className="bg-white border rounded-xl p-4 shadow-sm">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <h2 className="font-bold">{quote.reference} · {quote.service_titre}</h2>
                    <p className="text-sm text-gray-500">Artisan : {quote.artisan_username}</p>
                  </div>
                  <span className={`${style} px-2 py-1 rounded-full text-xs h-fit`}>{label}</span>
                </div>

                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-left border-b"><th className="py-2">Désignation</th><th>Qté</th><th>PU</th><th>Total</th></tr></thead>
                    <tbody>
                      {quote.lines.map((line) => (
                        <tr key={line.id} className="border-b last:border-0">
                          <td className="py-2">{line.description}</td>
                          <td>{line.quantity}</td>
                          <td>{money(line.unit_price)}</td>
                          <td>{money(line.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 text-sm space-y-1 text-right">
                  <p>Sous-total : {money(quote.subtotal)}</p>
                  {Number(quote.discount_amount) > 0 && <p>Réduction : -{money(quote.discount_amount)}</p>}
                  <p className="text-lg font-bold text-green-700">Total : {money(quote.total)}</p>
                </div>

                {quote.notes && <p className="mt-3 text-sm bg-gray-50 rounded p-3">{quote.notes}</p>}
                {quote.valid_until && <p className="mt-2 text-xs text-gray-500">Valable jusqu’au {new Date(quote.valid_until).toLocaleString('fr-FR')}</p>}

                {quote.status === 'sent' && !quote.is_expired && (
                  <div className="mt-4 flex gap-2 justify-end">
                    <button onClick={() => decide(quote, 'reject')} className="border border-red-300 text-red-700 px-4 py-2 rounded">Refuser</button>
                    <button onClick={() => decide(quote, 'accept')} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Accepter</button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
