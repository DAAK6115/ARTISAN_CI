import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../utils/axiosInstance';
import CountrySelect from '../../components/CountrySelect';

export default function ClientProfileEditPage() {
  const [formData, setFormData] = useState({ username: '', numero_momo: '', country_code: 'CI' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    axios.get('/accounts/profile/me/')
      .then(({ data }) => setFormData({
        username: data.username || '',
        numero_momo: data.numero_momo || '',
        country_code: data.country_code || 'CI',
      }))
      .catch(() => setMessage('Impossible de charger votre profil.'))
      .finally(() => setLoading(false));
  }, []);

  const updateProfile = async (event) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setMessage('');
    try {
      await axios.put('/accounts/profile/update/', formData);
      setMessage('Profil mis à jour.');
      setTimeout(() => navigate('/client/profil'), 700);
    } catch (error) {
      const first = error.response?.data && Object.values(error.response.data).flat()[0];
      setMessage(typeof first === 'string' ? first : 'Impossible de mettre à jour votre profil.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl p-4 pb-28 sm:p-6 md:pb-8">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0B6B50]">Compte</p>
      <h1 className="mt-2 text-3xl font-black">Modifier mon profil</h1>
      {message && <p className="mt-5 rounded-2xl bg-[#EDF4FF] px-4 py-3 text-sm font-semibold text-[#3565A8]">{message}</p>}

      <form onSubmit={updateProfile} className="mt-6 space-y-5 rounded-[28px] border border-black/5 bg-white p-5 shadow-sm sm:p-6">
        {loading ? <div className="h-56 animate-pulse rounded-2xl bg-[#F5F7F5]" /> : <>
          <label className="block text-sm font-bold">Nom d’utilisateur
            <input value={formData.username} onChange={(e) => setFormData((current) => ({ ...current, username: e.target.value }))} className="mt-1 w-full rounded-2xl border border-black/10 px-4 py-3 font-normal" />
          </label>

          <CountrySelect value={formData.country_code} onChange={(country_code) => setFormData((current) => ({ ...current, country_code }))} />

          <label className="block text-sm font-bold">Numéro Mobile Money
            <input type="tel" value={formData.numero_momo} onChange={(e) => setFormData((current) => ({ ...current, numero_momo: e.target.value }))} className="mt-1 w-full rounded-2xl border border-black/10 px-4 py-3 font-normal" placeholder="Numéro associé à vos usages Mobile Money" />
          </label>

          <button type="submit" disabled={saving} className="w-full rounded-2xl bg-[#0B6B50] px-5 py-3 text-sm font-black text-white disabled:opacity-60">{saving ? 'Enregistrement…' : 'Enregistrer les modifications'}</button>
        </>}
      </form>
    </div>
  );
}
