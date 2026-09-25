import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../../utils/axiosInstance';
import ArtisanMap from '../../components/ArtisanMap';
import LocationActions from '../../components/LocationActions';
import { reverseGeocode } from '../../utils/location';

export default function ArtisanProfileEditPage() {
  const [form, setForm] = useState({
    bio: '',
    site_web: '',
    facebook: '',
    whatsapp: '',
    localisation: '',
    photo_profil: null,
    photo_couverture: null,
    latitude: null,
    longitude: null,
  });
  const [preview, setPreview] = useState('');
  const [profilePreview, setProfilePreview] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [resolvingAddress, setResolvingAddress] = useState(false);

  const load = async () => {
    try {
      const { data } = await axios.get('/portfolio/me/');
      setForm({
        bio: data.bio || '',
        site_web: data.site_web || '',
        facebook: data.facebook || '',
        whatsapp: data.whatsapp || '',
        localisation: data.localisation || '',
        photo_profil: null,
    photo_couverture: null,
        latitude: data.latitude,
        longitude: data.longitude,
      });
      setPreview(data.photo_couverture || '');
      setProfilePreview(data.photo_profil || '');
    } catch {
      setMessage('Impossible de charger votre profil.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const applyCoordinates = async (latitude, longitude, source = 'map') => {
    const rawLat = Number(latitude);
    const rawLng = Number(longitude);
    if (!Number.isFinite(rawLat) || !Number.isFinite(rawLng)) return;

    // Le modèle Django stocke 6 décimales. Les coordonnées GPS du navigateur
    // peuvent en fournir 10 à 15 : on les normalise avant tout envoi.
    const lat = Number(rawLat.toFixed(6));
    const lng = Number(rawLng.toFixed(6));

    setForm((current) => ({ ...current, latitude: lat, longitude: lng }));
    setResolvingAddress(true);
    try {
      const address = await reverseGeocode(lat, lng);
      setForm((current) => ({ ...current, latitude: lat, longitude: lng, localisation: address }));
      setMessage(source === 'gps'
        ? 'Position détectée : la localisation a été remplie automatiquement. Vous pouvez la modifier avant d’enregistrer.'
        : 'Position mise à jour : la localisation a été recalculée. Vous pouvez ajuster le texte si nécessaire.');
    } catch {
      setMessage('Position GPS enregistrée, mais l’adresse n’a pas pu être déterminée automatiquement. Vous pouvez saisir la localisation manuellement.');
    } finally {
      setResolvingAddress(false);
    }
  };

  const detectPosition = () => {
    if (!navigator.geolocation) {
      setMessage('La géolocalisation n’est pas disponible sur cet appareil.');
      return;
    }

    setLocating(true);
    setMessage('Recherche de votre position actuelle…');
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          await applyCoordinates(coords.latitude, coords.longitude, 'gps');
        } finally {
          setLocating(false);
        }
      },
      (error) => {
        setLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          setMessage('Autorisation de localisation refusée. Autorisez-la dans le navigateur puis réessayez.');
        } else if (error.code === error.TIMEOUT) {
          setMessage('La détection de position a pris trop de temps. Réessayez à l’extérieur ou avec le GPS activé.');
        } else {
          setMessage('Impossible d’obtenir votre position actuelle.');
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  };

  const submit = async (event) => {
    event.preventDefault();
    const data = new FormData();
    ['bio', 'site_web', 'facebook', 'whatsapp', 'localisation'].forEach((key) => data.append(key, form[key] || ''));
    if (form.photo_profil) data.append('photo_profil', form.photo_profil);
    if (form.photo_couverture) data.append('photo_couverture', form.photo_couverture);
    if (form.latitude != null && Number.isFinite(Number(form.latitude))) {
      data.append('latitude', Number(form.latitude).toFixed(6));
    }
    if (form.longitude != null && Number.isFinite(Number(form.longitude))) {
      data.append('longitude', Number(form.longitude).toFixed(6));
    }

    try {
      await axios.patch('/portfolio/me/', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMessage('Profil professionnel mis à jour.');
      await load();
    } catch (error) {
      const first = error.response?.data && Object.values(error.response.data).flat()[0];
      setMessage(typeof first === 'string' ? first : 'Impossible de mettre à jour votre profil.');
    }
  };

  if (loading) return <div className="p-6">Chargement...</div>;

  const hasCoordinates = Number.isFinite(Number(form.latitude)) && Number.isFinite(Number(form.longitude));

  return (
    <div className="mx-auto max-w-[1200px] p-4 pb-28 sm:p-6 lg:pb-8">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#0B6B50]">Votre identité professionnelle</p>
          <h1 className="mt-2 text-3xl font-black">Modifier mon profil</h1>
        </div>
        <Link to="/artisan/profil" className="text-sm font-black text-[#0B6B50]">Voir mon profil</Link>
      </div>

      {message && <p className="mt-5 rounded-2xl bg-[#EDF4FF] p-3 text-sm font-semibold text-[#3565A8]">{message}</p>}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <form onSubmit={submit} className="space-y-4 rounded-[28px] border border-black/5 bg-white p-5 sm:p-6">
          <label className="block text-sm font-bold">
            Bio professionnelle
            <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} maxLength={1500} className="mt-1 min-h-28 w-full rounded-2xl border border-black/10 px-4 py-3 font-normal" placeholder="Présentez votre métier, votre expérience et votre façon de travailler." />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-bold">
              Localisation
              <input value={form.localisation} onChange={(e) => setForm({ ...form, localisation: e.target.value })} className="mt-1 w-full rounded-2xl border border-black/10 px-4 py-3 font-normal" placeholder="Ex. Cocody, Abidjan" />
              <span className="mt-1 block text-xs font-normal text-[#829087]">Le GPS peut remplir ce champ automatiquement, mais vous gardez toujours la possibilité de le modifier.</span>
            </label>
            <label className="text-sm font-bold">
              WhatsApp
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={form.whatsapp}
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                className="mt-1 w-full rounded-2xl border border-black/10 px-4 py-3 font-normal"
                placeholder="Ex. +225 01 02 03 04 05"
              />
              <span className="mt-1 block text-xs font-normal text-[#829087]">Format international : + indicatif pays + numéro. Ex. +225…, +33…, +1…. Espaces et tirets acceptés.</span>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-bold">Site web<input type="url" value={form.site_web} onChange={(e) => setForm({ ...form, site_web: e.target.value })} className="mt-1 w-full rounded-2xl border border-black/10 px-4 py-3 font-normal" /></label>
            <label className="text-sm font-bold">Facebook<input type="url" value={form.facebook} onChange={(e) => setForm({ ...form, facebook: e.target.value })} className="mt-1 w-full rounded-2xl border border-black/10 px-4 py-3 font-normal" /></label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-bold">
              Photo de profil
              <input type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0] || null; setForm({ ...form, photo_profil: file }); if (file) setProfilePreview(URL.createObjectURL(file)); }} className="mt-1 w-full rounded-2xl border border-black/10 px-4 py-3 font-normal" />
              <span className="mt-1 block text-xs font-normal text-[#829087]">Utilisée dans la carte, les résultats et votre profil public.</span>
            </label>
            <label className="block text-sm font-bold">
              Photo de couverture
              <input type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0] || null; setForm({ ...form, photo_couverture: file }); if (file) setPreview(URL.createObjectURL(file)); }} className="mt-1 w-full rounded-2xl border border-black/10 px-4 py-3 font-normal" />
            </label>
          </div>

          <div className="rounded-2xl bg-[#F7F8F6] p-4">
            <p className="text-sm font-black">Position GPS</p>
            <p className="mt-1 text-xs leading-5 text-[#718078]">Utilisez votre position actuelle, puis ajustez le marqueur directement sur la carte si nécessaire.</p>
            <button type="button" onClick={detectPosition} disabled={locating || resolvingAddress} className="mt-3 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-black disabled:opacity-60">
              {locating ? 'Localisation en cours…' : resolvingAddress ? 'Recherche de l’adresse…' : '📍 Utiliser ma position actuelle'}
            </button>
            {hasCoordinates && <p className="mt-2 text-xs text-[#829087]">{Number(form.latitude).toFixed(6)}, {Number(form.longitude).toFixed(6)}</p>}
          </div>

          <div className="flex flex-wrap gap-2">
            <button className="rounded-2xl bg-[#0B6B50] px-5 py-3 text-sm font-black text-white">Enregistrer</button>
          </div>
        </form>

        <aside className="rounded-[28px] border border-black/5 bg-white p-5 sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#829087]">Aperçu & position</p>
          <div className="relative mt-4">
            {preview ? <img src={preview} alt="Aperçu de la couverture" className="h-52 w-full rounded-[22px] object-cover" /> : <div className="h-52 rounded-[22px] bg-[#F4F6F4]" />}
            <div className="absolute -bottom-7 left-4">
              {profilePreview ? (
                <img src={profilePreview} alt="Aperçu du profil" className="h-16 w-16 rounded-2xl border-4 border-white object-cover shadow-md" />
              ) : (
                <span className="grid h-16 w-16 place-items-center rounded-2xl border-4 border-white bg-[#0B6B50] text-lg font-black text-white shadow-md">A</span>
              )}
            </div>
          </div>
          <p className="mt-10 text-sm leading-6 text-[#526159]">{form.bio || 'Votre bio apparaîtra ici.'}</p>
          {form.localisation && <p className="mt-3 text-sm font-bold">📍 {form.localisation}</p>}

          {hasCoordinates ? (
            <>
              <div className="mt-4 overflow-hidden rounded-[20px] border border-black/5">
                <ArtisanMap
                  latitude={form.latitude}
                  longitude={form.longitude}
                  editable
                  height={330}
                  onLocationChange={(lat, lng) => applyCoordinates(lat, lng, 'map')}
                />
              </div>
              <p className="mt-2 text-xs leading-5 text-[#829087]">Cliquez sur la carte ou déplacez le marqueur pour corriger la position exacte.</p>
              <div className="mt-4">
                <LocationActions latitude={form.latitude} longitude={form.longitude} label={form.localisation || 'ARTISAN_CI'} compact />
              </div>
              <p className="mt-3 text-[11px] leading-4 text-[#8A958F]">Adresse détectée avec OpenStreetMap/Nominatim. La carte utilise les données OpenStreetMap.</p>
            </>
          ) : (
            <div className="mt-4 rounded-2xl bg-[#FFF7DD] p-4 text-sm text-[#745B15]">Utilisez votre position actuelle pour afficher la carte et les accès GPS.</div>
          )}
        </aside>
      </div>
    </div>
  );
}
