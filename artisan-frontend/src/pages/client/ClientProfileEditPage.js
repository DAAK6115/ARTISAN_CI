import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../utils/axiosInstance';
import CountrySelect from '../../components/CountrySelect';
import InternationalPhoneInput from '../../components/InternationalPhoneInput';
import AddressAutocomplete from '../../components/AddressAutocomplete';
import AppIcon from '../../components/AppIcon';

const EMPTY_FORM = {
  username: '',
  first_name: '',
  last_name: '',
  email: '',
  country_code: 'CI',
  city: '',
  phone_number: '',
  numero_momo: '',
  primary_address: '',
  primary_latitude: null,
  primary_longitude: null,
  preferred_contact_method: 'chat',
  preferred_service_location: 'no_preference',
};

export default function ClientProfileEditPage() {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [existingPhoto, setExistingPhoto] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');
  const navigate = useNavigate();

  useEffect(() => {
    axios.get('/accounts/profile/me/')
      .then(({ data }) => {
        setFormData({
          username: data.username || '',
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          email: data.email || '',
          country_code: data.country_code || 'CI',
          city: data.city || '',
          phone_number: data.phone_number_national || data.phone_number || '',
          numero_momo: data.numero_momo_national || data.numero_momo || '',
          primary_address: data.primary_address || '',
          primary_latitude: data.primary_latitude ?? null,
          primary_longitude: data.primary_longitude ?? null,
          preferred_contact_method: data.preferred_contact_method || 'chat',
          preferred_service_location: data.preferred_service_location || 'no_preference',
        });
        setExistingPhoto(data.profile_photo || '');
      })
      .catch(() => {
        setMessageType('error');
        setMessage('Impossible de charger votre profil.');
      })
      .finally(() => setLoading(false));
  }, []);

  const previewUrl = useMemo(() => {
    if (profilePhoto) return URL.createObjectURL(profilePhoto);
    return existingPhoto;
  }, [profilePhoto, existingPhoto]);

  useEffect(() => () => {
    if (profilePhoto && previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
  }, [profilePhoto, previewUrl]);

  const setField = (field, value) => setFormData((current) => ({ ...current, [field]: value }));

  const updateProfile = async (event) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setMessage('');
    setMessageType('info');

    try {
      const payload = new FormData();
      [
        'username', 'first_name', 'last_name', 'email', 'country_code', 'city',
        'phone_number', 'numero_momo', 'primary_address',
        'preferred_contact_method', 'preferred_service_location',
      ].forEach((key) => payload.append(key, formData[key] ?? ''));

      if (formData.primary_latitude != null && formData.primary_longitude != null) {
        payload.append('primary_latitude', formData.primary_latitude);
        payload.append('primary_longitude', formData.primary_longitude);
      }
      if (profilePhoto) payload.append('profile_photo', profilePhoto);

      await axios.put('/accounts/profile/update/', payload);
      setMessageType('success');
      setMessage('Profil mis à jour avec succès.');
      setTimeout(() => navigate('/client/profil'), 650);
    } catch (error) {
      const data = error.response?.data;
      const first = data && Object.values(data).flat()[0];
      setMessageType('error');
      setMessage(typeof first === 'string' ? first : 'Impossible de mettre à jour votre profil.');
    } finally {
      setSaving(false);
    }
  };

  const alertClass = messageType === 'error'
    ? 'bg-red-50 text-red-700'
    : messageType === 'success'
      ? 'bg-emerald-50 text-[#0B6B50]'
      : 'bg-[#EDF4FF] text-[#3565A8]';

  return (
    <div className="mx-auto max-w-5xl p-4 pb-28 sm:p-6 md:pb-8">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0B6B50]">Compte</p>
      <h1 className="mt-2 text-3xl font-black">Modifier mon profil</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#718078]">Complétez votre profil une seule fois pour accélérer vos réservations, contacts et interventions à domicile.</p>

      {message && <p className={`mt-5 rounded-2xl px-4 py-3 text-sm font-semibold ${alertClass}`}>{message}</p>}

      <form onSubmit={updateProfile} className="mt-6 space-y-6 rounded-[30px] border border-black/5 bg-white p-5 shadow-sm sm:p-7">
        {loading ? <div className="h-[620px] animate-pulse rounded-3xl bg-[#F5F7F5]" /> : <>
          <section>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0B6B50]">Identité</p>
            <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-[28px] border-4 border-white bg-[#10271F] text-xl font-black text-white shadow-lg">
                {previewUrl ? <img src={previewUrl} alt="Photo de profil" className="h-full w-full object-cover" /> : String(formData.first_name || formData.username || 'C').slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <label className="block text-sm font-bold text-[#223027]">Photo de profil
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setProfilePhoto(event.target.files?.[0] || null)} className="mt-2 block w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm font-normal" />
                </label>
                <p className="mt-1 text-xs text-[#829087]">JPG, PNG ou WebP · 3 Mo maximum.</p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-bold text-[#223027]">Prénom<input value={formData.first_name} onChange={(e) => setField('first_name', e.target.value)} autoComplete="given-name" className="mt-1 w-full rounded-2xl border border-black/10 px-4 py-3 font-normal outline-none focus:border-[#0B6B50]" /></label>
              <label className="block text-sm font-bold text-[#223027]">Nom<input value={formData.last_name} onChange={(e) => setField('last_name', e.target.value)} autoComplete="family-name" className="mt-1 w-full rounded-2xl border border-black/10 px-4 py-3 font-normal outline-none focus:border-[#0B6B50]" /></label>
              <label className="block text-sm font-bold text-[#223027]">Nom d’utilisateur<input value={formData.username} onChange={(e) => setField('username', e.target.value)} autoComplete="username" required className="mt-1 w-full rounded-2xl border border-black/10 px-4 py-3 font-normal outline-none focus:border-[#0B6B50]" /></label>
              <label className="block text-sm font-bold text-[#223027]">Email<input type="email" value={formData.email} onChange={(e) => setField('email', e.target.value)} autoComplete="email" required className="mt-1 w-full rounded-2xl border border-black/10 px-4 py-3 font-normal outline-none focus:border-[#0B6B50]" /></label>
            </div>
          </section>

          <div className="h-px bg-black/5" />

          <section>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0B6B50]">Pays & localisation</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <CountrySelect value={formData.country_code} onChange={(country_code) => setFormData((current) => ({ ...current, country_code, phone_number: '', numero_momo: '' }))} />
              <label className="block text-sm font-bold text-[#223027]">Ville / commune<input value={formData.city} onChange={(e) => setField('city', e.target.value)} placeholder="Ex. Cocody, Paris, Dakar…" autoComplete="address-level2" className="mt-1 w-full rounded-2xl border border-black/10 px-4 py-3 font-normal outline-none focus:border-[#0B6B50]" /></label>
            </div>

            <label className="mt-5 block text-sm font-bold text-[#223027]">Adresse principale</label>
            <div className="mt-1">
              <AddressAutocomplete
                value={formData.primary_address}
                country={formData.country_code}
                onChange={(primary_address) => setFormData((current) => ({ ...current, primary_address, primary_latitude: null, primary_longitude: null }))}
                onSelect={({ address, latitude, longitude }) => setFormData((current) => ({ ...current, primary_address: address, primary_latitude: latitude, primary_longitude: longitude }))}
                placeholder="Ex. Riviera 3, Cocody…"
                helpText={formData.primary_latitude != null ? 'Adresse géolocalisée : elle pourra être réutilisée pour vos réservations à domicile.' : 'Sélectionnez une suggestion pour enregistrer aussi la position GPS.'}
              />
            </div>
          </section>

          <div className="h-px bg-black/5" />

          <section>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0B6B50]">Contacts</p>
            <div className="mt-4 grid gap-5 lg:grid-cols-2">
              <InternationalPhoneInput countryCode={formData.country_code} value={formData.phone_number} onChange={(phone_number) => setField('phone_number', phone_number)} label="Téléphone principal" helpText="Numéro utilisé pour vos échanges avec les artisans. Stockage sécurisé au format E.164." />
              <InternationalPhoneInput countryCode={formData.country_code} value={formData.numero_momo} onChange={(numero_momo) => setField('numero_momo', numero_momo)} label="Numéro Mobile Money (facultatif)" helpText="Utilisé uniquement lorsqu’un règlement Mobile Money doit être identifié. Stockage au format E.164." />
            </div>
          </section>

          <div className="h-px bg-black/5" />

          <section>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0B6B50]">Préférences</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-bold text-[#223027]">Canal de contact préféré
                <select value={formData.preferred_contact_method} onChange={(e) => setField('preferred_contact_method', e.target.value)} className="mt-1 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 font-normal outline-none focus:border-[#0B6B50]">
                  <option value="chat">Messagerie ARTISAN_CI</option><option value="whatsapp">WhatsApp</option><option value="phone">Téléphone</option><option value="email">Email</option>
                </select>
              </label>
              <label className="block text-sm font-bold text-[#223027]">Lieu d’intervention préféré
                <select value={formData.preferred_service_location} onChange={(e) => setField('preferred_service_location', e.target.value)} className="mt-1 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 font-normal outline-none focus:border-[#0B6B50]">
                  <option value="no_preference">Aucune préférence</option><option value="home">Chez moi</option><option value="workshop">Chez l’artisan</option>
                </select>
              </label>
            </div>
            <div className="mt-4 rounded-2xl bg-[#F5F8F6] px-4 py-3 text-xs leading-5 text-[#66736D]">Ces préférences servent à accélérer vos parcours. Elles ne remplacent jamais le choix final au moment de réserver.</div>
          </section>

          <div className="flex flex-col-reverse gap-3 border-t border-black/5 pt-5 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => navigate('/client/profil')} className="rounded-2xl border border-black/10 px-5 py-3 text-sm font-black text-[#526159]">Annuler</button>
            <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0B6B50] px-6 py-3 text-sm font-black text-white disabled:opacity-60"><AppIcon name="check" className="h-4 w-4" />{saving ? 'Enregistrement…' : 'Enregistrer les modifications'}</button>
          </div>
        </>}
      </form>
    </div>
  );
}
