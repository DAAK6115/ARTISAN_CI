import { useEffect, useState } from 'react';
import axios from '../../utils/axiosInstance';
import ArtisanNavbar from '../../components/ArtisanNavbar';
import ArtisanMap from '../../components/ArtisanMap'; // Assure-toi que ce composant existe

export default function ArtisanProfileEditPage() {
  const [portfolio, setPortfolio] = useState(null);
  const [form, setForm] = useState({
    bio: '',
    site_web: '',
    facebook: '',
    whatsapp: '',
    localisation: '',
    photo_couverture: null,
  });
  const [previewPhoto, setPreviewPhoto] = useState('');
  const [position, setPosition] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchPortfolio = async () => {
    try {
      const res = await axios.get('/portfolio/me/');
      const data = res.data;
      setPortfolio(data);
      setForm({
        bio: data.bio || '',
        site_web: data.site_web || '',
        facebook: data.facebook || '',
        whatsapp: data.whatsapp || '',
        localisation: data.localisation || '',
        photo_couverture: null,
      });
      setPreviewPhoto(data.photo_couverture || '');
    } catch (err) {
      console.error("Erreur de chargement du profil :", err);
      setMessage("Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    for (const key in form) {
      if (form[key]) data.append(key, form[key]);
    }

    try {
      await axios.patch('/portfolio/me/', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessage("✅ Profil mis à jour avec succès");
      fetchPortfolio();
    } catch (err) {
      console.error("Erreur :", err);
      setMessage("❌ Erreur lors de la mise à jour du profil");
    }
  };

  const handleLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setPosition({ latitude, longitude });
          setMessage("📍 Position détectée !");
        },
        (err) => {
          console.error("Erreur de géolocalisation :", err);
          setMessage("Impossible d'obtenir la position");
        }
      );
    } else {
      setMessage("🌐 La géolocalisation n'est pas supportée par votre navigateur");
    }
  };

  return (
    <div>
      <ArtisanNavbar />
      <div className="p-6 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Modifier mon profil professionnel</h1>

        {message && <p className="text-center text-blue-600 mb-4">{message}</p>}

        {loading ? (
          <p>Chargement...</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-8">
            {/* Formulaire de mise à jour */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <textarea
                placeholder="Bio professionnelle"
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                className="border p-2 rounded w-full h-24"
              ></textarea>
              <input
                type="url"
                placeholder="Site web"
                value={form.site_web}
                onChange={(e) => setForm({ ...form, site_web: e.target.value })}
                className="border p-2 rounded w-full"
              />
              <input
                type="url"
                placeholder="Lien Facebook"
                value={form.facebook}
                onChange={(e) => setForm({ ...form, facebook: e.target.value })}
                className="border p-2 rounded w-full"
              />
              <input
                type="text"
                placeholder="WhatsApp (ex: 225074578xxxx)"
                value={form.whatsapp}
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                className="border p-2 rounded w-full"
              />
              <input
                type="text"
                placeholder="Localisation"
                value={form.localisation}
                onChange={(e) => setForm({ ...form, localisation: e.target.value })}
                className="border p-2 rounded w-full"
              />
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  setForm({ ...form, photo_couverture: e.target.files[0] });
                  setPreviewPhoto(URL.createObjectURL(e.target.files[0]));
                }}
                className="border p-2 rounded w-full"
              />

              <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full">
                Enregistrer les modifications
              </button>
              <button
                type="button"
                onClick={handleLocation}
                className="bg-gray-100 border border-gray-300 text-sm py-2 px-4 rounded hover:bg-gray-200 w-full"
              >
                📍 Voir ma position actuelle
              </button>
            </form>

            {/* ✅ Preview en direct */}
            <div className="bg-white shadow p-4 rounded">
              <h2 className="text-lg font-semibold mb-3">Aperçu du profil</h2>
              {previewPhoto && (
                <img
                  src={previewPhoto}
                  alt="Aperçu couverture"
                  className="w-full h-40 object-cover rounded mb-3"
                />
              )}
              <p className="text-sm text-gray-800 mb-1"><strong>Bio :</strong> {form.bio}</p>
              {form.localisation && (
                <p className="text-sm text-gray-500 mb-1">📍 {form.localisation}</p>
              )}
              <div className="text-sm text-blue-600 space-y-1">
                {form.site_web && <p>🌐 <a href={form.site_web} target="_blank" rel="noreferrer" className="underline">{form.site_web}</a></p>}
                {form.facebook && <p>📘 <a href={form.facebook} target="_blank" rel="noreferrer" className="underline">{form.facebook}</a></p>}
                {form.whatsapp && <p>💬 WhatsApp : {form.whatsapp}</p>}
              </div>

              {position && (
                <div className="mt-4">
                  <ArtisanMap latitude={position.latitude} longitude={position.longitude} />
                  <p className="text-xs text-gray-400 mt-2">Coordonnées : {position.latitude}, {position.longitude}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
