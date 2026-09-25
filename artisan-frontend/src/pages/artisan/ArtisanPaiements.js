import { useEffect, useState } from 'react';
import axios from '../../utils/axiosInstance';
import useAutoRefresh from '../../hooks/useAutoRefresh';

const METHODS = [
  ['cash', 'Espèces'],
  ['wave', 'Wave'],
  ['orange_money', 'Orange Money'],
  ['mtn_money', 'MTN Money'],
  ['moov_money', 'Moov Money'],
  ['bank_transfer', 'Virement bancaire'],
  ['other', 'Autre'],
];

function money(value) {
  return value == null
    ? 'Montant indisponible'
    : `${new Intl.NumberFormat('fr-FR').format(Number(value || 0))} FCFA`;
}

function apiError(error) {
  const data = error?.response?.data;
  if (data?.detail) return data.detail;
  if (data?.error) return data.error;
  const first = data && Object.values(data).flat()[0];
  return typeof first === 'string' ? first : 'Action impossible.';
}

export default function ArtisanPaiements() {
  const [rows, setRows] = useState([]);
  const [methods, setMethods] = useState({});
  const [notes, setNotes] = useState({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState(null);
  const [disputes, setDisputes] = useState([]);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [response, disputesResponse] = await Promise.all([
        axios.get('/payments/artisan-workspace/'),
        axios.get('/moderation/disputes/mine/'),
      ]);
      setRows(response.data || []);
      setDisputes(disputesResponse.data || []);
    } catch (error) {
      setMessage(`❌ ${apiError(error)}`);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  useAutoRefresh(() => load(true), { intervalMs: 15000 });


  const replyDispute = async (dispute) => {
    const body = window.prompt('Répondre au litige', '');
    if (!body) return;
    try {
      await axios.post(`/moderation/disputes/${dispute.id}/messages/`, { body });
      setMessage('✅ Réponse ajoutée au litige.');
      await load();
    } catch (error) {
      setMessage(`❌ ${apiError(error)}`);
    }
  };

  const declare = async (row, statut) => {
    if (statut === 'paid' && !methods[row.appointment_id]) {
      setMessage('❌ Sélectionnez le mode de règlement avant de déclarer le paiement comme reçu.');
      return;
    }

    const question = statut === 'paid'
      ? `Confirmer que vous avez reçu ${money(row.amount)} pour cette prestation ?`
      : 'Confirmer que vous n’avez pas encore reçu le règlement ?';
    if (!window.confirm(question)) return;

    setSubmittingId(row.appointment_id);
    try {
      await axios.post('/payments/declare/', {
        appointment_id: row.appointment_id,
        statut,
        methode_paiement: statut === 'paid' ? methods[row.appointment_id] : null,
        notes: notes[row.appointment_id] || '',
      });
      setMessage(statut === 'paid' ? '✅ Paiement déclaré reçu.' : '✅ Paiement déclaré non reçu.');
      await load();
    } catch (error) {
      setMessage(`❌ ${apiError(error)}`);
    } finally {
      setSubmittingId(null);
    }
  };

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
    <div className="mx-auto max-w-[1250px] p-4 pb-28 sm:p-6 lg:pb-8">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#0B6B50]">Suivi financier</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight">Règlements des prestations</h1>
      <p className="text-sm text-gray-500 mb-6">
        Aucun règlement n’est demandé avant la prestation. Une fois le service marqué comme terminé, vous seul pouvez indiquer si vous avez été payé ou non.
      </p>
      {message && <p className="mb-4 text-blue-700">{message}</p>}

      {loading ? <p>Chargement...</p> : rows.length === 0 ? (
        <p className="text-gray-500">Aucune prestation terminée à traiter.</p>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => {
            const payment = row.payment;
            const paid = payment?.statut === 'paid';
            const unpaid = payment?.statut === 'unpaid';
            const dispute = payment ? disputes.find((item) => Number(item.payment) === Number(payment.id) && !['resolved', 'closed'].includes(item.status)) : null;
            return (
              <article key={row.appointment_id} className="rounded-[26px] border border-black/5 bg-white p-5 shadow-[0_8px_26px_rgba(30,45,37,0.05)]">
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <p className="font-semibold">{row.client_username} · {row.service_titre}</p>
                    <p className="text-xs text-gray-500">Rendez-vous #{row.appointment_id}</p>
                    {row.quote_reference && <p className="text-xs text-gray-500">Devis : {row.quote_reference}</p>}
                  </div>
                  <strong className="text-lg">{money(row.amount)}</strong>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {paid ? (
                    <span className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">Payé</span>
                  ) : unpaid ? (
                    <span className="inline-block bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm">Non payé</span>
                  ) : (
                    <span className="inline-block bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">À déclarer</span>
                  )}
                  {dispute && <><span className="inline-block rounded-full bg-red-100 px-3 py-1 text-sm font-black text-red-700">Contesté · {dispute.status_label}</span><button onClick={() => replyDispute(dispute)} className="text-xs font-black text-[#3565A8] underline">Répondre au litige</button></>}
                </div>

                {row.can_declare && row.amount != null && (
                  <div className="mt-4 space-y-3 border-t pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <select
                        value={methods[row.appointment_id] || ''}
                        onChange={(e) => setMethods({ ...methods, [row.appointment_id]: e.target.value })}
                        className="border rounded p-2"
                      >
                        <option value="">-- Mode de règlement si payé --</option>
                        {METHODS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                      <input
                        type="text"
                        maxLength={255}
                        value={notes[row.appointment_id] || ''}
                        onChange={(e) => setNotes({ ...notes, [row.appointment_id]: e.target.value })}
                        placeholder="Note facultative"
                        className="border rounded p-2"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        disabled={submittingId === row.appointment_id}
                        onClick={() => declare(row, 'unpaid')}
                        className="border border-amber-300 text-amber-800 px-4 py-2 rounded disabled:opacity-50"
                      >
                        Non payé
                      </button>
                      <button
                        disabled={submittingId === row.appointment_id}
                        onClick={() => declare(row, 'paid')}
                        className="rounded-2xl bg-[#0B6B50] px-4 py-2 text-sm font-black text-white hover:bg-[#095C45] disabled:opacity-50"
                      >
                        Marquer comme payé
                      </button>
                    </div>
                  </div>
                )}

                {paid && (
                  <div className="mt-3 text-sm text-gray-600">
                    <p>Mode : {payment.methode_paiement_label || payment.methode_paiement}</p>
                    {payment.payment_reference && <p>Référence : {payment.payment_reference}</p>}
                    {payment.declared_at && <p>Déclaré le {new Date(payment.declared_at).toLocaleString('fr-FR')}</p>}
                    <button onClick={() => receipt(payment.id)} className="mt-2 text-blue-600 underline">Télécharger le reçu</button>
                  </div>
                )}

                {payment?.notes && <p className="mt-2 text-sm bg-gray-50 rounded p-2">{payment.notes}</p>}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
