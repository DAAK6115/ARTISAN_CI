import { useEffect, useState } from 'react';
import axios from '../../utils/axiosInstance';

const STATUS = {
  unpaid: ['Non payé', 'bg-amber-100 text-amber-800'],
  paid: ['Payé', 'bg-green-100 text-green-800'],
};

function money(value) {
  return `${new Intl.NumberFormat('fr-FR').format(Number(value || 0))} FCFA`;
}

function apiError(error) {
  const data = error?.response?.data;
  if (data?.detail) return data.detail;
  if (data?.error) return data.error;
  const first = data && Object.values(data).flat()[0];
  return typeof first === 'string' ? first : 'Action impossible.';
}

export default function PaiementsPage() {
  const [payments, setPayments] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/payments/mes/');
      setPayments(response.data);
    } catch (error) {
      setMessage(`❌ ${apiError(error)}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const receipt = async (id) => {
    try {
      const response = await axios.get(`/payments/${id}/receipt/`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `recu-${id}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setMessage(`❌ ${apiError(error)}`);
    }
  };

  return (
    <div className="p-2 md:p-6">
      <h1 className="text-2xl font-bold mb-2">💳 Paiements</h1>
      <p className="text-sm text-gray-500 mb-5">
        ARTISAN_CI ne vous demande aucun paiement avant la prestation. Après réalisation du service, l’artisan indique uniquement s’il a reçu ou non le règlement.
      </p>
      {message && <p className="mb-4 text-blue-700">{message}</p>}

      {loading ? <p>Chargement...</p> : payments.length === 0 ? (
        <p className="text-gray-500">Aucun règlement déclaré par un artisan pour le moment.</p>
      ) : (
        <div className="space-y-3">
          {payments.map((payment) => {
            const [label, style] = STATUS[payment.statut] || [payment.statut, 'bg-gray-100 text-gray-700'];
            return (
              <article key={payment.id} className="bg-white border rounded-xl p-4">
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <p className="font-semibold">{payment.service_titre}</p>
                    <p className="text-sm text-gray-500">Artisan : {payment.artisan_username}</p>
                    {payment.quote_reference && <p className="text-xs text-gray-500">Devis : {payment.quote_reference}</p>}
                  </div>
                  <span className={`${style} px-3 py-1 rounded-full text-xs h-fit`}>{label}</span>
                </div>

                <p className="mt-3 text-xl font-bold">{money(payment.montant)}</p>
                {payment.statut === 'paid' && (
                  <>
                    <p className="text-sm text-gray-600">Mode : {payment.methode_paiement_label || payment.methode_paiement}</p>
                    <p className="text-xs text-gray-500">
                      Déclaré par {payment.declared_by_username || payment.artisan_username}
                      {payment.declared_at ? ` le ${new Date(payment.declared_at).toLocaleString('fr-FR')}` : ''}
                    </p>
                    <button onClick={() => receipt(payment.id)} className="mt-3 text-blue-600 underline text-sm">
                      Télécharger le reçu
                    </button>
                  </>
                )}
                {payment.statut === 'unpaid' && (
                  <p className="mt-2 text-sm text-amber-700">L’artisan indique ne pas avoir encore reçu ce règlement.</p>
                )}
                {payment.notes && <p className="mt-2 text-sm bg-gray-50 rounded p-2">{payment.notes}</p>}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
