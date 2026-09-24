import { useEffect, useState } from 'react';
import axios from '../../utils/axiosInstance';

const emptyLine = () => ({ description: '', quantity: 1, unit_price: '' });

function money(value) {
  return `${new Intl.NumberFormat('fr-FR').format(Number(value || 0))} FCFA`;
}

function apiMessage(error) {
  const data = error?.response?.data;
  if (data?.detail) return data.detail;
  if (data?.error) return data.error;
  const first = data && Object.values(data).flat()[0];
  return typeof first === 'string' ? first : 'Action impossible.';
}

export default function ArtisanQuotesPage() {
  const [quotes, setQuotes] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [lines, setLines] = useState([emptyLine()]);
  const [form, setForm] = useState({ appointment: '', discount_amount: 0, valid_until: '', notes: '' });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [q, a] = await Promise.all([
        axios.get('/payments/quotes/artisan/'),
        axios.get('/appointments/mes-rendezvous-artisan/'),
      ]);
      setQuotes(q.data);
      setAppointments(a.data.filter((item) => ['en_attente', 'accepte'].includes(item.statut)));
    } catch (error) {
      setMessage(`❌ ${apiMessage(error)}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const updateLine = (index, field, value) => {
    setLines((previous) => previous.map((line, i) => i === index ? { ...line, [field]: value } : line));
  };

  const removeLine = (index) => {
    setLines((previous) => previous.length === 1 ? previous : previous.filter((_, i) => i !== index));
  };

  const createAndSend = async (event) => {
    event.preventDefault();
    try {
      const payload = {
        ...form,
        appointment: Number(form.appointment),
        discount_amount: String(form.discount_amount || 0),
        valid_until: form.valid_until || null,
        lines: lines.map((line, index) => ({
          description: line.description.trim(),
          quantity: String(line.quantity),
          unit_price: String(line.unit_price),
          position: index,
        })),
      };
      const created = await axios.post('/payments/quotes/artisan/', payload);
      await axios.post(`/payments/quotes/${created.data.id}/send/`);
      setForm({ appointment: '', discount_amount: 0, valid_until: '', notes: '' });
      setLines([emptyLine()]);
      setMessage('✅ Devis créé et envoyé. Aucun paiement n’est demandé avant la prestation.');
      await load();
    } catch (error) {
      setMessage(`❌ ${apiMessage(error)}`);
    }
  };

  const estimatedSubtotal = lines.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.unit_price || 0), 0);
  const estimatedTotal = Math.max(0, estimatedSubtotal - Number(form.discount_amount || 0));

  return (
    <div className="mx-auto max-w-[1250px] p-4 pb-28 sm:p-6 lg:pb-8">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#0B6B50]">Propositions commerciales</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight">Devis clients</h1>
      <p className="text-sm text-gray-500 mb-6">
        Le devis fixe le montant convenu. Le règlement est déclaré uniquement après la réalisation de la prestation.
      </p>
      {message && <p className="mb-4 text-blue-700">{message}</p>}

      <form onSubmit={createAndSend} className="mb-8 space-y-4 rounded-[28px] border border-black/5 bg-white p-5 shadow-[0_8px_28px_rgba(30,45,37,0.05)] sm:p-6">
        <select value={form.appointment} onChange={(e) => setForm({ ...form, appointment: e.target.value })} className="border rounded p-2 w-full" required>
          <option value="">-- Choisir une demande --</option>
          {appointments.map((a) => <option key={a.id} value={a.id}>{a.client_nom} · {a.service_titre} · {new Date(a.date_rdv).toLocaleString('fr-FR')}</option>)}
        </select>

        <div className="space-y-2">
          {lines.map((line, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-2 border rounded p-3">
              <input className="border rounded p-2 md:col-span-6" placeholder="Désignation" maxLength={180} value={line.description} onChange={(e) => updateLine(index, 'description', e.target.value)} required />
              <input className="border rounded p-2 md:col-span-2" type="number" min="0.01" step="0.01" placeholder="Qté" value={line.quantity} onChange={(e) => updateLine(index, 'quantity', e.target.value)} required />
              <input className="border rounded p-2 md:col-span-3" type="number" min="0" step="1" placeholder="Prix unitaire" value={line.unit_price} onChange={(e) => updateLine(index, 'unit_price', e.target.value)} required />
              <button type="button" onClick={() => removeLine(index)} className="md:col-span-1 text-red-600">✕</button>
            </div>
          ))}
          <button type="button" onClick={() => setLines([...lines, emptyLine()])} className="text-blue-600 text-sm">+ Ajouter une ligne</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="text-sm">Réduction (FCFA)<input type="number" min="0" step="1" value={form.discount_amount} onChange={(e) => setForm({ ...form, discount_amount: e.target.value })} className="mt-1 border rounded p-2 w-full" /></label>
          <label className="text-sm">Valable jusqu’au<input type="datetime-local" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} className="mt-1 border rounded p-2 w-full" /></label>
        </div>
        <textarea className="border rounded p-2 w-full" rows={3} maxLength={2000} placeholder="Notes et conditions (facultatif)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <div className="text-right font-bold">Total estimé : {money(estimatedTotal)}</div>
        <button className="w-full rounded-2xl bg-[#0B6B50] px-4 py-3 text-sm font-black text-white hover:bg-[#095C45]">Créer et envoyer le devis</button>
      </form>

      <h2 className="text-lg font-semibold mb-3">Historique des devis</h2>
      {loading ? <p>Chargement...</p> : (
        <div className="space-y-3">
          {quotes.map((quote) => (
            <div key={quote.id} className="flex flex-wrap justify-between gap-3 rounded-[24px] border border-black/5 bg-white p-5 shadow-[0_8px_24px_rgba(30,45,37,0.04)]">
              <div>
                <p className="font-semibold">{quote.reference} · {quote.client_username}</p>
                <p className="text-sm text-gray-500">{quote.service_titre} · {quote.status}</p>
              </div>
              <p className="font-bold text-green-700">{money(quote.total)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
