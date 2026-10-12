import { useEffect, useMemo, useState } from 'react';
import axios from '../../utils/axiosInstance';
import AddressAutocomplete from '../../components/AddressAutocomplete';
import AppIcon from '../../components/AppIcon';
import CountrySelect from '../../components/CountrySelect';
import { countryDisplayName, countryFlag } from '../../utils/country';

function listFromResponse(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  return [];
}

function emptyForm(countryCode = 'CI') {
  return {
    label: 'Maison',
    address: '',
    city: '',
    country_code: countryCode || 'CI',
    latitude: null,
    longitude: null,
    is_default: false,
  };
}

function firstApiError(error, fallback) {
  const data = error?.response?.data;
  if (!data) return fallback;
  if (typeof data === 'string') return data;
  if (data.detail) return Array.isArray(data.detail) ? data.detail[0] : data.detail;
  const first = Object.values(data).flat()[0];
  return typeof first === 'string' ? first : fallback;
}

export default function ClientAddressesPage() {
  const [addresses, setAddresses] = useState([]);
  const [accountCountry, setAccountCountry] = useState('CI');
  const [form, setForm] = useState(() => emptyForm('CI'));
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    const [addressesResult, profileResult] = await Promise.allSettled([
      axios.get('/accounts/client/addresses/'),
      axios.get('/accounts/profile/me/'),
    ]);

    if (addressesResult.status === 'fulfilled') {
      setAddresses(listFromResponse(addressesResult.value.data));
    } else if (!silent) {
      setMessageType('error');
      setMessage('Impossible de charger vos adresses pour le moment.');
    }

    if (profileResult.status === 'fulfilled') {
      const country = profileResult.value.data?.country_code || 'CI';
      setAccountCountry(country);
      if (!editingId) {
        setForm((current) => ({
          ...current,
          country_code: current.country_code || country,
        }));
      }
    }

    if (!silent) setLoading(false);
  };

  useEffect(() => {
    load();
    // Le chargement initial ne doit pas dépendre de editingId.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const defaultAddress = useMemo(
    () => addresses.find((item) => item.is_default) || null,
    [addresses],
  );

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm(accountCountry));
  };

  const setField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
  };

  const startEdit = (address) => {
    setEditingId(address.id);
    setForm({
      label: address.label || 'Adresse',
      address: address.address || '',
      city: address.city || '',
      country_code: address.country_code || accountCountry,
      latitude: address.latitude == null ? null : Number(address.latitude),
      longitude: address.longitude == null ? null : Number(address.longitude),
      is_default: Boolean(address.is_default),
    });
    setMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;

    if (
      !form.address.trim()
      || !Number.isFinite(Number(form.latitude))
      || !Number.isFinite(Number(form.longitude))
    ) {
      setMessageType('error');
      setMessage('Sélectionnez une adresse proposée afin d’enregistrer aussi sa position GPS.');
      return;
    }

    setSaving(true);
    setMessage('');
    const payload = {
      label: form.label.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      country_code: form.country_code,
      latitude: Number(form.latitude).toFixed(6),
      longitude: Number(form.longitude).toFixed(6),
      is_default: Boolean(form.is_default),
    };

    try {
      if (editingId) {
        await axios.patch(`/accounts/client/addresses/${editingId}/`, payload);
      } else {
        await axios.post('/accounts/client/addresses/', payload);
      }
      setMessageType('success');
      setMessage(editingId ? 'Adresse mise à jour.' : 'Adresse enregistrée.');
      resetForm();
      await load(true);
    } catch (error) {
      setMessageType('error');
      setMessage(firstApiError(error, 'Impossible d’enregistrer cette adresse.'));
    } finally {
      setSaving(false);
    }
  };

  const makeDefault = async (address) => {
    try {
      await axios.patch(`/accounts/client/addresses/${address.id}/`, { is_default: true });
      setMessageType('success');
      setMessage(`${address.label} est maintenant votre adresse par défaut.`);
      await load(true);
    } catch (error) {
      setMessageType('error');
      setMessage(firstApiError(error, 'Impossible de modifier l’adresse par défaut.'));
    }
  };

  const remove = async (address) => {
    const confirmed = window.confirm(`Supprimer l’adresse « ${address.label} » ?`);
    if (!confirmed) return;

    try {
      await axios.delete(`/accounts/client/addresses/${address.id}/`);
      if (editingId === address.id) resetForm();
      setMessageType('success');
      setMessage('Adresse supprimée.');
      await load(true);
    } catch (error) {
      setMessageType('error');
      setMessage(firstApiError(error, 'Impossible de supprimer cette adresse.'));
    }
  };

  const alertClass = messageType === 'error'
    ? 'border-red-200 bg-red-50 text-red-700'
    : messageType === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-[#0B6B50]'
      : 'border-blue-100 bg-blue-50 text-blue-700';

  return (
    <div className="mx-auto max-w-6xl pb-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0B6B50]">Mon compte</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Mes adresses</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#718078]">
            Enregistrez jusqu’à 10 lieux pour réserver plus vite. L’adresse choisie lors d’un rendez-vous reste copiée dans le rendez-vous afin de préserver l’historique.
          </p>
        </div>
        <div className="rounded-2xl bg-[#EAF4F0] px-4 py-3 text-sm font-bold text-[#0B6B50]">
          {addresses.length}/10 enregistrées
        </div>
      </div>

      {message && <div className={`mt-5 rounded-2xl border px-4 py-3 text-sm font-semibold ${alertClass}`}>{message}</div>}

      <section className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <form onSubmit={submit} className="h-fit rounded-[30px] border border-black/5 bg-white p-5 shadow-[0_12px_35px_rgba(20,38,30,0.05)] sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0B6B50]">{editingId ? 'Modification' : 'Nouvelle adresse'}</p>
              <h2 className="mt-1 text-xl font-black">{editingId ? 'Modifier cette adresse' : 'Ajouter un lieu'}</h2>
            </div>
            {editingId && (
              <button type="button" onClick={resetForm} className="grid h-10 w-10 place-items-center rounded-xl bg-[#F4F6F4] text-[#526159]" aria-label="Annuler la modification">
                <AppIcon name="close" className="h-4 w-4" />
              </button>
            )}
          </div>

          <label className="mt-5 block text-sm font-bold text-[#223027]">
            Nom du lieu
            <input
              value={form.label}
              onChange={(event) => setField('label', event.target.value)}
              maxLength={40}
              required
              placeholder="Maison, Bureau, Parents…"
              className="mt-1 w-full rounded-2xl border border-black/10 px-4 py-3 font-normal outline-none focus:border-[#0B6B50]"
            />
          </label>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <CountrySelect
              value={form.country_code}
              onChange={(country_code) => setForm((current) => ({
                ...current,
                country_code,
                address: '',
                latitude: null,
                longitude: null,
              }))}
              label="Pays de l’adresse"
            />
            <label className="block text-sm font-bold text-[#223027]">
              Ville / commune
              <input
                value={form.city}
                onChange={(event) => setField('city', event.target.value)}
                maxLength={120}
                placeholder="Ex. Cocody, Plateau, Paris…"
                className="mt-1 w-full rounded-2xl border border-black/10 px-4 py-3 font-normal outline-none focus:border-[#0B6B50]"
              />
            </label>
          </div>

          <div className="mt-4">
            <AddressAutocomplete
              value={form.address}
              country={form.country_code}
              onChange={(address) => setForm((current) => ({
                ...current,
                address,
                latitude: null,
                longitude: null,
              }))}
              onSelect={({ address, latitude, longitude }) => setForm((current) => ({
                ...current,
                address,
                latitude: Number(latitude.toFixed(6)),
                longitude: Number(longitude.toFixed(6)),
              }))}
              placeholder="Rechercher l’adresse précise…"
              helpText={form.latitude != null ? '✓ Position GPS confirmée.' : 'Choisissez une suggestion pour enregistrer la position GPS.'}
            />
          </div>

          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl bg-[#F7F9F7] p-4">
            <input
              type="checkbox"
              checked={form.is_default}
              onChange={(event) => setField('is_default', event.target.checked)}
              disabled={Boolean(editingId && defaultAddress?.id === editingId)}
              className="mt-0.5 h-4 w-4 accent-[#0B6B50]"
            />
            <span>
              <span className="block text-sm font-black text-[#26352D]">Utiliser par défaut</span>
              <span className="mt-1 block text-xs leading-5 text-[#718078]">
                Cette adresse sera proposée en priorité pour les interventions à domicile.
              </span>
            </span>
          </label>

          <button
            type="submit"
            disabled={saving || (!editingId && addresses.length >= 10)}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0B6B50] px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <AppIcon name="check" className="h-4 w-4" />
            {saving ? 'Enregistrement…' : editingId ? 'Enregistrer les modifications' : 'Ajouter l’adresse'}
          </button>
        </form>

        <div className="rounded-[30px] border border-black/5 bg-white p-5 shadow-[0_12px_35px_rgba(20,38,30,0.05)] sm:p-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#E07A32]">Carnet d’adresses</p>
            <h2 className="mt-1 text-xl font-black">Lieux enregistrés</h2>
          </div>

          {loading ? (
            <div className="mt-5 space-y-3">
              {[1, 2, 3].map((item) => <div key={item} className="h-28 animate-pulse rounded-3xl bg-[#F4F6F4]" />)}
            </div>
          ) : addresses.length === 0 ? (
            <div className="mt-5 rounded-3xl border border-dashed border-[#CED8D2] bg-[#FBFCFB] p-8 text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#EAF4F0] text-[#0B6B50]">
                <AppIcon name="pin" className="h-5 w-5" />
              </span>
              <p className="mt-4 font-black">Aucune adresse enregistrée</p>
              <p className="mt-1 text-sm leading-6 text-[#718078]">Ajoutez votre domicile, votre bureau ou tout autre lieu d’intervention fréquent.</p>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {addresses.map((address) => (
                <article key={address.id} className={`rounded-[24px] border p-4 ${address.is_default ? 'border-[#A9D4C5] bg-[#F2FAF7]' : 'border-black/5 bg-[#FBFCFB]'}`}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-[#0B6B50] shadow-sm"><AppIcon name="pin" className="h-4 w-4" /></span>
                        <h3 className="font-black text-[#1E2B24]">{address.label}</h3>
                        {address.is_default && <span className="rounded-full bg-[#0B6B50] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-white">Par défaut</span>}
                      </div>
                      <p className="mt-3 text-sm font-semibold leading-6 text-[#45534C]">{address.address}</p>
                      <p className="mt-1 text-xs text-[#718078]">
                        {countryFlag(address.country_code)} {countryDisplayName(address.country_code)}
                        {address.city ? ` · ${address.city}` : ''}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      {!address.is_default && (
                        <button type="button" onClick={() => makeDefault(address)} className="rounded-xl bg-[#EAF4F0] px-3 py-2 text-xs font-black text-[#0B6B50]">
                          Définir par défaut
                        </button>
                      )}
                      <button type="button" onClick={() => startEdit(address)} className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-black text-[#526159]">
                        Modifier
                      </button>
                      <button type="button" onClick={() => remove(address)} className="grid h-9 w-9 place-items-center rounded-xl bg-[#FFF0EE] text-[#B74339]" aria-label={`Supprimer ${address.label}`}>
                        <AppIcon name="trash" className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
