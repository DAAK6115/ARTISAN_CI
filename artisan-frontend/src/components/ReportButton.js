import { useState } from 'react';
import axios from '../utils/axiosInstance';

const REASONS = [
  ['fraud', 'Arnaque ou fraude'],
  ['inappropriate', 'Contenu inapproprié'],
  ['fake_profile', 'Faux profil'],
  ['harassment', 'Harcèlement'],
  ['spam', 'Spam'],
  ['work_quality', 'Travail non conforme'],
  ['other', 'Autre'],
];

export default function ReportButton({ targetUserId, className = '' }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('other');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!targetUserId || loading) return;
    setLoading(true); setMessage('');
    try {
      await axios.post('/moderation/reports/', { target_user: targetUserId, reason, description });
      setMessage('Signalement envoyé à l’administration.');
      setTimeout(() => setOpen(false), 700);
    } catch (error) {
      setMessage(error?.response?.data?.detail || 'Impossible d’envoyer le signalement.');
    } finally { setLoading(false); }
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className || 'rounded-2xl border border-[#D8DDD9] px-4 py-2.5 text-sm font-bold text-[#6C453E] hover:bg-[#FFF5F2]'}>Signaler</button>
      {open && <div className="fixed inset-0 z-[80] grid place-items-center bg-black/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
        <button className="absolute inset-0" onClick={() => setOpen(false)} aria-label="Fermer" />
        <div className="relative w-full max-w-lg rounded-[28px] bg-white p-6 shadow-2xl">
          <h2 className="text-xl font-black">Signaler ce profil</h2>
          <p className="mt-1 text-sm text-[#718078]">Le signalement sera examiné par l’administration.</p>
          <select value={reason} onChange={(e) => setReason(e.target.value)} className="mt-5 w-full rounded-2xl border border-black/10 px-4 py-3 text-sm">{REASONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={3000} rows={5} placeholder="Décrivez le problème (facultatif)" className="mt-3 w-full rounded-2xl border border-black/10 px-4 py-3 text-sm" />
          {message && <p className="mt-3 text-sm font-semibold text-[#3565A8]">{message}</p>}
          <div className="mt-5 flex justify-end gap-2"><button onClick={() => setOpen(false)} className="rounded-2xl border border-black/10 px-4 py-2.5 text-sm font-bold">Annuler</button><button disabled={loading} onClick={submit} className="rounded-2xl bg-[#B23A31] px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">{loading ? 'Envoi…' : 'Envoyer'}</button></div>
        </div>
      </div>}
    </>
  );
}
